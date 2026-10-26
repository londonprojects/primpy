import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { categoryById } from '../config/categories';
import { useVenues } from '../hooks/useVenues';
import { SlotCard } from '../components/VenueCards';
import { CardSkeleton, Empty, ErrorCard } from '../components/ui';
import { money } from '../utils/format';
import NotFoundPage from './NotFoundPage';

export default function CategoryPage() {
  const { category = '' } = useParams();
  const navigate = useNavigate();
  const cat = categoryById(category);
  const { venues, loading, error, retry } = useVenues();

  const catVenues = useMemo(() => venues.filter((v) => v.categories.includes(category)), [venues, category]);

  // Cheapest venue price per treatment name.
  const popular = useMemo(() => {
    const map = new Map<string, number>();
    catVenues.forEach((v) =>
      v.treatments.forEach((t) => {
        if (t.price > 0 && (!map.has(t.name) || map.get(t.name)! > t.price)) map.set(t.name, t.price);
      }),
    );
    return Array.from(map.entries()).slice(0, 8);
  }, [catVenues]);

  if (!cat) return <NotFoundPage />;

  return (
    <>
      <div className="wrap" style={{ paddingTop: 16 }}>
        <div className="photo-hero" style={{ height: 'clamp(240px,34vw,360px)' }}>
          <img src={cat.image} alt={cat.name} />
          <div className="scrim" style={{ background: 'linear-gradient(to top,rgba(8,14,12,.8) 0%,rgba(8,14,12,0) 60%)' }} />
          <button className="pill-white" style={{ position: 'absolute', left: 16, top: 16 }} onClick={() => navigate('/')}>
            ← Explore
          </button>
          <div className="hero-text">
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--teal-soft)', marginBottom: 8 }}>
              {loading ? '…' : `${catVenues.length} venue${catVenues.length === 1 ? '' : 's'}`} in London
            </div>
            <h1 className="h-venue">{cat.name}</h1>
            <p style={{ margin: '10px 0 0', fontSize: 17, maxWidth: 560 }}>{cat.blurb}</p>
          </div>
        </div>
      </div>
      <div className="wrap" style={{ paddingTop: 32, paddingBottom: 64 }}>
        {popular.length > 0 && (
          <>
            <h2 className="h-card" style={{ fontSize: 24, marginBottom: 14 }}>
              Popular treatments
            </h2>
            <div className="row" style={{ gap: 8, marginBottom: 40 }}>
              {popular.map(([name, price]) => (
                <button
                  key={name}
                  onClick={() => navigate(`/search?q=${encodeURIComponent(name)}`)}
                  style={{ border: '1px solid var(--line)', background: '#fff', borderRadius: 14, padding: '12px 16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, color: 'var(--ink)' }}
                >
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{name}</span>
                  <span className="muted" style={{ fontSize: 13 }}>from {money(price)}</span>
                </button>
              ))}
            </div>
          </>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 18 }}>
          <h2 className="h-card" style={{ fontSize: 24 }}>Venues</h2>
          <button className="btn-text" onClick={() => navigate(`/search?category=${cat.id}`)}>
            Filter &amp; map
          </button>
        </div>
        {error ? (
          <ErrorCard title="We couldn't load venues" text="Check your connection and try again." onRetry={retry} />
        ) : loading ? (
          <div className="grid-cards">
            {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
          </div>
        ) : catVenues.length === 0 ? (
          <Empty title={`No ${cat.name.toLowerCase()} venues yet`} text="Try another category or search everything." cta="Explore venues" onCta={() => navigate('/search')} />
        ) : (
          <div className="grid-cards">
            {catVenues.map((v) => (
              <SlotCard key={v.id} venue={v} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
