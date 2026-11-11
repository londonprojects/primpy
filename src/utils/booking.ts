import { SLOTS } from '../config/slots';
import type { Appointment, Venue } from '../types';
import { daysFromToday, parseISODate, timeToMin, todayISO } from './format';

/**
 * Booking state lives in the URL so a held slot survives the login redirect:
 *   /venue/:id/book?t=a,b&d=2026-10-29&time=14:00[&r=<appointmentId to reschedule>]
 *   /venue/:id/pay?t=a,b&d=2026-10-29&time=14:00&notes=…
 */
export interface BookingParams {
  t: string[];
  d?: string;
  time?: string | null;
  r?: string;
  notes?: string;
}

function qs(p: BookingParams): string {
  const s = new URLSearchParams();
  if (p.t.length) s.set('t', p.t.join(','));
  if (p.d) s.set('d', p.d);
  if (p.time) s.set('time', p.time);
  if (p.r) s.set('r', p.r);
  if (p.notes) s.set('notes', p.notes);
  return s.toString();
}

export const bookUrl = (venueId: string, p: BookingParams) => `/venue/${venueId}/book?${qs(p)}`;
export const payUrl = (venueId: string, p: BookingParams) => `/venue/${venueId}/pay?${qs(p)}`;

export function readBookingParams(sp: URLSearchParams): BookingParams {
  return {
    t: (sp.get('t') ?? '').split(',').filter(Boolean),
    d: sp.get('d') ?? undefined,
    time: sp.get('time'),
    r: sp.get('r') ?? undefined,
    notes: sp.get('notes') ?? undefined,
  };
}

/** Venues are closed on Sundays until opening hours come from the backend. */
export function isClosed(dateStr: string): boolean {
  return parseISODate(dateStr)?.getDay() === 0;
}

/** Slots that have already started today. */
export function isPast(dateStr: string, slot: string): boolean {
  if (daysFromToday(dateStr) !== 0) return daysFromToday(dateStr) < 0;
  const now = new Date();
  return timeToMin(slot) <= now.getHours() * 60 + now.getMinutes();
}

/** Next few start times left today, for the quick-book pills on cards. */
export function slotsLeftToday(count = 3): string[] {
  const today = todayISO();
  if (isClosed(today)) return [];
  return SLOTS.filter((s) => !isPast(today, s)).slice(0, count);
}

/** Treatment ids for an existing appointment (handles older single-service docs). */
export function appointmentTreatmentIds(a: Appointment, v: Venue | undefined): string[] {
  if (!v) return a.serviceIds;
  const known = a.serviceIds.filter((id) => v.treatments.some((t) => t.id === id));
  if (known.length) return known;
  const names = a.serviceName.split(', ');
  return v.treatments.filter((t) => names.includes(t.name)).map((t) => t.id);
}

export function isUpcoming(a: Appointment): boolean {
  return a.status === 'scheduled' && daysFromToday(a.date) >= 0;
}

export function bookingRef(id: string): string {
  return `PRM-${id.slice(-5).toUpperCase()}`;
}

export const STATUS_STYLE: Record<string, { text: string; bg: string; fg: string }> = {
  scheduled: { text: 'Confirmed', bg: 'var(--teal-soft)', fg: 'var(--teal-dark)' },
  completed: { text: 'Completed', bg: 'var(--surface)', fg: 'var(--ink)' },
  cancelled: { text: 'Cancelled', bg: 'var(--danger-soft)', fg: 'var(--danger)' },
  'no-show': { text: 'No-show', bg: 'var(--amber-soft)', fg: 'var(--amber-ink)' },
};

/** A scheduled booking whose date has passed is shown as completed. */
export function displayStatus(a: Appointment): Appointment['status'] {
  return a.status === 'scheduled' && daysFromToday(a.date) < 0 ? 'completed' : a.status;
}

/**
 * Attribution for the venue's own links. A venue shares `/venue/<id>?ref=venue`; we remember
 * that for the browser session so the booking is tagged 'venue-link' (0% commission) even
 * after the login step. Marketplace visits carry no ref and are tagged by the server.
 */
const refKey = (venueId: string) => `primpy:ref:${venueId}`;

export function rememberVenueLink(venueId: string, sp: URLSearchParams): void {
  if (sp.get('ref') !== 'venue') return;
  try {
    sessionStorage.setItem(refKey(venueId), 'venue-link');
  } catch {
    /* storage unavailable: the booking is then treated as a marketplace one */
  }
}

export function bookingChannel(venueId: string): 'venue-link' | undefined {
  try {
    return sessionStorage.getItem(refKey(venueId)) === 'venue-link' ? 'venue-link' : undefined;
  } catch {
    return undefined;
  }
}

/** The link a venue shares from its own website, Google profile and social "Book now" buttons. */
export const venueLink = (venueId: string) => `${window.location.origin}/venue/${venueId}?ref=venue`;
