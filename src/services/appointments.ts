import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import type { Appointment, PaymentMethod } from '../types';
import { SLOTS } from '../config/slots';
import { timeToMin } from '../utils/format';

const COLLECTION = 'appointments';

export interface NewBooking {
  userId: string;
  venueId: string;
  venueName: string;
  treatments: { id: string; name: string; price: number; duration: number }[];
  date: string;
  time: string;
  notes?: string;
  paymentMethod: PaymentMethod;
  /** Required for 'deposit' / 'full'; the payments server records the amount once Stripe confirms it. */
  paymentIntentId?: string;
}

/** True when a callable isn't deployed yet (our functions never answer 'not-found' themselves). */
const notDeployed = (e: unknown) => (e as { code?: string })?.code === 'functions/not-found';

const createBookingFn = httpsCallable<
  { venueId: string; treatmentIds: string[]; date: string; time: string; notes?: string; paymentMethod: PaymentMethod; paymentIntentId?: string },
  { id: string }
>(functions, 'primpy_createBooking');

const rescheduleBookingFn = httpsCallable<{ appointmentId: string; date: string; time: string }, { id: string }>(
  functions,
  'primpy_rescheduleBooking',
);

/**
 * Create an appointment in the shared backend. Field names match Snip's
 * `appointments` documents (barberId / barberName / serviceId / serviceName)
 * so bookings made in Primpy show up in Snip and vice versa.
 *
 * A multi-treatment booking is ONE doc: `serviceName` joins the names with
 * ", ", `price` and `duration` are totals, `serviceId` is the first treatment
 * (what Snip reads) and `serviceIds` lists them all.
 *
 * The `primpy_createBooking` function writes it: it prices the treatments
 * from the venue and refuses a slot that has just been taken. Until that
 * function is deployed this falls back to writing the doc directly.
 */
export async function createAppointment(booking: NewBooking): Promise<string> {
  try {
    const { data } = await createBookingFn({
      venueId: booking.venueId,
      treatmentIds: booking.treatments.map((t) => t.id),
      date: booking.date,
      time: booking.time,
      notes: booking.notes,
      paymentMethod: booking.paymentMethod,
      paymentIntentId: booking.paymentIntentId,
    });
    return data.id;
  } catch (e) {
    if (!notDeployed(e)) throw e;
  }
  // TODO: remove once primpy_createBooking is live (the rules then refuse this write).
  const ts = booking.treatments;
  const ref = await addDoc(collection(db, COLLECTION), {
    // `customerId` is required by the shared Firestore rules for create/cancel;
    // `userId` is kept too for apps that read either field.
    customerId: booking.userId,
    userId: booking.userId,
    barberId: booking.venueId,
    barberName: booking.venueName,
    serviceId: ts[0]?.id ?? '',
    serviceIds: ts.map((t) => t.id),
    serviceName: ts.map((t) => t.name).join(', '),
    duration: ts.reduce<number>((a, t) => a + t.duration, 0),
    date: booking.date,
    time: booking.time,
    price: ts.reduce<number>((a, t) => a + t.price, 0),
    notes: booking.notes ?? '',
    status: 'scheduled',
    paymentMethod: booking.paymentMethod,
    amountPaid: 0,
    paymentIntentId: booking.paymentIntentId ?? null,
    createdAt: new Date().toISOString(),
    source: 'primpy-web',
  });
  return ref.id;
}

function mapAppointment(id: string, d: Record<string, unknown>): Appointment {
  const serviceId = String(d.serviceId ?? '');
  const ids = Array.isArray(d.serviceIds) ? d.serviceIds.map(String) : serviceId ? [serviceId] : [];
  const method = d.paymentMethod;
  return {
    id,
    userId: String(d.userId ?? d.customerId ?? ''),
    barberId: String(d.barberId ?? ''),
    barberName: String(d.barberName ?? 'Venue'),
    serviceId,
    serviceIds: ids,
    serviceName: String(d.serviceName ?? 'Treatment'),
    date: String(d.date ?? ''),
    time: String(d.time ?? ''),
    duration: typeof d.duration === 'number' ? d.duration : undefined,
    status: (d.status as Appointment['status']) ?? 'scheduled',
    price: typeof d.price === 'number' ? d.price : Number(d.price) || 0,
    paymentMethod: method === 'deposit' || method === 'full' ? method : 'venue',
    amountPaid: typeof d.amountPaid === 'number' ? d.amountPaid : 0,
    notes: typeof d.notes === 'string' && d.notes ? d.notes : undefined,
    createdAt: typeof d.createdAt === 'string' ? d.createdAt : undefined,
  };
}

export async function fetchMyAppointments(userId: string): Promise<Appointment[]> {
  // Avoid composite-index requirements: filter by user, sort client-side.
  // `customerId` is the field the shared backend enforces on create, so it
  // matches bookings made in either Primpy or Snip.
  const q = query(collection(db, COLLECTION), where('customerId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs
    .map((s) => mapAppointment(s.id, s.data() as Record<string, unknown>))
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
}

export async function fetchAppointment(id: string): Promise<Appointment | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  return snap.exists() ? mapAppointment(snap.id, snap.data() as Record<string, unknown>) : null;
}

export async function cancelAppointment(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { status: 'cancelled' });
}

/** Bookings for a venue (business side) — rows where `barberId` is the venue uid. */
export async function fetchVenueBookings(venueId: string): Promise<Appointment[]> {
  const q = query(collection(db, COLLECTION), where('barberId', '==', venueId));
  const snap = await getDocs(q);
  return snap.docs
    .map((s) => mapAppointment(s.id, s.data() as Record<string, unknown>))
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
}

export async function setAppointmentStatus(id: string, status: Appointment['status']): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { status });
}

/** Move a booking to a new slot (server-checked for clashes). Same doc, so Snip sees the change. */
export async function rescheduleAppointment(id: string, date: string, time: string): Promise<void> {
  try {
    await rescheduleBookingFn({ appointmentId: id, date, time });
    return;
  } catch (e) {
    if (!notDeployed(e)) throw e;
  }
  // TODO: remove once primpy_rescheduleBooking is live (the rules then refuse this write).
  await updateDoc(doc(db, COLLECTION, id), {
    date,
    time,
    rescheduledAt: new Date().toISOString(),
  });
}

const busySlots = httpsCallable<
  { venueId: string; date: string; ignoreId?: string },
  { busy: { start: number; end: number }[] }
>(functions, 'primpy_busySlots');

/**
 * Start times that clash with existing bookings at a venue on a date, for a
 * booking of `duration` minutes. Customers can't read other people's
 * appointments, so the busy ranges come from the `primpy_busySlots` function.
 * Returns null if availability couldn't be checked.
 */
export async function fetchTakenSlots(
  venueId: string,
  date: string,
  duration: number,
  ignoreId?: string,
): Promise<Set<string> | null> {
  try {
    const { data } = await busySlots({ venueId, date, ignoreId });
    const taken = new Set<string>();
    for (const slot of SLOTS) {
      const s = timeToMin(slot);
      const e = s + Math.max(duration, 30);
      if (data.busy.some((b) => s < b.end && b.start < e)) taken.add(slot);
    }
    return taken;
  } catch (e) {
    console.warn('Could not check venue availability', e);
    return null;
  }
}
