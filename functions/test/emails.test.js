import test from 'node:test'
import assert from 'node:assert/strict'
import { bookingEmails, changeKind, alertKey, formatWhen, formatPrice } from '../emails.js'
import { sendEmail } from '../send.js'

const appt = { source: 'primpy-web', status: 'scheduled', barberId: 'v1', customerId: 'c1', barberName: 'Belle Ame', serviceName: 'Gel manicure, Brow tint', date: '2026-11-03', time: '14:30', price: 52, paymentMethod: 'venue', amountPaid: 0 }
const venue = { shopName: 'Belle Ame Lounge', barberAddressLine1: '1 Exmouth Market', barberAddressCity: 'London' }

test('formats UK date and price', () => {
  assert.equal(formatWhen('2026-11-03', '14:30'), 'Tue 3 Nov 2026, 14:30 (UK time)')
  assert.equal(formatPrice(52), '£52'); assert.equal(formatPrice('£12.5'), '£12.50')
})

test('changeKind only fires for primpy-web and real changes', () => {
  assert.equal(changeKind(null, appt), 'created')
  assert.equal(changeKind(null, { ...appt, source: 'snip' }), null)
  assert.equal(changeKind(appt, { ...appt, status: 'cancelled' }), 'cancelled')
  assert.equal(changeKind(appt, { ...appt, time: '15:00' }), 'rescheduled')
  assert.equal(changeKind(appt, { ...appt, primpyNotified: { created: 1 } }), null)
  assert.equal(changeKind(appt, { ...appt, status: 'completed' }), null)
  assert.equal(alertKey('rescheduled', { date: '2026-11-04', time: '15:00' }), 'rescheduled_2026-11-04_1500')
})

test('created sends venue + client emails with key details and escaping', () => {
  const mails = bookingEmails('created', { id: 'a1', appt: { ...appt, notes: '<b>x</b>' }, venue, venueEmail: 'v@x.com', client: { name: 'Sam', email: 's@x.com' } })
  assert.deepEqual(mails.map((m) => [m.key, m.to]), [['venue', 'v@x.com'], ['client', 's@x.com']])
  assert.match(mails[0].text, /Client: Sam/); assert.match(mails[0].text, /Tue 3 Nov 2026, 14:30/); assert.match(mails[0].text, /\/business\/bookings/)
  assert.ok(!mails[0].html.includes('<b>x</b>')); assert.equal(mails[0].replyTo, 's@x.com')
  assert.match(mails[1].text, /1 Exmouth Market, London/); assert.match(mails[1].text, /\/booking\/a1/); assert.match(mails[1].text, /24 hours/)
})

test('guest client without email: venue only; venue without email: client only', () => {
  assert.deepEqual(bookingEmails('created', { id: 'a', appt, venue, venueEmail: 'v@x.com', client: {} }).map((m) => m.key), ['venue'])
  assert.deepEqual(bookingEmails('created', { id: 'a', appt, venue, venueEmail: '', client: { email: 's@x.com' } }).map((m) => m.key), ['client'])
})

test('cancel and reschedule go to the venue', () => {
  assert.match(bookingEmails('cancelled', { id: 'a', appt, venue, venueEmail: 'v@x.com', client: {} })[0].subject, /cancelled/)
  const r = bookingEmails('rescheduled', { id: 'a', appt: { ...appt, time: '16:00' }, before: appt, venue, venueEmail: 'v@x.com', client: { name: 'Sam' } })
  assert.match(r[0].text, /Was: Tue 3 Nov 2026, 14:30/); assert.match(r[0].text, /New time: Tue 3 Nov 2026, 16:00/)
})

test('sendEmail skips without key and posts with idempotency key', async () => {
  assert.deepEqual(await sendEmail({ apiKey: 'none', to: 'a', subject: 's' }), { skipped: true })
  let seen
  await sendEmail({ apiKey: 'k', from: 'f', idempotencyKey: 'id1', to: 'a@x', subject: 's', html: 'h', text: 't', fetchImpl: async (u, o) => { seen = o; return { ok: true, json: async () => ({ id: 'e' }) } } })
  assert.equal(seen.headers['Idempotency-Key'], 'id1'); assert.deepEqual(JSON.parse(seen.body).to, ['a@x'])
})
