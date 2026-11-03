import { API_BASE_URL, auth } from '../firebase';
import type { PaymentMethod } from '../types';
import { LONDON, londonEpochMs } from '../utils/londonTime';

export { londonDateTime, londonEpochMs } from '../utils/londonTime';

/**
 * Bookings go through the Snip booking API (the shared Express server), not straight into
 * Firestore. The server prices the treatments from the venue's menu, takes the slot lock so
 * two people can't book the same time, and applies the venue's deposit / pay-at-venue and
 * cancellation rules. Primpy and the Snip app share these endpoints.
 *
 * Every call sends the signed-in user's Firebase ID token.
 */

export class SnipApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

const FRIENDLY: Record<string, string> = {
  SLOT_TAKEN: 'Someone has just booked that time. Please pick another.',
  SLOT_IN_PAST: 'That time has already passed. Please pick another.',
  HOLD_EXPIRED: 'Your reservation expired before payment. Please book the time again.',
  DEPOSIT_NOT_OFFERED: 'This venue doesn’t take deposits. Pay in full instead.',
  PAY_AT_VENUE_NOT_OFFERED: 'This venue asks you to pay when you book.',
  ALREADY_PAID: 'This booking is already paid.',
  ALREADY_CANCELLED: 'This booking was already cancelled.',
};

async function call<T>(method: 'POST' | 'DELETE', path: string, body?: unknown): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new SnipApiError('Please log in first.', 401, 'UNAUTHENTICATED');
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/snip${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new SnipApiError('You appear to be offline. Check your connection and try again.', 0, 'NETWORK');
  }
  if (!res.ok) {
    let code: string | undefined;
    let message = 'Something went wrong. Please try again.';
    try {
      // Server shape: { error: <human message>, code: <MACHINE_CODE> }.
      const j = (await res.json()) as { code?: string; error?: string };
      code = j.code;
      if (code && FRIENDLY[code]) message = FRIENDLY[code];
      else if (res.status < 500 && j.error) message = j.error;
    } catch {
      /* not JSON */
    }
    if (res.status === 409 && !code) message = FRIENDLY.SLOT_TAKEN;
    throw new SnipApiError(message, res.status, code);
  }
  return (await res.json()) as T;
}

/** Labels stored on the booking, in the same style the Snip app shows ("3 November 2026", "14:30"). */
function labels(date: string, time: string): { dateLabel: string; timeLabel: string } {
  const ms = londonEpochMs(date, time);
  const dateLabel = new Date(ms).toLocaleDateString('en-GB', {
    timeZone: LONDON,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return { dateLabel, timeLabel: time };
}

// --- Endpoints ---

export interface BookingResult {
  appointmentId: string;
  status: string;
  priceCents: number;
  amountDueCents: number;
  currency: string;
  paymentMethod: PaymentMethod;
  holdExpiresAtMs: number | null;
}

export function createBooking(input: {
  venueId: string;
  treatmentIds: string[];
  date: string;
  time: string;
  paymentMethod: PaymentMethod;
  notes?: string;
}): Promise<BookingResult> {
  return call<BookingResult>('POST', '/bookings', {
    barberId: input.venueId,
    serviceIds: input.treatmentIds,
    startsAtMs: londonEpochMs(input.date, input.time),
    ...labels(input.date, input.time),
    paymentMethod: input.paymentMethod,
    notes: input.notes?.trim().slice(0, 500) || undefined,
    source: 'primpy-web',
  });
}

export interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  amountCents: number;
  holdExpiresAtMs: number | null;
}

/** Card payment for the amount the server set when the booking was made. */
export function createPaymentIntent(appointmentId: string): Promise<PaymentIntentResult> {
  return call<PaymentIntentResult>('POST', `/appointments/${encodeURIComponent(appointmentId)}/payment-intent`, {});
}

/** After Stripe confirms, ask the server to verify and mark the booking paid. */
export function confirmPayment(appointmentId: string): Promise<{ paymentStatus: string }> {
  return call<{ paymentStatus: string }>(
    'POST',
    `/appointments/${encodeURIComponent(appointmentId)}/confirm-payment`,
    {},
  );
}

/** Cancels and refunds according to the venue's policy; the server decides the refund. */
export function cancelBooking(appointmentId: string): Promise<{ status: string; refundedCents: number }> {
  return call('POST', `/appointments/${encodeURIComponent(appointmentId)}/cancel`, {});
}

export function rescheduleBooking(appointmentId: string, date: string, time: string): Promise<{ startsAtMs: number }> {
  return call('POST', `/appointments/${encodeURIComponent(appointmentId)}/reschedule`, {
    startsAtMs: londonEpochMs(date, time),
    ...labels(date, time),
  });
}
