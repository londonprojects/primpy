/**
 * Primpy booking email alerts (codebase "primpy", Firebase project currentlyremote-snip).
 * Only reacts to `appointments` docs with source == 'primpy-web'; Snip mobile bookings are ignored.
 *
 * Secret: PRIMPY_RESEND_API_KEY (firebase functions:secrets:set PRIMPY_RESEND_API_KEY --project currentlyremote-snip;
 * value "none" deploys with email switched off). Sender domain must be verified in Resend.
 */
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { defineSecret } from 'firebase-functions/params'
import { bookingEmails, changeKind, alertKey } from './emails.js'
import { sendEmail } from './send.js'

initializeApp()
const db = getFirestore()
const RESEND_API_KEY = defineSecret('PRIMPY_RESEND_API_KEY')
const EMAIL_FROM = process.env.PRIMPY_EMAIL_FROM || 'Primpy <bookings@primpy.app>'
const SITE_URL = process.env.PRIMPY_SITE_URL || 'https://primpy.app'
const opts = { document: 'appointments/{apptId}', region: 'europe-west2', secrets: [RESEND_API_KEY] }

async function userInfo(uid) {
  if (!uid) return { doc: {}, email: '', name: '', phone: '' }
  const snap = await db.doc(`users/${uid}`).get()
  const doc = snap.exists ? snap.data() : {}
  let authUser = null
  try { authUser = await getAuth().getUser(uid) } catch { /* deleted or unknown */ }
  return {
    doc,
    email: doc.email || doc.contactEmail || authUser?.email || '',
    name: doc.displayName || authUser?.displayName || '',
    phone: doc.phone || doc.phoneNumber || authUser?.phoneNumber || '',
  }
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
    const [venue, client] = await Promise.all([userInfo(after.barberId), userInfo(after.customerId || after.userId)])
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
