import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { Appointment } from '../types';
import { SLOTS } from '../config/slots';
import { cancelBooking, londonDateTime, londonEpochMs, rescheduleBooking } from './snipApi';

const COLLECTION = 'appointments';
/** Primpy books the venue owner's own calendar (no stylist picker), as the Snip API defaults to. */
const OWNER_STYLIST_ID = 'owner';

// Bookings are created by the Snip API (see snipApi.createBooking): the server prices them,
// takes the slot lock and applies the venue's payment rules. Clients can't write them directly.

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function mapAppointment(id: string, d: Record<string, unknown>): Appointment {
  const serviceId = String(d.serviceId ?? '');
  // Bookings made through the API carry startsAtMs; older ones only have date/time strings.
  const startsAtMs = num(d.startsAtMs);
  const when = startsAtMs != null ? londonDateTime(startsAtMs) : { date: String(d.date ?? ''), time: String(d.time ?? '') };
  const priceCents = num(d.priceCents);
  const paidCents = num(d.amountPaidCents);
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
    date: when.date,
    time: when.time,
    duration: num(d.durationMin) ?? num(d.duration),
    status: normaliseStatus(d.status),
    price:
      priceCents != null
        ? priceCents / 100
        : typeof d.price === 'number'
          ? d.price
          : Number(String(d.price ?? '').replace(/[^0-9.]/g, '')) || 0,
    paymentMethod: method === 'deposit' || method === 'full' ? method : 'venue',
    amountPaid: paidCents != null ? paidCents / 100 : (num(d.amountPaid) ?? 0),
    awaitingPayment: d.status === 'pending_payment',
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

/**
 * Cancels through the API, which releases the slot and refunds according to the venue's
 * policy (full refund 24h+ ahead; within 24h a customer keeps nothing of the deposit).
 * Returns the refunded amount in pounds.
 */
export async function cancelAppointment(id: string): Promise<number> {
  const out = await cancelBooking(id);
  return (out.refundedCents ?? 0) / 100;
}

/** Bookings for a venue (business side) — rows where `barberId` is the venue uid. */
export async function fetchVenueBookings(venueId: string): Promise<Appointment[]> {
  const q = query(collection(db, COLLECTION), where('barberId', '==', venueId));
  const snap = await getDocs(q);
  return snap.docs
    .map((s) => mapAppointment(s.id, s.data() as Record<string, unknown>))
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
}

/**
 * Venue-side status changes. Cancelling goes through the API (refunds, slot release); marking
 * a visit completed or a no-show is a plain status change the shared rules allow the venue.
 */
export async function setAppointmentStatus(id: string, status: Appointment['status']): Promise<void> {
  if (status === 'cancelled') {
    await cancelBooking(id);
    return;
  }
  await updateDoc(doc(db, COLLECTION, id), { status, updatedAt: Date.now() });
}

/** Move a booking to a new slot. The API checks the new time is free and moves the slot lock. */
export async function rescheduleAppointment(id: string, date: string, time: string): Promise<void> {
  await rescheduleBooking(id, date, time);
}

/**
 * Start times that clash with existing bookings at a venue on a date, for a booking of
 * `duration` minutes. Reads the public `busySlots` projection (times only, no customer data),
 * which includes unpaid holds until they expire. `ignoreId` skips the booking being moved.
 */
export async function fetchTakenSlots(
  venueId: string,
  date: string,
  duration: number,
  ignoreId?: string,
): Promise<Set<string>> {
  const taken = new Set<string>();
  try {
    // One equality filter only, so no composite index is needed; the day is filtered here.
    const snap = await getDocs(query(collection(db, 'busySlots'), where('barberId', '==', venueId)));
    const dayStart = londonEpochMs(date, '00:00');
    const dayEnd = dayStart + 36 * 3600_000; // generous: covers clock changes
    const now = Date.now();
    const busy = snap.docs
      .filter((s) => s.id !== ignoreId)
      .map((s) => s.data() as Record<string, unknown>)
      .filter((d) => (d.stylistId ?? OWNER_STYLIST_ID) === OWNER_STYLIST_ID)
      .filter((d) => {
        const hold = num(d.holdExpiresAtMs);
        return hold == null || hold > now;
      })
      .map((d) => [num(d.startsAtMs) ?? 0, num(d.durationMin) ?? 30] as const)
      .filter(([start]) => start >= dayStart && start < dayEnd)
      .map(([start, len]) => [start, start + len * 60_000] as const);
    for (const slot of SLOTS) {
      const s = londonEpochMs(date, slot);
      const e = s + Math.max(duration, 30) * 60_000;
      if (busy.some(([bs, be]) => s < be && bs < e)) taken.add(slot);
    }
  } catch (e) {
    console.warn('Could not read venue availability; showing all slots', e);
  }
  return taken;
}

function normaliseStatus(v: unknown): Appointment['status'] {
  if (v === 'cancelled' || v === 'expired') return 'cancelled';
  if (v === 'completed') return 'completed';
  if (v === 'no-show') return 'no-show';
  return 'scheduled'; // upcoming, scheduled, confirmed, pending_payment
}
