import test from 'node:test'
import assert from 'node:assert/strict'
import { checkSlot, clashes, londonNow, paymentFields, resolveTreatments, venueTreatments } from '../booking.js'

// Tue 3 Nov 2026, 10:15 in London (GMT).
const now = new Date('2026-11-03T10:15:00Z')

test('londonNow follows UK time, including BST', () => {
  assert.deepEqual(londonNow(now), { date: '2026-11-03', minutes: 615 })
  assert.deepEqual(londonNow(new Date('2026-07-01T23:30:00Z')), { date: '2026-07-02', minutes: 30 })
})

test('checkSlot accepts future slots inside the window', () => {
  assert.doesNotThrow(() => checkSlot('2026-11-03', '10:30', now))
  assert.doesNotThrow(() => checkSlot('2026-11-16', '18:00', now))
})

test('checkSlot rejects past, closed, unlisted and out-of-window slots', () => {
  const code = (fn) => { try { fn(); return 'ok' } catch (e) { return e.code } }
  assert.equal(code(() => checkSlot('2026-11-03', '10:00', now)), 'failed-precondition') // already passed
  assert.equal(code(() => checkSlot('2026-11-02', '12:00', now)), 'failed-precondition') // yesterday
  assert.equal(code(() => checkSlot('2026-11-17', '12:00', now)), 'failed-precondition') // 14 days out
  assert.equal(code(() => checkSlot('2026-11-08', '12:00', now)), 'failed-precondition') // Sunday
  assert.equal(code(() => checkSlot('2026-11-04', '12:15', now)), 'invalid-argument') // not a slot
  assert.equal(code(() => checkSlot('4 Nov', '12:00', now)), 'invalid-argument')
})

const venue = {
  barberServices: [
    { id: 'cut', name: 'Cut', price: '£45', duration: '1 hr' },
    { name: 'Brow tint', price: 15, duration: 20 },
    { id: 'x', name: '' },
  ],
}

test('treatments are priced from the venue, not the request', () => {
  assert.deepEqual(venueTreatments(venue).map((t) => t.id), ['cut', 'svc-1'])
  assert.deepEqual(resolveTreatments(venue, ['cut', 'svc-1', 'cut']), {
    serviceIds: ['cut', 'svc-1'], serviceId: 'cut', serviceName: 'Cut, Brow tint', price: 60, duration: 80,
  })
  assert.throws(() => resolveTreatments(venue, ['nope']), /no longer available/)
  assert.throws(() => resolveTreatments(venue, []), /at least one/)
})

test('clashes uses the booking length', () => {
  const busy = [{ start: 600, end: 660 }] // 10:00–11:00
  assert.equal(clashes(busy, '09:00', 60), false)
  assert.equal(clashes(busy, '09:30', 60), true)
  assert.equal(clashes(busy, '11:00', 30), false)
})

test('payment fields never record money as paid', () => {
  assert.deepEqual(paymentFields(undefined), { paymentMethod: 'venue', amountPaid: 0, paymentIntentId: null })
  assert.deepEqual(paymentFields('deposit', 'pi_123'), { paymentMethod: 'deposit', amountPaid: 0, paymentIntentId: 'pi_123' })
  assert.throws(() => paymentFields('full'))
  assert.throws(() => paymentFields('free', 'pi_1'))
})
