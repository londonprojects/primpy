import { useCallback, useEffect, useState } from 'react';
import type { Venue } from '../types';
import { fetchVenue, fetchVenues } from '../services/venues';

export function useVenues() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((force = false) => {
    setLoading(true);
    setError(null);
    fetchVenues(force)
      .then(setVenues)
      .catch((e) => setError(e?.message ?? 'Could not load venues'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { venues, loading, error, retry: () => load(true) };
}

/** `venue` is null once loaded and not found. */
export function useVenue(id: string | undefined) {
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let live = true;
    setLoading(true);
    setError(null);
    fetchVenue(id)
      .then((v) => live && setVenue(v))
      .catch((e) => live && setError(e?.message ?? 'Could not load venue'))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [id]);

  return { venue, loading, error };
}
