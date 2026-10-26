import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchVenue } from '../services/venues';
import type { Venue } from '../types';
import { categoryById } from '../config/categories';
import StarRating from '../components/StarRating';
import Loading from '../components/Loading';

export default function VenuePage() {
  const { id } = useParams<{ id: string }>();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchVenue(id)
      .then((v) => {
        if (!v) setError('Venue not found');
        setVenue(v);
      })
      .catch((e) => setError(e?.message ?? 'Could not load venue'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading />;
  if (error || !venue)
    return (
      <div className="container center-state">
        {error ?? 'Venue not found'} · <Link to="/search">Browse venues</Link>
      </div>
    );

  return (
    <>
      <div className="container" style={{ paddingTop: 20 }}>
        <div className="venue-hero">
          <img src={venue.image} alt={venue.name} />
        </div>
      </div>

      <div className="container section" style={{ paddingTop: 28 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 32 }}>{venue.name}</h1>
          <div className="subtle" style={{ marginBottom: 8 }}>
            {venue.address}
          </div>
          <StarRating rating={venue.rating} count={venue.totalReviews} />
          <div className="chips" style={{ marginTop: 10 }}>
            {venue.categories.map((c) => (
              <span key={c} className="chip">
                {categoryById(c)?.name ?? c}
              </span>
            ))}
          </div>
        </div>

        <div className="detail-grid">
          <div>
            {venue.bio && (
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 22 }}>About</h2>
                <p className="subtle" style={{ lineHeight: 1.6 }}>
                  {venue.bio}
                </p>
              </div>
            )}

            <h2 style={{ fontSize: 22, marginBottom: 4 }}>Treatments</h2>
            {venue.treatments.length === 0 ? (
              <p className="subtle">This venue hasn’t listed treatments yet.</p>
            ) : (
              <div className="card" style={{ padding: '4px 22px' }}>
                {venue.treatments.map((t) => (
                  <div key={t.id} className="treatment-row">
                    <div>
                      <div className="t-name">{t.name}</div>
                      <div className="t-dur">
                        {t.duration} min{t.description ? ` · ${t.description}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span className="t-price">{t.price > 0 ? `£${t.price}` : '—'}</span>
                      <Link to={`/venue/${venue.id}/book/${t.id}`} className="btn btn-primary">
                        Book
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <aside className="card sticky-card">
            <h3 style={{ marginTop: 0 }}>Opening hours</h3>
            <p className="subtle" style={{ marginTop: 0 }}>
              Mon–Sat · 9:00 – 19:00
            </p>
            <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '16px 0' }} />
            <h3 style={{ marginTop: 0 }}>Location</h3>
            <p className="subtle">{venue.address}</p>
            {venue.treatments[0] && (
              <Link
                to={`/venue/${venue.id}/book/${venue.treatments[0].id}`}
                className="btn btn-primary btn-block"
                style={{ marginTop: 10 }}
              >
                Book now
              </Link>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
