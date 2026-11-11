/**
 * Primpy Cloud Functions (codebase "primpy", Firebase project currentlyremote-snip):
 * booking email alerts, venue availability for the time picker, and creating /
 * rescheduling bookings inside a per-venue-day lock so a slot can't be taken twice.
 * Email alerts only react to `appointments` docs with source == 'primpy-web'; Snip mobile bookings are ignored.
 *
 * Secret: PRIMPY_RESEND_API_KEY (firebase functions:secrets:set PRIMPY_RESEND_API_KEY --project currentlyremote-snip;
 * value "none" deploys with email switched off). Sender domain must be verified in Resend.
 */
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { bookingEmails, changeKind, alertKey } from './emails.js'
import { sendEmail } from './send.js'
import { busyRanges, parseBusyRequest } from './availability.js'
import { assessCommission } from './commission.js'
import { BookingError, checkSlot, clashes, lockId, paymentFields, resolveTreatments } from './booking.js'

initializeApp()
const db = getFirestore()
const RESEND_API_KEY = defineSecret('PRIMPY_RESEND_API_KEY')
const EMAIL_FROM = process.env.PRIMPY_EMAIL_FROM || 'Primpy <bookings@primpy.app>'
const SITE_URL = process.env.PRIMPY_SITE_URL || 'https://primpy.app'
const opts = { document: 'appointments/{apptId}', region: 'europe-west2', secrets: [RESEND_API_KEY] }

/**
 * Recipient lookup. Emails never come from the appointment doc, and a client's address
 * comes only from Firebase Auth (a user can write anything into their own users/ doc,
 * so trusting it would let a booker point the "confirmation" at any inbox).
 * The venue address may come from the venue's own profile (only the venue can edit it),
 * and only if that profile really is a venue (role barber/admin).
 */
async function userInfo(uid, { venue = false } = {}) {
  if (!uid || typeof uid !== 'string') return { doc: {}, email: '', name: '', phone: '' }
  const snap = await db.doc(`users/${uid}`).get()
  const doc = snap.exists ? snap.data() : {}
  let authUser = null
  try { authUser = await getAuth().getUser(uid) } catch { /* deleted or unknown */ }
  const authEmail = authUser && !authUser.disabled ? authUser.email || '' : ''
  const isVenue = ['barber', 'admin'].includes(doc.role)
  const email = venue ? (isVenue ? doc.contactEmail || authEmail || doc.email || '' : '') : authEmail
  return { doc, email, name: doc.displayName || authUser?.displayName || '', phone: doc.phone || doc.phoneNumber || authUser?.phoneNumber || '' }
}

/** Claim the alert in a transaction so retries/duplicate events never double-send. */
async function claim(ref, key) {
  return db.runTransaction(async (tx) => {
    const s = await tx.get(ref)
    if (s.get(`primpyNotified.${key}`)) return false
    tx.update(ref, { [`primpyNotified.${key}`]: FieldValue.serverTimestamp() })
    return true
  })
}

async function handle(id, ref, before, after) {
  const kind = changeKind(before, after)
  if (!kind) return
  const key = alertKey(kind, after)
  if (!(await claim(ref, key))) return
  try {
    const [venue, client] = await Promise.all([userInfo(after.barberId, { venue: true }), userInfo(after.customerId)])
    if (!venue.email) console.warn(`[primpy] venue ${after.barberId} has no email; venue alert skipped for ${id}`)
    const mails = bookingEmails(kind, { id, appt: after, before, venue: venue.doc, venueEmail: venue.email, client, site: SITE_URL })
    for (const { key: who, ...mail } of mails) {
      await sendEmail({ apiKey: RESEND_API_KEY.value(), from: EMAIL_FROM, idempotencyKey: `primpy-${id}-${key}-${who}`, ...mail })
    }
  } catch (err) {
    // Release the claim so a manual retry/redeploy can send it; log for ops.
    await ref.update({ [`primpyNotified.${key}`]: FieldValue.delete() }).catch(() => {})
    console.error(`[primpy] ${kind} alert failed for ${id}`, err)
  }
}

