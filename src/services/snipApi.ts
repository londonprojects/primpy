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
  AMOUNT_BELOW_MINIMUM: 'That deposit is too small to pay by card. Pay in full or at the venue instead.',
  TOO_MANY_HOLDS: 'You have a few bookings waiting for payment. Finish or cancel one, then try again.',
  TOO_MANY_UNPAID_BOOKINGS: 'You already have several bookings to pay at the venue. Pay online for this one, or cancel one you don’t need.',
  NOTES_TOO_LONG: 'Please shorten your note to 500 characters.',
  BOOKING_TOO_LONG: 'That’s more than 8 hours of treatments. Please book them as separate visits.',
  SLOT_TOO_FAR: 'That date is too far ahead to book yet.',
  SERVICE_NOT_FOUND: 'One of those treatments isn’t on the menu any more. Please choose again.',
  SERVICE_NOT_PRICED: 'One of those treatments doesn’t have a price yet. Please contact the venue.',
  NOTHING_TO_PAY: 'There’s nothing to pay online for this booking.',
  NOT_CANCELLABLE: 'This booking can no longer be cancelled.',
  PAYMENT_REQUIRED: 'Please finish paying for this booking before moving it.',
  NOT_RESCHEDULABLE: 'This booking can no longer be moved.',
  REFUND_FAILED: 'Your booking is cancelled, but the refund didn’t go through yet. Please try cancelling again in a moment.',
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
