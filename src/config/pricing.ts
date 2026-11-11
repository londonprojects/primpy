/**
 * Primpy partner pricing — the ONE place these numbers live.
 *
 * Who pays what:
 * - The SALON (venue) pays Primpy's commission, once, on a new client's first
 *   completed booking made through the Primpy marketplace.
 * - The GUEST never pays Primpy commission or a booking fee. When the guest
 *   pays online (deposit or pay in full) the card processing fee is passed
 *   through to them at cost, with no Primpy markup. Paying at the venue has no
 *   Primpy card fee at all.
 *
 * The numbers themselves live in functions/pricing.json so the Cloud Functions commission
 * ledger reads the very same values. Everything on /pricing, /business/signup, the business dashboard, the help
 * FAQ and the checkout reads from here, so change a value once and it updates
 * everywhere.
 */
import values from '../../functions/pricing.json';

export const PRICING = {
  /** Commission on a new client's first completed Primpy marketplace booking (0.15 = 15%). */
  newClientCommission: values.newClientCommission,
  /** Commission on repeat bookings and on the venue's own links / imported clients. */
  repeatCommission: values.repeatCommission,
  /** A client is "new" if the venue hasn't completed a Primpy booking with them in this many days. */
  newClientWindowDays: values.newClientWindowDays,
  /**
   * Card processing fee passed to the guest at cost when they pay online. The payments API
   * applies it (docs/payments-api-card-fee.md); the site never computes what is charged.
   * `confirmed` stays false until the real at-cost rate is set, which keeps the figure off
   * the public pages.
   */
  cardFee: values.cardFee,
  /** Prices are shown excluding VAT where applicable. */
  vatNote: 'Prices exclude VAT where applicable.',
  /** Treatment price used in the worked example on /pricing. */
  exampleTreatment: values.exampleTreatment,
} as const;

/** "15%" style label for a fraction. */
export function pct(n: number): string {
  const v = Math.round(n * 10000) / 100;
  return `${v}%`;
}

export const COMMISSION_PCT = pct(PRICING.newClientCommission);
export const REPEAT_PCT = pct(PRICING.repeatCommission);

/** Card fee label like "1.5% + 20p", or null until the rate is confirmed. */
export function cardFeeLabel(): string | null {
  const { percent, fixed, confirmed } = PRICING.cardFee;
  if (!confirmed) return null;
  const f = fixed ? ` + ${fixed < 1 ? `${Math.round(fixed * 100)}p` : `£${fixed.toFixed(2)}`}` : '';
  return `${pct(percent)}${f}`;
}

/** Salon commission (pounds) on a new client's first Primpy booking of `amount` pounds. */
export function newClientCommission(amount: number): number {
  return Math.round(amount * PRICING.newClientCommission * 100) / 100;
}

/** The one-line rate summary shown on /business/signup and the business dashboard. */
export const RATE_LINE = `Free to join. No monthly fee. You pay ${COMMISSION_PCT} only on a new client’s first booking through Primpy; repeat and direct bookings are ${REPEAT_PCT}. Your clients never pay Primpy commission.`;
