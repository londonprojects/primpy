import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import type { Appointment } from '../types';
import { fetchMyAppointments } from '../services/appointments';
import { readLocal, writeLocal } from '../services/localStore';

/**
 * Per-user extras from the v3 design that don't have Firestore fields yet.
 * TODO(backend): move to the `users` doc as `phone`, `savedVenueIds[]`,
 * `interests[]`, `homeArea`, `notificationPrefs`, `privacyPrefs`, `readNotificationIds[]`.
 */
export interface UserExtras {
  phone: string;
  savedVenueIds: string[];
  interests: string[];
  homeArea: string;
  prefs: { remind: boolean; sms: boolean; offers: boolean };
  privacy: { personal: boolean; analytics: boolean };
  readNotes: string[];
}

const DEFAULTS: UserExtras = {
  phone: '',
  savedVenueIds: [],
  interests: [],
  homeArea: '',
  prefs: { remind: true, sms: true, offers: false },
  privacy: { personal: true, analytics: false },
  readNotes: [],
};

interface UserDataValue {
  extras: UserExtras;
  updateExtras: (patch: Partial<UserExtras>) => void;
  isSaved: (venueId: string) => boolean;
  toggleSaved: (venueId: string) => void;
  bookings: Appointment[];
  bookingsLoading: boolean;
  bookingsError: string | null;
  reloadBookings: () => void;
  patchBooking: (id: string, patch: Partial<Appointment>) => void;
}

const Ctx = createContext<UserDataValue | undefined>(undefined);

const keyFor = (uid: string | undefined) => `user:${uid ?? 'anon'}`;

export function UserDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.id;
  const [extras, setExtras] = useState<UserExtras>(() => ({ ...DEFAULTS, ...readLocal(keyFor(undefined), {}) }));
  const [bookings, setBookings] = useState<Appointment[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);

  // Switch stores on sign-in / out. Venues saved while signed out carry over.
  useEffect(() => {
    const anon = readLocal<Partial<UserExtras>>(keyFor(undefined), {});
    const mine = { ...DEFAULTS, ...readLocal<Partial<UserExtras>>(keyFor(uid), {}) };
    if (uid && anon.savedVenueIds?.length) {
      mine.savedVenueIds = Array.from(new Set([...mine.savedVenueIds, ...anon.savedVenueIds]));
      writeLocal(keyFor(uid), mine);
      writeLocal(keyFor(undefined), { ...anon, savedVenueIds: [] });
    }
    setExtras(mine);
  }, [uid]);

  const updateExtras = useCallback(
    (patch: Partial<UserExtras>) => {
      setExtras((prev) => {
        const next = { ...prev, ...patch };
        writeLocal(keyFor(uid), next);
        return next;
      });
    },
    [uid],
  );

  const toggleSaved = useCallback(
    (venueId: string) => {
      setExtras((prev) => {
        const ids = prev.savedVenueIds.includes(venueId)
          ? prev.savedVenueIds.filter((x) => x !== venueId)
          : [...prev.savedVenueIds, venueId];
        const next = { ...prev, savedVenueIds: ids };
        writeLocal(keyFor(uid), next);
        return next;
      });
    },
    [uid],
  );

  const reloadBookings = useCallback(() => {
    if (!uid) {
      setBookings([]);
      return;
    }
    setBookingsLoading(true);
    setBookingsError(null);
    fetchMyAppointments(uid)
      .then(setBookings)
      .catch((e) => setBookingsError(e?.message ?? 'Could not load bookings'))
      .finally(() => setBookingsLoading(false));
  }, [uid]);

  useEffect(reloadBookings, [reloadBookings]);

  const patchBooking = useCallback((id: string, patch: Partial<Appointment>) => {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }, []);

  const value = useMemo(
    () => ({
      extras,
      updateExtras,
      isSaved: (id: string) => extras.savedVenueIds.includes(id),
      toggleSaved,
      bookings,
      bookingsLoading,
      bookingsError,
      reloadBookings,
      patchBooking,
    }),
    [extras, updateExtras, toggleSaved, bookings, bookingsLoading, bookingsError, reloadBookings, patchBooking],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUserData(): UserDataValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useUserData must be used within UserDataProvider');
  return ctx;
}
