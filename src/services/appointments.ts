import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Appointment } from '../types';

const COLLECTION = 'appointments';

export interface NewBooking {
  userId: string;
  venueId: string;
  venueName: string;
  treatmentId: string;
  treatmentName: string;
  date: string;
  time: string;
  price: number;
  notes?: string;
}

/**
 * Create an appointment in the shared backend. Field names match Snip's
 * `appointments` documents (barberId / barberName / serviceId / serviceName)
 * so bookings made in Primpy show up in Snip and vice versa.
 */
export async function createAppointment(booking: NewBooking): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    // `customerId` is required by the shared Firestore rules for create/cancel;
    // `userId` is kept too for apps that read either field.
    customerId: booking.userId,
    userId: booking.userId,
    barberId: booking.venueId,
    barberName: booking.venueName,
    serviceId: booking.treatmentId,
    serviceName: booking.treatmentName,
    date: booking.date,
    time: booking.time,
    price: booking.price,
    notes: booking.notes ?? '',
    status: 'scheduled',
    createdAt: new Date().toISOString(),
    source: 'primpy-web',
  });
  return ref.id;
}

function mapAppointment(id: string, d: Record<string, unknown>): Appointment {
  return {
    id,
    userId: String(d.userId ?? d.customerId ?? ''),
    barberId: String(d.barberId ?? ''),
    barberName: String(d.barberName ?? 'Venue'),
    serviceId: String(d.serviceId ?? ''),
    serviceName: String(d.serviceName ?? 'Treatment'),
    date: String(d.date ?? ''),
    time: String(d.time ?? ''),
    status: (d.status as Appointment['status']) ?? 'scheduled',
    price: typeof d.price === 'number' ? d.price : Number(d.price) || 0,
    notes: typeof d.notes === 'string' ? d.notes : undefined,
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

export async function cancelAppointment(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { status: 'cancelled' });
}
