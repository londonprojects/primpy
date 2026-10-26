import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { categories } from '../config/categories';
import { useVenues } from '../hooks/useVenues';
import { SlotCard, TopCard } from '../components/VenueCards';
import { CardSkeleton, ErrorCard } from '../components/ui';
import { slotsLeftToday } from '../utils/booking';

type When = 'any' | 'today' | 'tomorrow' | 'weekend';
const WHEN: [When, string][] = [
  ['any', 'Any time'],
  ['today', 'Today'],
  ['tomorrow', 'Tomorrow'],
  ['weekend', 'This weekend'],
];

const sectionStyle = { paddingTop: 48 };

export default function HomePage() {
  const navigate = useNavigate();
  const { venues, loading, error, retry } = useVenues();
  const [q, setQ] = useState('');
  const [area, setArea] = useState('');
  const [when, setWhen] = useState<When>('any');

  const search = (e?: React.FormEvent) => {
    e?.preventDefault();
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (area.trim()) p.set('area', area.trim());
    if (when !== 'any') p.set('when', when);
    navigate(`/search?${p.toString()}`);
  };

  const today = slotsLeftToday().length ? venues.filter((v) => v.treatments.length).slice(0, 8) : [];
  const top = venues.slice(0, 9);

  return (
    <>
      <section className="wrap" style={{ paddingTop: 20 }}>
        <div style={{ background: 'var(--teal)', borderRadius: 32, padding: 'clamp(28px,6vw,72px)', color: '#fff', display: 'flex', flexDirection: 'column', gap: 28, position: 'relative', overflow: 'hidden' }}>
          <div className="circle-deco" style={{ right: -80, top: -80, width: 320, height: 320, opacity: 0.9 }} />
          <h1 className="h-hero" style={{ position: 'relative', maxWidth: 760 }}>
            Glow up, on your schedule.
          </h1>
          <p style={{ position: 'relative', margin: 0, fontSize: 19, maxWidth: 520, lineHeight: 1.45, color: 'var(--teal-soft)' }}>
            Hair, nails, massage, facials and spa. See real availability and book in two taps.
          </p>
          <form onSubmit={search} style={{ position: 'relative', background: '#fff', borderRadius: 20, padding: 8, display: 'flex', flexWrap: 'wrap', gap: 8, maxWidth: 820 }}>
            <input className="input h56" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Treatment or venue" style={{ flex: '2 1 220px', width: 'auto', border: 0, borderRadius: 14, padding: '0 18px' }} />
            <input className="input h56" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Area" style={{ flex: '1 1 140px', width: 'auto', border: 0, borderRadius: 14, padding: '0 18px' }} />
            <button className="btn btn-ink h56" style={{ flex: '1 0 auto', padding: '0 28px' }}>
              Find a slot
            </button>
          </form>
          <div style={{ position: 'relative', display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: -12 }}>
            {WHEN.map(([id, label]) => {
              const on = when === id;
              return (
                <button
                  key={id}
                  onClick={() => setWhen(id)}
                  style={{ border: `1px solid ${on ? '#fff' : 'rgba(255,255,255,.45)'}`, background: on ? '#fff' : 'transparent', color: on ? 'var(--ink)' : '#fff', borderRadius: 999, padding: '9px 16px', fontSize: 14, fontWeight: 600 }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="wrap" style={{ paddingTop: 40 }}>
        <div className="hscroll" style={{ gap: 18, paddingBottom: 8 }}>
          {categories.map((c) => (
            <button key={c.id} onClick={() => navigate(`/c/${c.id}`)} style={{ flex: '0 0 auto', width: 96, background: 'none', border: 0, padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: 'var(--ink)' }}>
              <img src={c.image} alt={c.name} style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', border: '3px solid #fff', boxShadow: '0 0 0 2px var(--line)' }} />
              <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>{c.name}</span>
            </button>
          ))}
        </div>
      </section>

      {error ? (
        <section className="wrap" style={sectionStyle}>
          <ErrorCard title="We couldn't load venues" text="Check your connection and try again." onRetry={retry} />
        </section>
      ) : (
        <>
          {(loading || today.length > 0) && (
            <section className="wrap" style={sectionStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 18 }}>
                <h2 className="h-section">Available today</h2>
                <button className="btn-text" onClick={() => navigate('/search?when=today')}>
                  See all
                </button>
              </div>
              <div className="hscroll" style={{ gap: 16, paddingBottom: 12 }}>
                {loading
                  ? [0, 1, 2, 3].map((i) => <CardSkeleton key={i} width={290} imgHeight={160} />)
                  : today.map((v) => <SlotCard key={v.id} venue={v} width={290} imgHeight={160} heart={false} />)}
              </div>
            </section>
          )}

          <section className="wrap" style={{ paddingTop: 40, paddingBottom: 80 }}>
            <h2 className="h-section" style={{ marginBottom: 18 }}>
              Top rated in London
            </h2>
            <div className="grid-cards">
              {loading
                ? [0, 1, 2].map((i) => <CardSkeleton key={i} />)
                : top.map((v) => <TopCard key={v.id} venue={v} />)}
            </div>
          </section>
        </>
      )}

      <section className="wrap" style={{ paddingBottom: 80 }}>
        <div style={{ background: 'var(--amber)', borderRadius: 28, padding: 'clamp(24px,5vw,48px)', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px' }}>
            <h2 className="display" style={{ fontWeight: 800, fontSize: 'clamp(28px,4vw,44px)', letterSpacing: '-.03em', lineHeight: 1, margin: 0 }}>
              Give someone a glow-up
            </h2>
            <p style={{ margin: '10px 0 0', fontSize: 16, color: '#3d2c00' }}>
              Digital gift cards, delivered by email. Usable at any Primpy venue.
            </p>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn btn-ink h52 btn-bold" onClick={() => navigate('/gift')}>
              Buy a gift card
            </button>
            <button className="btn h52" style={{ border: '1px solid var(--ink)', background: 'transparent' }} onClick={() => navigate('/help')}>
              Help &amp; policies
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
