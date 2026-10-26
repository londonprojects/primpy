/**
 * Features designed in v3 that have no backend yet: gift cards, promo codes,
 * saved cards and reviews. In development (`npm run dev`) they behave like the
 * prototype so every screen can be clicked through. In a production build
 * they refuse with a friendly message instead of pretending to work.
 *
 * TODO(backend): replace each function with a real call and delete this file.
 */
import type { Review } from '../types';
import { readLocal, writeLocal } from './localStore';

const DEMO = import.meta.env.DEV;

export class NotAvailableError extends Error {
  constructor(what: string) {
    super(`${what} isn't available yet.`);
    this.name = 'NotAvailableError';
  }
}

const wait = (ms = 400) => new Promise((r) => setTimeout(r, ms));

/* ---------- Gift cards & promo codes ---------- */
// TODO(backend): `giftCards` collection { code, amount, balance, purchaserId, recipientEmail, design, message }
// and a Stripe charge for the purchase. Balance belongs on the user doc or a `wallets` doc.

export async function validatePromo(code: string): Promise<{ credit: number; label: string }> {
  if (!DEMO) throw new NotAvailableError('Gift cards and promo codes');
  await wait();
  if (code.trim().length < 4) throw new Error('Enter a gift card or promo code');
  return { credit: 10, label: 'Gift card applied — £10 credit' };
}

export async function purchaseGiftCard(_input: {
  amount: number;
  design: number;
  to: string;
  email: string;
  message: string;
}): Promise<void> {
  if (!DEMO) throw new NotAvailableError('Buying gift cards');
  await wait();
}

export function giftBalance(userId: string): number {
  return DEMO ? readLocal<number>(`gift:${userId}`, 10) : 0;
}

export async function redeemGiftCard(userId: string, code: string): Promise<number> {
  if (!DEMO) throw new NotAvailableError('Redeeming gift cards');
  await wait();
  if (code.trim().length < 4) throw new Error('Enter a valid code');
  const next = giftBalance(userId) + 25;
  writeLocal(`gift:${userId}`, next);
  return next;
}

/* ---------- Saved cards ---------- */
// TODO(backend): list / attach / detach Stripe PaymentMethods on the user's Stripe Customer.

export interface SavedCard {
  id: string;
  last4: string;
  exp: string;
}

export function savedCards(userId: string): { cards: SavedCard[]; defaultId: string | null } {
  if (!DEMO) return { cards: [], defaultId: null };
  return readLocal(`cards:${userId}`, {
    cards: [{ id: 'c1', last4: '4242', exp: '08/28' }],
    defaultId: 'c1' as string | null,
  });
}

export function saveCards(userId: string, value: { cards: SavedCard[]; defaultId: string | null }) {
  writeLocal(`cards:${userId}`, value);
}

/* ---------- Reviews ---------- */
// TODO(backend): `reviews` collection { venueId, userId, appointmentId, authorName, treatment,
// rating, aspects: { clean, value, punct }, text, createdAt }, and roll the average into the
// venue's `barberAverageRating` / `barberReviewCount` with a Cloud Function.

export function fetchVenueReviews(venueId: string): Review[] {
  return readLocal<Review[]>('reviews', []).filter((r) => r.venueId === venueId);
}

export function reviewedAppointmentIds(userId: string): string[] {
  return readLocal<Review[]>('reviews', [])
    .filter((r) => r.userId === userId)
    .map((r) => r.appointmentId);
}

export async function createReview(review: Omit<Review, 'id' | 'createdAt'>): Promise<void> {
  if (!DEMO) throw new NotAvailableError('Reviews');
  await wait();
  const all = readLocal<Review[]>('reviews', []);
  writeLocal('reviews', [
    { ...review, id: `r${Date.now()}`, createdAt: new Date().toISOString() },
    ...all,
  ]);
}
