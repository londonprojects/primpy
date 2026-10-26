/**
 * Shared types for Primpy. These mirror the Snip Firestore data model so the
 * two apps read/write the same backend. In Primpy's beauty/wellness framing a
 * "venue" is a provider document (a `users` doc with role `barber`/`admin`) and
 * a "treatment" is one of that provider's `barberServices` entries.
 */

export type UserRole = 'customer' | 'barber' | 'admin';

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatar?: string;
}

/** One bookable treatment offered by a venue (maps to a `barberServices` row). */
export interface Treatment {
  id: string;
  name: string;
  /** Minutes. */
  duration: number;
  /** In the backend's currency (GBP for Treatwell-style venues). */
  price: number;
  description?: string;
  category?: string;
}

/** A bookable venue — salon, spa, nail bar, barbershop, clinic, etc. */
export interface Venue {
  id: string;
  name: string;
  tagline: string;
  rating: number;
  totalReviews: number;
  image: string;
  address: string;
  city: string;
  /** Category ids this venue matches (derived from its treatments). */
  categories: string[];
  treatments: Treatment[];
  bio?: string;
  coordinate?: { latitude: number; longitude: number };
}

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no-show';

export interface Appointment {
  id: string;
  userId: string;
  /** Venue (provider) id — stored as `barberId` in the shared backend. */
  barberId: string;
  barberName: string;
  serviceId: string;
  serviceName: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  price: number;
  notes?: string;
  createdAt?: string;
}
