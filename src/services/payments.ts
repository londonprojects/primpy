import { loadStripe } from '@stripe/stripe-js/pure';
import type { Stripe } from '@stripe/stripe-js';
import { API_BASE_URL, auth } from '../firebase';
import type { PaymentMethod } from '../types';

/**
 * Stripe payments for booking deposits / full prepayment.
 *
 * The browser never decides the amount. It asks the shared payments API
 * (VITE_API_BASE_URL, the Snip/Shipyard Express server) to create a
 * PaymentIntent; the server prices the booking from Firestore, applies any
 * gift card / promo code and returns a client secret. Endpoints expected:
 *
 *   POST /payments/booking-intent
 *     body { venueId, treatmentIds, date, time, method: 'deposit'|'full', promoCode? }
 *     → { clientSecret, paymentIntentId, amount }   // amount in pence
 *   POST /payments/refund
 *     body { appointmentId } → { refunded: number } // pence
 *
 * Both take `Authorization: Bearer <Firebase ID token>`.
 */

const PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

export const paymentsEnabled = !!PUBLISHABLE_KEY;

let stripePromise: Promise<Stripe | null> | null = null;
export function getStripe(): Promise<Stripe | null> | null {
  if (!PUBLISHABLE_KEY) return null;
  if (!stripePromise) stripePromise = loadStripe(PUBLISHABLE_KEY);
  return stripePromise;
}

async function api<T>(path: string, body: unknown): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = `Payment service error (${res.status})`;
    try {
      const j = (await res.json()) as { error?: string; message?: string };
      msg = j.error || j.message || msg;
    } catch {
      /* not JSON */
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export interface BookingIntent {
  clientSecret: string;
  paymentIntentId: string;
  /** Pence. */
  amount: number;
}

export function createBookingIntent(input: {
  venueId: string;
  treatmentIds: string[];
  date: string;
  time: string;
  method: Exclude<PaymentMethod, 'venue'>;
  promoCode?: string;
}): Promise<BookingIntent> {
  return api<BookingIntent>('/payments/booking-intent', input);
}

/** Refund what was paid online (cancellation more than 24h ahead). */
export function requestRefund(appointmentId: string): Promise<{ refunded: number }> {
  return api<{ refunded: number }>('/payments/refund', { appointmentId });
}
