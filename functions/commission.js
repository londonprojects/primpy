/**
 * Salon commission ledger rules (pure functions; index.js does the Firestore I/O).
 *
 * The SALON pays commission, never the guest. It is charged once, on a new client's first
 * COMPLETED booking made through the Primpy marketplace. Everything else is 0%:
 *  - repeat bookings (the venue completed a Primpy booking with the client in the last
 *    newClientWindowDays days),
 *  - bookings from the venue's own links (channel 'venue-link'),
 *  - clients the venue already has outside Primpy (a prior completed booking from another
 *    source, e.g. added or imported in Snip),
 *  - cancelled bookings and no-shows (nothing is accrued, and a completed booking later
 *    marked cancelled / no-show is voided).
 */
import { PRICING, commissionPence } from './pricing.js'

export const PRIMPY_SOURCE = 'primpy-web'
const DAY = 86_400_000

/** A booking counts as marketplace unless the booking flow tagged it as the venue's own link. */
export const channelOf = (appt) => (appt?.channel === 'venue-link' ? 'venue-link' : 'marketplace')

const dayNumber = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''))
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAY : NaN
}

/**
 * Why (and how much) this completed booking costs the salon.
 * @param appt     the booking that was just completed
 * @param history  the same client's OTHER completed bookings at the same venue
 * @returns {{ basis: string, rate: number, commissionPence: number }}
 */
export function assessCommission(appt, history = [], windowDays = PRICING.newClientWindowDays) {
  const zero = (basis) => ({ basis, rate: PRICING.repeatCommission, commissionPence: 0 })

  if (appt.source !== PRIMPY_SOURCE) return zero('not-primpy') // Snip / venue-created booking
  if (channelOf(appt) === 'venue-link') return zero('venue-link')

  const day = dayNumber(appt.date)
  const others = history.filter((h) => h.id !== appt.id)
  // A client the venue already had outside Primpy is the venue's own, not one Primpy found.
  if (others.some((h) => h.source !== PRIMPY_SOURCE)) return zero('venue-client')
  // Repeat: another completed Primpy booking with this venue within the window. Either side
  // counts, so completing a client's bookings out of order still charges only once.
  const repeat = others.some((h) => Math.abs(day - dayNumber(h.date)) <= windowDays)
  if (repeat) return zero('repeat')

  const rate = PRICING.newClientCommission
  return { basis: 'new-client', rate, commissionPence: commissionPence(Number(appt.price) || 0, rate) }
}
