# Primpy

A **Treatwell-style beauty & wellness booking marketplace** built with React + Vite + TypeScript.
Primpy shares the **same backend as the [Snip](../shipyard/apps/snip) app** — the Firebase project
`currentlyremote-snip` (Firestore + Firebase Auth) — so venues, users and bookings interoperate
between the two apps.

The UI follows the v3 "App" redesign (Claude Design handoff): Bricolage Grotesque + Figtree, teal /
amber / ink tokens in `src/index.css`, one breakpoint at 760px (bottom tab bar, no header search or map).

## What it does

- 🔍 Browse by category, search with filters, sort and a price-pin map
- 🏠 Venue pages: multi-select treatments, reviews, about, location, photo gallery, ♥ save
- 📅 Book several treatments at once, pick a date and time, then pay at the venue or pay a deposit / in full (Stripe)
- 🔁 Reschedule or cancel (with a fee message and refunds for prepaid bookings)
- 👤 Email-first log in / sign up modal, Google and Apple sign-in, email verification, password reset, onboarding
- 🗂️ My bookings, booking detail (directions, add to calendar, receipt), inbox, account, payment & receipts, privacy & data
- 🎁 Gift cards, help & cancellation policy, 404 and offline states

## Routes

| Route | Screen |
| --- | --- |
| `/` | Home |
| `/c/:category` | Category landing |
| `/search?q=&area=&category=&sort=` | Search + map |
| `/venue/:id?t=a,b` | Venue (selected treatments in `t`) |
| `/venue/:id/book?t=a,b&d=YYYY-MM-DD&time=HH:MM[&r=apptId]` | Pick a time (`r` = reschedule) |
| `/venue/:id/pay?…` | Payment step |
| `/booked/:id` | Confirmation |
| `/appointments`, `/booking/:id`, `/review/:id` | My bookings, detail, write a review |
| `/account`, `/account/payments`, `/account/privacy` | Account |
| `/saved`, `/inbox`, `/gift`, `/help` | Saved, inbox, gift cards, help |
| `/onboard`, `/verify`, `/reset` | After sign-up, email verification, emailed-link landing |
| `/login`, `/register` | Open the auth modal (kept for deep links) |

Booking state lives in the URL so a held slot survives the login step.

## How it maps to the Snip backend

| Primpy concept | Snip / Firestore |
| --- | --- |
| Venue | `users` doc with `role` in `barber`/`admin` (`shopName`, address, `barberAverageRating`…) |
| Treatment | an entry in the venue's `barberServices` array |
| Booking | an `appointments` doc (`barberId`, `barberName`, `serviceId`, `serviceName`, `date`, `time`, `status`, `price`) |
| User | `users` doc with `role: customer` |

Field names are kept identical so bookings made in Primpy appear in Snip and vice versa.

A multi-treatment booking is **one** `appointments` doc: `serviceName` joins the names with ", ",
`price` / `duration` are totals and `serviceId` is the first treatment. New optional fields:
`serviceIds[]`, `duration`, `paymentMethod` (`venue` | `deposit` | `full`), `amountPaid`,
`paymentIntentId`, `rescheduledAt`. Venue docs may set `depositFraction` (0.2) or
`depositPercent` (20), `phone` and `photos[]`.

Rescheduling updates `date` / `time` on the existing doc. Slot availability reads other
`appointments` for the venue and date; if the security rules don't allow that, every slot shows as
free and Snip stays the source of truth.

## Getting started

```bash
npm install
cp .env.example .env.local   # already filled with the shared public Firebase config
npm run dev
```

Open http://localhost:5180.

### Firebase config

`.env.local` holds the Firebase **web** config. These are public client values (access is
enforced by the project's Firestore security rules, not by secrecy). To enable all web features,
add a **Web app** in the Firebase console for project `currentlyremote-snip` and paste its
`appId` into `VITE_FIREBASE_APP_ID`. Also add your dev origin (`localhost`) under
**Authentication → Settings → Authorized domains**.

For social login, enable the **Google** and **Apple** providers under Authentication → Sign-in method.
For the emailed links, set the custom action URL (Authentication → Templates) to
`https://<your-domain>/reset`; that page handles both password reset and email verification.

### Payments (Stripe)

Set `VITE_STRIPE_PUBLISHABLE_KEY`. Without it the deposit / pay-in-full options are disabled and
every booking is pay-at-venue. The browser never sets the amount: it calls the shared payments
API at `VITE_API_BASE_URL` (see `src/services/payments.ts`):

- `POST /payments/booking-intent` `{ venueId, treatmentIds, date, time, method, promoCode? }` → `{ clientSecret, paymentIntentId, amount }`
- `POST /payments/refund` `{ appointmentId }` → `{ refunded }`

Both take `Authorization: Bearer <Firebase ID token>`. **These endpoints still need building on the
Express server.**

### Not wired to a backend yet

These screens work in `npm run dev` with local mock behaviour and refuse politely in production
builds. Search for `TODO(backend)`:

- Reviews (`reviews` collection proposed in `src/services/stubs.ts`)
- Gift cards and promo codes, saved cards
- Saved venues, interests / area, notification and privacy preferences, inbox read state (stored in
  localStorage; proposed `users` fields in `src/context/UserDataContext.tsx`)
- Inbox items are derived from bookings; venue offers need a `notifications` collection
- Account deletion deletes the Firebase Auth user and cancels upcoming bookings; anonymising the
  `users` doc needs a server function

Also placeholders: the map (`TODO(maps)`), the policy wording (`TODO(content)`), Contact support,
and the privacy policy and terms links. Opening hours are fixed at Mon–Sat 9:00–19:00.

## Build

```bash
npm run build && npm run preview
```
