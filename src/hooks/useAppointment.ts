import { useEffect, useState } from 'react';
import type { Appointment } from '../types';
import { useUserData } from '../context/UserDataContext';
import { fetchAppointment } from '../services/appointments';

/** One of the user's appointments: from the loaded list, else fetched directly. */
export function useAppointment(id: string | undefined) {
  const { bookings, bookingsLoading } = useUserData();
  const fromList = bookings.find((b) => b.id === id);
  const [fetched, setFetched] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(!fromList);

  useEffect(() => {
    if (!id || fromList || bookingsLoading) return;
    let live = true;
    setLoading(true);
    fetchAppointment(id)
      .then((a) => live && setFetched(a))
      .catch(() => live && setFetched(null))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [id, fromList, bookingsLoading]);

  return { appointment: fromList ?? fetched, loading: !fromList && (loading || bookingsLoading) };
}
