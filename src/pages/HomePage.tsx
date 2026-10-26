import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { categories } from '../config/categories';
import { fetchVenues } from '../services/venues';
import type { Venue } from '../types';
import VenueCard from '../components/VenueCard';
import Loading from '../components/Loading';

export default function HomePage() {
  const navigate = useNavigate();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [term, setTerm] = useState('');
  const [place, setPlace] = useState('');

  useEffect(() => {
    fetchVenues()
      .then(setVenues)
      .catch((e) => setError(e?.message ?? 'Could not load venues'))
      .finally(() => setLoading(false));
  }, []);

  const featured = useMemo(() => venues.slice(0, 6), [venues]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (term) params.set('q', term);
    if (place) params.set('place', place);
    navigate(`/search?${params.toString()}`);
  };

  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>Book beauty &amp; wellness, wherever you are</h1>
          <p>Hair, nails, massage, facials and spa — reserve top-rated venues near you in seconds.</p>
          <form className="search-bar" onSubmit={submit}>
            <div className="search-field">
              <span className="search-icon">🔍</span>
              <input
                placeholder="Treatment or venue"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
            </div>
            <div className="search-field">
              <span className="search-icon">📍</span>
              <input
                placeholder="Current location"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" type="submit" style={{ flex: '0 0 auto' }}>
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Browse by treatment</h2>
          </div>
          <div className="cat-grid">
            {categories.map((c) => (
              <Link key={c.id} to={`/search?category=${c.id}`} className="cat-card">
                <img src={c.image} alt={c.name} loading="lazy" />
                <div className="label">
                  <span>{c.emoji}</span>
                  {c.name}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--bg-soft)' }}>
        <div className="container">
          <div className="section-head">
            <h2>Recommended venues</h2>
            <Link to="/search">See all →</Link>
          </div>
          {loading ? (
            <Loading label="Finding venues near you…" />
          ) : error ? (
            <div className="alert alert-error">{error}</div>
          ) : featured.length === 0 ? (
            <div className="center-state">No venues yet — check back soon.</div>
          ) : (
            <div className="venue-grid">
              {featured.map((v) => (
                <VenueCard key={v.id} venue={v} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
