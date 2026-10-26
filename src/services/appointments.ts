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
import { db } from '../firebase';
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
  amountPaid: number;
  paymentIntentId?: string;
}

/**
 * Create an appointment in the shared backend. Field names match Snip's
 * `appointments` documents (barberId / barberName / serviceId / serviceName)
 * so bookings made in Primpy show up in Snip and vice versa.
 *
 * A multi-treatment booking is ONE doc: `serviceName` joins the names with
 * ", ", `price` and `duration` are totals, `serviceId` is the first treatment
 * (what Snip reads) and `serviceIds` lists them all.
 */
export async function createAppointment(booking: NewBooking): Promise<string> {
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
    amountPaid: booking.amountPaid,
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

/** Move a booking to a new slot. Same doc, so Snip sees the change. */
export async function rescheduleAppointment(id: string, date: string, time: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    date,
    time,
    rescheduledAt: new Date().toISOString(),
  });
}

/**
 * Start times that clash with existing bookings at a venue on a date, for a
 * booking of `duration` minutes. Reads other customers' appointments, which
 * the shared rules may not allow; on a permission error every slot is shown
 * as free and Snip stays the source of truth.
 */
export async function fetchTakenSlots(
  venueId: string,
  date: string,
  duration: number,
  ignoreId?: string,
): Promise<Set<string>> {
  const taken = new Set<string>();
  try {
    const q = query(
      collection(db, COLLECTION),
      where('barberId', '==', venueId),
      where('date', '==', date),
    );
    const snap = await getDocs(q);
    const busy = snap.docs
      .filter((s) => s.id !== ignoreId)
      .map((s) => s.data() as Record<string, unknown>)
      .filter((d) => d.status !== 'cancelled' && typeof d.time === 'string')
      .map((d) => {
        const start = timeToMin(String(d.time));
        const len = typeof d.duration === 'number' && d.duration > 0 ? d.duration : 30;
        return [start, start + len] as const;
      });
    for (const slot of SLOTS) {
      const s = timeToMin(slot);
      const e = s + Math.max(duration, 30);
      if (busy.some(([bs, be]) => s < be && bs < e)) taken.add(slot);
    }
  } catch (e) {
    console.warn('Could not read venue availability; showing all slots', e);
  }
  return taken;
}