export const primpy_onAppointmentCreated = onDocumentCreated(opts, (event) =>
  event.data ? handle(event.params.apptId, event.data.ref, null, event.data.data()) : undefined)

export const primpy_onAppointmentUpdated = onDocumentUpdated(opts, (event) =>
  handle(event.params.apptId, event.data.after.ref, event.data.before.data(), event.data.after.data()))

/**
 * Commission ledger. When a booking is completed, record what the salon owes Primpy in
 * primpyCommissions/{appointmentId} (server-only; the rules' catch-all denies client access, so a
 * venue can't edit it). One doc per booking, created once: retries and duplicate events are no-ops.
 * A completed booking later marked cancelled / no-show is voided. Collecting the money (taken from
 * the online payment vs invoiced monthly) is not decided yet, so entries stay 'accrued'.
 */
const LEDGER = 'primpyCommissions'

async function accrueCommission(id, appt) {
  const ref = db.collection(LEDGER).doc(id)
  const hist = await db.collection('appointments')
    .where('barberId', '==', appt.barberId)
    .where('customerId', '==', appt.customerId)
    .where('status', '==', 'completed')
    .get()
  const history = hist.docs.map((x) => ({ id: x.id, ...x.data() }))
  const verdict = assessCommission({ id, ...appt }, history)
  await db.runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) return
    tx.create(ref, {
      appointmentId: id,
      venueId: appt.barberId,
      customerId: appt.customerId,
      date: appt.date,
      bookingPrice: Number(appt.price) || 0,
      ...verdict, // basis, rate, commissionPence
      currency: 'GBP',
      status: 'accrued',
      collection: null, // TO CONFIRM: 'online-payment' | 'monthly-invoice'
      createdAt: FieldValue.serverTimestamp(),
    })
  })
}

export const primpy_onAppointmentStatus = onDocumentUpdated(
  { document: 'appointments/{apptId}', region: 'europe-west2' },
  async (event) => {
    const before = event.data.before.data()
    const after = event.data.after.data()
    if (after.source !== 'primpy-web' || before.status === after.status) return
    if (after.status === 'completed') return accrueCommission(event.params.apptId, after)
    if (before.status === 'completed' && ['cancelled', 'no-show'].includes(after.status)) {
      const ref = db.collection(LEDGER).doc(event.params.apptId)
      const snap = await ref.get()
      if (snap.exists && snap.get('status') === 'accrued') await ref.update({ status: 'void', voidedAt: FieldValue.serverTimestamp() })
    }
  })

/**
 * Busy time ranges at a venue on a date, for the Primpy time picker. Any signed-in
 * user (guests included) may ask; only minute ranges are returned, never who booked.
 */
export const primpy_busySlots = onCall({ region: 'europe-west2' }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in to check availability.')
  let input
  try { input = parseBusyRequest(req.data) } catch (e) { throw new HttpsError('invalid-argument', e.message) }
  const venue = await db.doc(`users/${input.venueId}`).get()
  if (!venue.exists || !['barber', 'admin'].includes(venue.get('role'))) throw new HttpsError('not-found', 'Venue not found.')
  const snap = await db.collection('appointments')
    .where('barberId', '==', input.venueId)
    .where('date', '==', input.date)
    .get()
  return { busy: busyRanges(snap.docs.map((d) => ({ id: d.id, data: d.data() })), input.ignoreId) }
})

/* ---------- Bookings: created and moved server-side so two people can't take one slot ---------- */

const LOCKS = 'primpySlotLocks' // no client access (rules catch-all denies it)

function signedInCustomer(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Log in to book.')
  if (req.auth.token?.firebase?.sign_in_provider === 'anonymous') throw new HttpsError('unauthenticated', 'Log in to book.')
  return req.auth.uid
}

// Never answer 'not-found' from these callables: the web app reads that code as
// "function not deployed yet" and falls back to the old direct write.
const asHttps = (e) => (e instanceof BookingError ? new HttpsError(e.code, e.message) : e)

