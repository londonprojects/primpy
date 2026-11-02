/**
 * Server-side booking rules for Primpy: which slots exist, what a treatment
 * costs, and whether a slot clashes. Pure functions so they can be unit-tested;
 * the callables in index.js wrap them in a Firestore transaction.
 *
 * Keep SLOTS / opening days / the booking window in step with
 * src/config/slots.ts and src/utils/booking.ts in the web app.
 */
import { DATE_RE } from './availability.js'

export const SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00',
  '16:30', '17:00', '17:30', '18:00',
]
export const BOOKING_WINDOW_DAYS = 14
const TZ = 'Europe/London'

export class BookingError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

const toMin = (t) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/** Today's date and minutes-past-midnight in London. */
export function londonNow(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  )
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) }
}

const dayDiff = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000)

/** Throws BookingError unless date/time is a bookable future slot inside the window. */
export function checkSlot(date, time, now = new Date()) {
  if (typeof date !== 'string' || !DATE_RE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) throw new BookingError('invalid-argument', 'Pick a valid date.')
  if (typeof time !== 'string' || !SLOTS.includes(time)) throw new BookingError('invalid-argument', 'Pick one of the listed times.')
  const { date: today, minutes } = londonNow(now)
  const ahead = dayDiff(today, date)
  if (ahead < 0 || ahead >= BOOKING_WINDOW_DAYS) throw new BookingError('failed-precondition', 'That date can’t be booked.')
  if (new Date(`${date}T12:00:00Z`).getUTCDay() === 0) throw new BookingError('failed-precondition', 'Venues are closed on Sundays.')
  if (ahead === 0 && toMin(time) <= minutes) throw new BookingError('failed-precondition', 'That time has already passed.')
}

/* ---- Treatment parsing: mirrors src/services/venues.ts (parsePrice / parseDuration / ids). ---- */
const str = (v) => (typeof v === 'string' ? v.trim() : '')

function parsePrice(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function parseDuration(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const s = String(v ?? '').toLowerCase()
  const hr = s.match(/([\d.]+)\s*(hr|hour)/)
  const min = s.match(/([\d.]+)\s*(min)/)
  if (hr) return Math.round(parseFloat(hr[1]) * 60) + (min ? parseInt(min[1], 10) : 0)
  if (min) return parseInt(min[1], 10)
  const n = parseInt(s.replace(/[^0-9]/g, ''), 10)
  return Number.isFinite(n) && n > 0 ? n : 30
}

export function venueTreatments(venue) {
  const raw = Array.isArray(venue?.barberServices) ? venue.barberServices : []
  return raw
    .map((o, i) => {
      if (!o || typeof o !== 'object' || !str(o.name)) return null
      return { id: str(o.id) || `svc-${i}`, name: str(o.name), price: parsePrice(o.price), duration: parseDuration(o.duration) }
    })
    .filter(Boolean)
}

/** The chosen treatments, priced from the venue's own list. */
export function resolveTreatments(venue, ids) {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 20 || !ids.every((x) => typeof x === 'string')) {
    throw new BookingError('invalid-argument', 'Choose at least one treatment.')
  }
  const all = venueTreatments(venue)
  const picked = [...new Set(ids)].map((id) => all.find((t) => t.id === id))
  if (picked.some((t) => !t)) throw new BookingError('failed-precondition', 'One of those treatments is no longer available.')
  const duration = picked.reduce((a, t) => a + t.duration, 0)
  if (duration <= 0 || duration > 1440) throw new BookingError('failed-precondition', 'That booking is too long.')
  return {
    serviceIds: picked.map((t) => t.id),
    serviceId: picked[0].id,
    serviceName: picked.map((t) => t.name).join(', ').slice(0, 500),
    price: picked.reduce((a, t) => a + t.price, 0),
    duration,
  }
}

/** True if [time, time + duration) overlaps any busy range from busyRanges(). */
export function clashes(busy, time, duration) {
  const s = toMin(time)
  const e = s + Math.max(duration, 30)
  return busy.some((b) => s < b.end && b.start < e)
}

/** Payment fields as the rules require: nothing paid yet; prepaid needs a Stripe PaymentIntent. */
export function paymentFields(method, paymentIntentId) {
  const m = method ?? 'venue'
  if (!['venue', 'deposit', 'full'].includes(m)) throw new BookingError('invalid-argument', 'Unknown payment method.')
  if (m === 'venue') return { paymentMethod: 'venue', amountPaid: 0, paymentIntentId: null }
  if (typeof paymentIntentId !== 'string' || !/^pi_[A-Za-z0-9_]{1,200}$/.test(paymentIntentId)) {
    throw new BookingError('invalid-argument', 'Payment reference missing.')
  }
  return { paymentMethod: m, amountPaid: 0, paymentIntentId }
}

/** Lock doc that serialises every Primpy booking change for one venue on one day. */
export const lockId = (venueId, date) => `${venueId}_${date}`
