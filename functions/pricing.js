/**
 * Partner pricing maths for the server side. The numbers live in pricing.json, the
 * single source of truth: the web app (src/config/pricing.ts) imports the same file,
 * so changing a value there changes the site copy, the checkout and the commission ledger.
 */
import pricing from './pricing.json' with { type: 'json' }

export const PRICING = pricing

/** Salon commission in pence on a booking of `pricePounds` (new client's first Primpy booking). */
export function commissionPence(pricePounds, rate = PRICING.newClientCommission) {
  return Math.round(pricePounds * 100 * rate)
}

/**
 * Card processing fee in pence to ADD to `baseMinor` pence so the guest pays the processor's
 * fee at cost. Stripe takes its percentage from the whole amount charged, so the fee is grossed
 * up: total = (base + fixed) / (1 - percent). (A plain base*percent + fixed would under-recover.)
 * Returns 0 when nothing is paid online. This is the reference implementation for the payments
 * API's POST /payments/booking-intent; see docs/payments-api-card-fee.md.
 */
export function cardFeeMinor(baseMinor, fee = PRICING.cardFee) {
  if (!Number.isFinite(baseMinor) || baseMinor <= 0) return 0
  const fixedMinor = Math.round(fee.fixed * 100)
  const total = Math.ceil((baseMinor + fixedMinor) / (1 - fee.percent))
  return total - baseMinor
}