/** Busy ranges for venue+date inside a transaction, after taking the venue-day lock. */
async function lockAndReadBusy(tx, venueId, date, ignoreId) {
  const lockRef = db.collection(LOCKS).doc(lockId(venueId, date))
  await tx.get(lockRef)
  const snap = await tx.get(db.collection('appointments').where('barberId', '==', venueId).where('date', '==', date))
  // Writing the lock makes concurrent transactions on the same venue-day conflict and retry.
  tx.set(lockRef, { touchedAt: FieldValue.serverTimestamp() })
  return busyRanges(snap.docs.map((d) => ({ id: d.id, data: d.data() })), ignoreId)
}

const TAKEN = 'Sorry — that time was just booked. Please pick another.'

export const primpy_createBooking = onCall({ region: 'europe-west2' }, async (req) => {
  const uid = signedInCustomer(req)
  const d = req.data ?? {}
  try {
    checkSlot(d.date, d.time)
    const pay = paymentFields(d.paymentMethod, d.paymentIntentId)
    const notes = typeof d.notes === 'string' ? d.notes.slice(0, 1000) : ''
    const venueId = typeof d.venueId === 'string' && d.venueId && !d.venueId.includes('/') ? d.venueId : null
    if (!venueId) throw new BookingError('invalid-argument', 'Venue missing.')
    if (venueId === uid) throw new BookingError('failed-precondition', 'You can’t book your own venue.')
    const venueSnap = await db.doc(`users/${venueId}`).get()
    const venue = venueSnap.data()
    if (!venueSnap.exists || !['barber', 'admin'].includes(venue.role)) throw new BookingError('failed-precondition', 'Venue not found.')
    const items = resolveTreatments(venue, d.treatmentIds)
    const ref = db.collection('appointments').doc()
    await db.runTransaction(async (tx) => {
      const busy = await lockAndReadBusy(tx, venueId, d.date)
      if (clashes(busy, d.time, items.duration)) throw new BookingError('already-exists', TAKEN)
      tx.create(ref, {
        customerId: uid,
        userId: uid,
        barberId: venueId,
        barberName: String(venue.shopName || venue.displayName || 'Venue').slice(0, 200),
        ...items,
        date: d.date,
        time: d.time,
        notes,
        status: 'scheduled',
        ...pay,
        createdAt: new Date().toISOString(),
        source: 'primpy-web',
        // Set by the venue's own booking link (?ref=venue); anything else is a marketplace booking.
        ...(d.channel === 'venue-link' ? { channel: 'venue-link' } : {}),
      })
    })
    return { id: ref.id }
  } catch (e) {
    throw asHttps(e)
  }
})

export const primpy_rescheduleBooking = onCall({ region: 'europe-west2' }, async (req) => {
  const uid = signedInCustomer(req)
  const d = req.data ?? {}
  try {
    checkSlot(d.date, d.time)
    if (typeof d.appointmentId !== 'string' || !d.appointmentId || d.appointmentId.includes('/')) throw new BookingError('invalid-argument', 'Booking missing.')
    const ref = db.doc(`appointments/${d.appointmentId}`)
    const first = await ref.get()
    const appt = first.data()
    if (!first.exists || appt.customerId !== uid) throw new BookingError('permission-denied', 'Booking not found.')
    if (appt.source !== 'primpy-web') throw new BookingError('failed-precondition', 'Change this booking in Snip.')
    if (appt.status !== 'scheduled' && appt.status !== 'confirmed') throw new BookingError('failed-precondition', 'This booking can’t be moved.')
    const duration = typeof appt.duration === 'number' && appt.duration > 0 ? appt.duration : 30
    await db.runTransaction(async (tx) => {
      // Firestore transactions must finish every read before the first write (the lock).
      const now = (await tx.get(ref)).data()
      const busy = await lockAndReadBusy(tx, appt.barberId, d.date, ref.id)
      if (now.status !== appt.status) throw new BookingError('failed-precondition', 'This booking just changed. Refresh and try again.')
      if (clashes(busy, d.time, duration)) throw new BookingError('already-exists', TAKEN)
      tx.update(ref, { date: d.date, time: d.time, rescheduledAt: new Date().toISOString() })
    })
    return { id: ref.id }
  } catch (e) {
    throw asHttps(e)
  }
})
