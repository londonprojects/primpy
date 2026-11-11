import test from 'node:test'
import assert from 'node:assert/strict'
import { assessCommission, channelOf } from '../commission.js'
import { cardFeeMinor, commissionPence, PRICING } from '../pricing.js'

const appt = (o = {}) => ({ id: 'a1', source: 'primpy-web', date: '2026-11-10', time: '10:00', price: 50, ...o })
const prior = (o = {}) => ({ id: 'p1', source: 'primpy-web', date: '2026-01-05', ...o })

test('new client, first Primpy marketplace booking: 15% once (the £50 example is £7.50)', () => {
  assert.deepEqual(assessCommission(appt(), []), { basis: 'new-client', rate: 0.15, commissionPence: 750 })
  assert.equal(commissionPence(PRICING.exampleTreatment), 750)
})

test('repeat visits are 0%', () => {
  assert.deepEqual(assessCommission(appt(), [prior()]), { basis: 'repeat', rate: 0, commissionPence: 0 })
})

test('a client not seen for more than 365 days counts as new again', () => {
  const old = prior({ date: '2025-11-09' }) // 366 days before 2026-11-10
  assert.equal(assessCommission(appt(), [old]).basis, 'new-client')
  assert.equal(assessCommission(appt(), [prior({ date: '2025-11-10' })]).basis, 'repeat') // exactly 365
})

test("the venue's own links are 0%", () => {
  assert.equal(channelOf({ channel: 'venue-link' }), 'venue-link')
  assert.equal(channelOf({ channel: 'anything-else' }), 'marketplace')
  assert.deepEqual(assessCommission(appt({ channel: 'venue-link' }), []), { basis: 'venue-link', rate: 0, commissionPence: 0 })
})

test('Snip / venue-created bookings and clients the venue already has are 0%', () => {
  assert.equal(assessCommission(appt({ source: 'snip' }), []).basis, 'not-primpy')
  assert.equal(assessCommission(appt(), [prior({ source: 'snip' })]).basis, 'venue-client')
})

test('completing a client’s bookings out of order still charges only once', () => {
  const first = appt({ id: 'early', date: '2026-11-10' })
  const later = appt({ id: 'late', date: '2026-11-24' })
  assert.equal(assessCommission(later, [first]).basis, 'repeat')
  assert.equal(assessCommission(first, [later]).basis, 'repeat')
})

test('the booking itself is ignored if it appears in the history', () => {
  assert.equal(assessCommission(appt(), [appt()]).basis, 'new-client')
})

test('card fee is grossed up so the guest covers the processor fee at cost', () => {
  // Stripe takes 1.5% of the TOTAL plus 20p. £50 → total £50.97, Stripe keeps 0.015*5097+20 = 96.455p.
  const fee = cardFeeMinor(5000)
  assert.equal(fee, 97)
  const stripeTakes = (5000 + fee) * PRICING.cardFee.percent + PRICING.cardFee.fixed * 100
  assert.ok(5000 + fee - stripeTakes >= 5000 - 0.5, 'the salon side still receives the full base amount')
  assert.equal(cardFeeMinor(0), 0)
  assert.equal(cardFeeMinor(-5), 0)
})
