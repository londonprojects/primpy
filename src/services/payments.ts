import { loadStripe } from '@stripe/stripe-js/pure';
import type { Stripe } from '@stripe/stripe-js';

/**
 * Stripe.js setup for card payments. The amounts and PaymentIntents come from the Snip booking
 * API (see snipApi.ts): the browser never decides what to charge.
 */

const PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

export const paymentsEnabled = !!PUBLISHABLE_KEY;

let stripePromise: Promise<Stripe | null> | null = null;
export function getStripe(): Promise<Stripe | null> | null {
  if (!PUBLISHABLE_KEY) return null;
  if (!stripePromise) stripePromise = loadStripe(PUBLISHABLE_KEY);
  return stripePromise;
}
