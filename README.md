# Primpy

A **Treatwell-style beauty & wellness booking marketplace** built with React + Vite + TypeScript.
Primpy shares the **same backend as the [Snip](../shipyard/apps/snip) app** — the Firebase project
`currentlyremote-snip` (Firestore + Firebase Auth) — so venues, users and bookings interoperate
between the two apps.

## What it does

- 🔍 Browse & search beauty/wellness venues by treatment category (hair, nails, massage, facials, brows, waxing, make-up, spa)
- 🏠 Venue pages with treatments, pricing, ratings
- 📅 Book an appointment (date + time slot) — written to the shared `appointments` collection
- 👤 Firebase email/password auth (sign up, log in, password reset)
- 🗂️ "My bookings" with cancel

## How it maps to the Snip backend

| Primpy concept | Snip / Firestore |
| --- | --- |
| Venue | `users` doc with `role` in `barber`/`admin` (`shopName`, address, `barberAverageRating`…) |
| Treatment | an entry in the venue's `barberServices` array |
| Booking | an `appointments` doc (`barberId`, `barberName`, `serviceId`, `serviceName`, `date`, `time`, `status`, `price`) |
| User | `users` doc with `role: customer` |

Field names are kept identical so bookings made in Primpy appear in Snip and vice versa.

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

## Build

```bash
npm run build && npm run preview
```
