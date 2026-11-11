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
 * Everything on /pricing, /business/signup, the business dashboard, the help
 * FAQ and the checkout reads from here, so change a value once and it updates
 * everywhere.
 */
export const PRICING = {
  /** Commission on a new client's first completed Primpy marketplace booking (0.15 = 15%). */
  newClientCommission: 0.15,
  /** Commission on repeat bookings and on the venue's own links / imported clients. */
  repeatCommission: 0,
  /** A client is "new" if the venue hasn't completed a Primpy booking with them in this many days. */
  newClientWindowDays: 365,
  /**
   * Card processing fee passed through at cost to the guest when they pay online.
   * TO CONFIRM: set to the processor's actual rate before launch.
   */
  cardFee: { percent: 0.015, fixed: 0.2 },
  /** Prices are shown excluding VAT where applicable. */
  vatNote: 'Prices exclude VAT where applicable.',
  /** Treatment price used in the worked example on /pricing. */
  exampleTreatment: 50,
} as const;

/** "15%" style label for a fraction. */
export function pct(n: number): string {
  const v = Math.round(n * 10000) / 100;
  return `${v}%`;
}

export const COMMISSION_PCT = pct(PRICING.newClientCommission);
export const REPEAT_PCT = pct(PRICING.repeatCommission);

/** Card fee label, e.g. "1.5% + 20p". */
export function cardFeeLabel(): string {
  const { percent, fixed } = PRICING.cardFee;
  const f = fixed ? ` + ${fixed < 1 ? `${Math.round(fixed * 100)}p` : `£${fixed.toFixed(2)}`}` : '';
  return `${pct(percent)}${f}`;
}

/** Card processing fee (pounds, to the penny) for an online payment of `amount` pounds. */
export function cardFee(amount: number): number {
  if (amount <= 0) return 0;
  const { percent, fixed } = PRICING.cardFee;
  return Math.round((amount * percent + fixed) * 100) / 100;
}

/** Salon commission (pounds) on a new client's first Primpy booking of `amount` pounds. */
export function newClientCommission(amount: number): number {
  return Math.round(amount * PRICING.newClientCommission * 100) / 100;
}

/** The one-line rate summary shown on /business/signup and the business dashboard. */
export const RATE_LINE = `Free to join. No monthly fee. You pay ${COMMISSION_PCT} only on a new client’s first booking through Primpy; repeat and direct bookings are ${REPEAT_PCT}. Your clients never pay Primpy commission.`;
