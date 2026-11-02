import test from 'node:test'
import assert from 'node:assert/strict'
import { busyRanges, parseBusyRequest } from '../availability.js'

const d = (id, data) => ({ id, data })

test('busy ranges use duration, skip cancelled and merge overlaps', () => {
  const docs = [
    d('a', { time: '10:00', duration: 60, status: 'scheduled' }),
    d('b', { time: '10:30', duration: 45, status: 'confirmed' }),
    d('c', { time: '14:00', status: 'scheduled' }),
    d('x', { time: '16:00', duration: 60, status: 'cancelled' }),
  ]
  assert.deepEqual(busyRanges(docs), [{ start: 600, end: 675 }, { start: 840, end: 870 }])
})

test('ignores the booking being rescheduled and malformed rows', () => {
  const docs = [d('me', { time: '09:00', duration: 60 }), d('bad', { time: '9am' }), d('huge', { time: '12:00', duration: 99999 })]
  assert.deepEqual(busyRanges(docs, 'me'), [{ start: 720, end: 750 }])
})

test('returns no personal fields', () => {
  const [r] = busyRanges([d('a', { time: '11:00', duration: 30, customerId: 'c1', serviceName: 'Cut', notes: 'secret' })])
  assert.deepEqual(Object.keys(r), ['start', 'end'])
})

test('validates input', () => {
  assert.deepEqual(parseBusyRequest({ venueId: 'v1', date: '2026-11-05' }), { venueId: 'v1', date: '2026-11-05', ignoreId: null })
  assert.throws(() => parseBusyRequest({ venueId: '', date: '2026-11-05' }))
  assert.throws(() => parseBusyRequest({ venueId: 'a/b', date: '2026-11-05' }))
  assert.throws(() => parseBusyRequest({ venueId: 'v1', date: '5 Nov' }))
})
