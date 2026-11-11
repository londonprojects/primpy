# Payments API: card processing fee

The payments API (`VITE_API_BASE_URL`, the shared Snip/Shipyard Express server) is not in this
repo. The Primpy checkout is already built to the contract below; it needs this server change
before it can show or charge a card fee.

## Rules
- The fee is charged to the **guest**, **only** when they pay online (`method` is `deposit` or `full`).
  Primpy takes no markup and the venue pays no part of it.
- `method: 'venue'` never reaches this endpoint, so there is no fee.
- Primpy commission is never added to the guest's total.

## `POST /payments/booking-intent`
Unchanged request. The response gains one field and `amount` changes meaning:

```jsonc
{
  "clientSecret": "pi_..._secret_...",
  "paymentIntentId": "pi_...",
  "amount": 5097,   // pence charged now = base + cardFee
  "cardFee": 97     // pence, the card processing fee inside `amount`
}
```

Steps: price the booking from Firestore as today, apply gift card / promo credit to get `base`
(pence paid online), then `cardFee = cardFeeMinor(base)`, `amount = base + cardFee`, and create
the PaymentIntent for `amount`. Keep `base` and `cardFee` in the PaymentIntent `metadata` so the
booking records `amountPaid` as `base` only (the fee is not part of the treatment price).
Refunds on cancellation return `base` plus the fee, or just `base`; decide which and say so on /help.

## Reference implementation
`functions/pricing.js` exports `cardFeeMinor(baseMinor)` and is covered by
`functions/test/commission.test.js`. The rate comes from `functions/pricing.json`:

```js
const fixedMinor = Math.round(fee.fixed * 100)
const total = Math.ceil((baseMinor + fixedMinor) / (1 - fee.percent))
return total - baseMinor
```

It is grossed up because Stripe takes its percentage from the whole amount charged, so
`base * percent + fixed` would under-recover a few pence. £50.00 pays a £0.97 fee at 1.5% + 20p.

## Before launch
- Set the real at-cost rate in `functions/pricing.json` and flip `cardFee.confirmed` to `true`
  (that also shows the rate on /pricing). 1.5% + 20p is a placeholder.
- A fixed rate is an estimate for cards Stripe prices differently (premium, EEA, international).
  "At cost" exactly would mean reading the actual fee from the charge afterwards and settling the
  difference. Decide which is wanted.
