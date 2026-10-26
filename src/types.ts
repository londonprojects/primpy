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
  emailVerified: boolean;
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
  /** Heading the treatment is grouped under on the venue page. */
  group: string;
}

/** A bookable venue — salon, spa, nail bar, barbershop, clinic, etc. */
export interface Venue {
  id: string;
  name: string;
  tagline: string;
  rating: number;
  totalReviews: number;
  image: string;
  /** Hero image first, then any extra photos. */
  photos: string[];
  address: string;
  city: string;
  /** Short neighbourhood label for cards ("Shoreditch"). */
  area: string;
  /** Category ids this venue matches (derived from its treatments). */
  categories: string[];
  treatments: Treatment[];
  bio?: string;
  phone?: string;
  /** Fraction of the total taken as a deposit (0.2 = 20%). Absent = no deposit. */
  deposit?: number;
  coordinate?: { latitude: number; longitude: number };
}

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no-show';
export type PaymentMethod = 'venue' | 'deposit' | 'full';

export interface Appointment {
  id: string;
  userId: string;
  /** Venue (provider) id — stored as `barberId` in the shared backend. */
  barberId: string;
  barberName: string;
  /** First treatment id (kept for Snip); `serviceIds` holds all of them. */
  serviceId: string;
  serviceIds: string[];
  /** Treatment names joined with ", ". */
  serviceName: string;
  date: string;
  time: string;
  /** Total minutes, when known. */
  duration?: number;
  status: AppointmentStatus;
  price: number;
  paymentMethod: PaymentMethod;
  /** Amount already paid online. */
  amountPaid: number;
  notes?: string;
  createdAt?: string;
}

export interface Review {
  id: string;
  venueId: string;
  userId: string;
  appointmentId: string;
  authorName: string;
  treatment: string;
  rating: number;
  aspects: { clean: number; value: number; punct: number };
  text: string;
  createdAt: string;
}
