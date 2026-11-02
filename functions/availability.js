/**
 * Venue availability for the Primpy time picker.
 *
 * Customers can only read their own `appointments` (firestore.rules), so the
 * picker can't see who else is booked. This returns just the busy minute
 * ranges for one venue on one day — no names, ids or notes.
 */

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}$/
const FREE_STATUSES = new Set(['cancelled'])
const DEFAULT_MINUTES = 30

const toMin = (t) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/** Validate the callable's input; throws an Error with a `code` on bad input. */
export function parseBusyRequest(data) {
  const venueId = typeof data?.venueId === 'string' ? data.venueId.trim() : ''
  const date = typeof data?.date === 'string' ? data.date : ''
  const ignoreId = typeof data?.ignoreId === 'string' && data.ignoreId ? data.ignoreId : null
  if (!venueId || venueId.length > 200 || venueId.includes('/')) throw Object.assign(new Error('venueId is required'), { code: 'invalid-argument' })
  if (!DATE_RE.test(date)) throw Object.assign(new Error('date must be YYYY-MM-DD'), { code: 'invalid-argument' })
  return { venueId, date, ignoreId }
}

/**
 * Busy [start, end) ranges in minutes from midnight, merged and sorted.
 * `docs` are { id, data } pairs; `ignoreId` drops the booking being rescheduled.
 */
export function busyRanges(docs, ignoreId = null) {
  const ranges = docs
    .filter(({ id, data }) => id !== ignoreId && data && !FREE_STATUSES.has(data.status) && typeof data.time === 'string' && TIME_RE.test(data.time))
    .map(({ data }) => {
      const start = toMin(data.time)
      const len = typeof data.duration === 'number' && data.duration > 0 && data.duration <= 1440 ? data.duration : DEFAULT_MINUTES
      return [start, start + len]
    })
    .sort((a, b) => a[0] - b[0])
  const merged = []
  for (const r of ranges) {
    const last = merged[merged.length - 1]
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1])
    else merged.push([...r])
  }
  return merged.map(([start, end]) => ({ start, end }))
}
