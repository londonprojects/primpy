import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { categories } from '../config/categories';
import { fetchVenues } from '../services/venues';
import type { Venue } from '../types';
import VenueCard from '../components/VenueCard';
import Loading from '../components/Loading';

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const q = params.get('q')?.toLowerCase() ?? '';
  const place = params.get('place')?.toLowerCase() ?? '';
  const category = params.get('category') ?? '';

  useEffect(() => {
    fetchVenues()
      .then(setVenues)
      .catch((e) => setError(e?.message ?? 'Could not load venues'))
      .finally(() => setLoading(false));
  }, []);

  const results = useMemo(() => {
    return venues.filter((v) => {
      if (category && !v.categories.includes(category)) return false;
      if (place && !`${v.address} ${v.city}`.toLowerCase().includes(place)) return false;
      if (q) {
        const hay = [v.name, v.tagline, v.bio, ...v.treatments.map((t) => t.name)]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [venues, q, place, category]);

  const setCategory = (id: string) => {
    const next = new URLSearchParams(params);
    if (id) next.set('category', id);
    else next.delete('category');
    setParams(next);
  };

  return (
    <div className="container section">
      <div className="section-head">
        <div>
          <h2 style={{ marginBottom: 4 }}>
            {results.length} venue{results.length === 1 ? '' : 's'}
            {category ? ` · ${categories.find((c) => c.id === category)?.name}` : ''}
          </h2>
          {(q || place) && (
            <div className="subtle">
              {q && <>Matching “{q}” </>}
              {place && <>near “{place}”</>}
            </div>
          )}
        </div>
        <Link to="/" className="subtle">
          ← Home
        </Link>
      </div>

      <div className="chips" style={{ marginBottom: 24 }}>
        <button
          className="chip"
          style={!category ? { background: 'var(--teal)', color: '#fff' } : undefined}
          onClick={() => setCategory('')}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            className="chip"
            style={category === c.id ? { background: 'var(--teal)', color: '#fff' } : undefined}
            onClick={() => setCategory(c.id)}
          >
            {c.emoji} {c.name}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading />
      ) : error ? (
        <div className="alert alert-error">{error}</div>
      ) : results.length === 0 ? (
        <div className="center-state">No venues match your search. Try a different treatment or area.</div>
      ) : (
        <div className="venue-grid">
          {results.map((v) => (
            <VenueCard key={v.id} venue={v} />
          ))}
        </div>
      )}
    </div>
  );
}
