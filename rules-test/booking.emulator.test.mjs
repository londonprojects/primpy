// End-to-end check of the booking Cloud Functions + rules on the Firebase emulators:
// concurrent bookings for one slot, server-side pricing, reschedule clashes, guests.
// Needs `firebase`, `firebase-admin` and `firebase-tools` installed, and
// functions/.secret.local containing PRIMPY_RESEND_API_KEY=none. From the repo root:
//   npx firebase-tools emulators:exec --only auth,functions,firestore --project demo-p \
//     "node rules-test/booking.emulator.test.mjs"
import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInAnonymously, signOut } from 'firebase/auth'
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions'
import { getFirestore, connectFirestoreEmulator, addDoc, collection, updateDoc, doc } from 'firebase/firestore'
import { initializeApp as adminInit } from 'firebase-admin/app'
import { getFirestore as adminFs } from 'firebase-admin/firestore'

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
adminInit({ projectId: 'demo-p' })
const adb = adminFs()
const results = []
const check = (name, ok, extra = '') => results.push(`${ok ? 'ok  ' : 'FAIL'} ${name} ${extra}`)

// A bookable London date 3 days out, never a Sunday.
const d = new Date(); d.setUTCDate(d.getUTCDate() + 3); if (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1)
const date = d.toISOString().slice(0, 10)
await adb.doc('users/venue1').set({ role: 'barber', shopName: 'Belle', barberServices: [{ id: 'cut', name: 'Cut', price: '£45', duration: '1 hr' }, { id: 'tint', name: 'Tint', price: 15, duration: 30 }] })

const mkClient = async (name) => {
  const app = initializeApp({ apiKey: 'demo', projectId: 'demo-p' }, name)
  const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  const fns = getFunctions(app, 'europe-west2'); connectFunctionsEmulator(fns, '127.0.0.1', 5001)
  const fs = getFirestore(app); connectFirestoreEmulator(fs, '127.0.0.1', 8080)
  await createUserWithEmailAndPassword(auth, `${name}@x.test`, 'secret123')
  return { auth, fs, uid: auth.currentUser.uid, create: httpsCallable(fns, 'primpy_createBooking'), move: httpsCallable(fns, 'primpy_rescheduleBooking'), busy: httpsCallable(fns, 'primpy_busySlots') }
}
const code = async (p) => { try { await p; return 'ok' } catch (e) { return e.code } }

const clients = await Promise.all(['a', 'b', 'c', 'd', 'e'].map(mkClient))
const req = { venueId: 'venue1', treatmentIds: ['cut', 'tint'], date, time: '10:00', notes: 'hi', price: 1 }
const race = await Promise.all(clients.map((c) => code(c.create(req))))
check('5 simultaneous bookings for one slot → exactly 1 succeeds', race.filter((r) => r === 'ok').length === 1, JSON.stringify(race))
check('the others are told it was taken', race.filter((r) => r === 'functions/already-exists').length === 4)

const appts = (await adb.collection('appointments').where('date', '==', date).get()).docs
const a = appts[0]?.data() ?? {}
check('price and duration come from the venue', a.price === 60 && a.duration === 90 && a.serviceName === 'Cut, Tint', `${a.price}/${a.duration}`)
check('nothing recorded as paid', a.amountPaid === 0 && a.paymentMethod === 'venue')
check('overlap blocked (10:30 inside 10:00–11:30)', (await code(clients[1].create({ ...req, time: '10:30', treatmentIds: ['tint'] }))) === 'functions/already-exists')
check('adjacent slot allowed (11:30)', (await code(clients[1].create({ ...req, time: '11:30', treatmentIds: ['tint'] }))) === 'ok')
const busy = (await clients[2].busy({ venueId: 'venue1', date })).data.busy
check('busySlots returns merged ranges only', JSON.stringify(busy) === JSON.stringify([{ start: 600, end: 720 }]), JSON.stringify(busy))
check('unknown treatment rejected', (await code(clients[2].create({ ...req, time: '14:00', treatmentIds: ['nope'] }))) === 'functions/failed-precondition')
check('Sunday / past rejected', (await code(clients[2].create({ ...req, date: '2020-01-01' }))) === 'functions/failed-precondition')

// Reschedule
const owner = clients.find((c) => c.uid === a.customerId)
const other = clients.find((c) => c.uid !== a.customerId)
const id = appts[0].id
check('owner moves into a taken slot → refused', (await code(owner.move({ appointmentId: id, date, time: '11:30' }))) === 'functions/already-exists')
check('owner moves overlapping the 11:30 booking (10:30, 90 min) → refused', (await code(owner.move({ appointmentId: id, date, time: '10:30' }))) === 'functions/already-exists')
check('owner moves to a free time (13:00) → ok', (await code(owner.move({ appointmentId: id, date, time: '13:00' }))) === 'ok')
check('stranger cannot move it', (await code(other.move({ appointmentId: id, date, time: '15:00' }))) === 'functions/permission-denied')

// Rules: direct writes blocked for customers
check('direct Primpy create blocked by rules', (await code(addDoc(collection(other.fs, 'appointments'), { ...a, customerId: other.uid, userId: other.uid, time: '16:00' }))) === 'permission-denied')
check('customer direct reschedule blocked', (await code(updateDoc(doc(owner.fs, 'appointments', id), { time: '16:00' }))) === 'permission-denied')
check('customer can still cancel directly', (await code(updateDoc(doc(owner.fs, 'appointments', id), { status: 'cancelled' }))) === 'ok')

// Guests
await signOut(other.auth); await signInAnonymously(other.auth)
check('guest (anonymous) cannot book', (await code(other.create({ ...req, time: '15:00' }))) === 'functions/unauthenticated')

console.log(results.join('\n'))
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0)
