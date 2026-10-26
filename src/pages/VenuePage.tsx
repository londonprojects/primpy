import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useVenue } from '../hooks/useVenues';
import { fetchVenueReviews } from '../services/stubs';
import { useUserData } from '../context/UserDataContext';
import type { Review, Treatment, Venue } from '../types';
import { ExampleBadge, ratingText } from '../components/VenueCards';
import FloatingBar, { BarSpacer } from '../components/FloatingBar';
import Gallery from '../components/Gallery';
import { MapPlaceholder, Spinner } from '../components/ui';
import { MAPTILER_KEY, MapView } from '../components/MapView';
import { CLOSING_TIME } from '../config/slots';
import { bookUrl, isClosed } from '../utils/booking';
import { fmtDur, money, todayISO } from '../utils/format';
import NotFoundPage from './NotFoundPage';

type Tab = 'treat' | 'reviews' | 'about' | 'map';
const TABS: [Tab, string][] = [
  ['treat', 'Treatments'],
  ['reviews', 'Reviews'],
  ['about', 'About'],
  ['map', 'Location'],
];
const AVATARS = ['#ffd98a', '#bfe3de', '#f6c9bd', '#d8dcf5'];

export default function VenuePage() {
  const { id } = useParams<{ id: string }>();
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const { venue, loading, error } = useVenue(id);
  const { isSaved, toggleSaved } = useUserData();
  const [tab, setTab] = useState<Tab>('treat');
  const [galOpen, setGalOpen] = useState(false);

  // Selection lives in the URL (?t=a,b) so Back from booking keeps it.
  const sel = (sp.get('t') ?? '').split(',').filter(Boolean);
  const toggle = (tid: string) => {
    const next = sel.includes(tid) ? sel.filter((x) => x !== tid) : [...sel, tid];
    const p = new URLSearchParams(sp);
    if (next.length) p.set('t', next.join(','));
    else p.delete('t');
    setSp(p, { replace: true });
  };

  if (loading) return <Spinner />;
  if (error)
    return (
      <div className="wrap" style={{ paddingTop: 32 }}>
        <div className="error-card">
          <div className="empty-title">We couldn't load this venue</div>
          <p>{error}</p>
          <button className="btn btn-ink btn-sm h44" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </div>
    );
  if (!venue) return <NotFoundPage />;

  const items = venue.treatments.filter((t) => sel.includes(t.id));
  const total = items.reduce((a, t) => a + t.price, 0);
  const dur = items.reduce((a, t) => a + t.duration, 0);
  const saved = isSaved(venue.id);
  const closedToday = isClosed(todayISO());

  return (
    <>
      <div className="wrap" style={{ paddingTop: 16 }}>
        <div className="photo-hero" style={{ height: 'clamp(300px,46vw,480px)' }}>
          <img src={venue.image} alt={venue.name} />
          <div className="scrim" style={{ background: 'linear-gradient(to top,rgba(8,14,12,.78) 0%,rgba(8,14,12,0) 55%)' }} />
          <button className="pill-white" style={{ position: 'absolute', left: 16, top: 16 }} onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/search'))}>
            ← Back
          </button>
          <div style={{ position: 'absolute', right: 16, top: 16, display: 'flex', gap: 8 }}>
            <button className="pill-white" onClick={() => setGalOpen(true)}>
              {venue.photos.length} photo{venue.photos.length === 1 ? '' : 's'}
            </button>
            <button
              className="pill-white"
              title={saved ? 'Remove from saved' : 'Save'}
              aria-pressed={saved}
              onClick={() => toggleSaved(venue.id)}
              style={{ width: 44, padding: 0, borderRadius: '50%', fontSize: 20, color: saved ? 'var(--heart)' : 'var(--ink)' }}
            >
              {saved ? '♥' : '♡'}
            </button>
          </div>
          <div className="hero-text">
            <div className="row" style={{ gap: 8, marginBottom: 12 }}>
              <span style={{ background: 'var(--amber)', color: 'var(--ink)', borderRadius: 999, padding: '5px 11px', fontSize: 13, fontWeight: 700 }}>
                ★ {ratingText(venue)} · {venue.totalReviews} reviews
              </span>
              <span style={{ background: 'rgba(255,255,255,.18)', borderRadius: 999, padding: '5px 11px', fontSize: 13, fontWeight: 600 }}>
                {closedToday ? 'Closed today' : `Open today · until ${CLOSING_TIME}`}
              </span>
            </div>
            <h1 className="h-venue">{venue.name}{venue.example && <ExampleBadge />}</h1>
            {venue.example && <div style={{ marginTop: 6, fontSize: 14, fontWeight: 600 }}>Example venue — not bookable</div>}
            <div style={{ marginTop: 10, fontSize: 16 }}>{venue.address}</div>
          </div>
        </div>
      </div>

      <div className="sticky-sub" style={{ marginTop: 16 }}>
        <div className="wrap hscroll" style={{ paddingTop: 10, paddingBottom: 10, gap: 6 }}>
          {TABS.map(([tid, label]) => (
            <button
              key={tid}
              onClick={() => setTab(tid)}
              style={{ flex: '0 0 auto', border: 0, borderRadius: 999, padding: '0 18px', height: 42, fontSize: 15, fontWeight: 600, background: tab === tid ? 'var(--ink)' : 'transparent', color: tab === tid ? '#fff' : 'var(--ink)' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 28, paddingBottom: 64 }}>
        {tab === 'treat' && <Treatments venue={venue} sel={sel} onToggle={toggle} />}
        {tab === 'reviews' && <Reviews venue={venue} />}
        {tab === 'about' && <About venue={venue} />}
        {tab === 'map' &&
          (MAPTILER_KEY && venue.coordinate ? (
            <MapPlaceholder style={{ height: 340 }}>
              <MapView
                pins={[{ id: venue.id, lat: venue.coordinate.latitude, lng: venue.coordinate.longitude, label: venue.name, title: venue.address, example: venue.example, selected: true }]}
                onPin={() => undefined}
              />
            </MapPlaceholder>
          ) : (
            <MapPlaceholder label={`map · ${venue.address}`} style={{ height: 340 }} />
          ))}
        {items.length > 0 && <BarSpacer />}
      </div>

      {items.length > 0 && (
        <FloatingBar
          maxWidth={880}
          title={`${items.length} treatment${items.length === 1 ? '' : 's'} · ${money(total)}`}
          sub={`${fmtDur(dur)} · ${venue.name}`}
          cta={venue.example ? 'Example venue — not bookable' : 'Choose time'}
          disabled={venue.example}
          onCta={() => !venue.example && navigate(bookUrl(venue.id, { t: sel }))}
        />
      )}
      {galOpen && <Gallery title={venue.name} photos={venue.photos} onClose={() => setGalOpen(false)} />}
    </>
  );
}

function Treatments({ venue, sel, onToggle }: { venue: Venue; sel: string[]; onToggle: (id: string) => void }) {
  const groups = useMemo(() => {
    const out: { name: string; items: Treatment[] }[] = [];
    venue.treatments.forEach((t) => {
      let g = out.find((x) => x.name === t.group);
      if (!g) out.push((g = { name: t.group, items: [] }));
      g.items.push(t);
    });
    return out;
  }, [venue]);

  if (!groups.length) return <p className="muted">This venue hasn’t listed treatments yet.</p>;

  return (
    <>
      {groups.map((g) => (
        <div key={g.name} style={{ marginBottom: 32 }}>
          <h3 className="h-card" style={{ marginBottom: 14 }}>{g.name}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,280px),1fr))', gap: 12 }}>
            {g.items.map((t) => {
              const on = sel.includes(t.id);
              return (
                <button
                  key={t.id}
                  aria-pressed={on}
                  onClick={() => onToggle(t.id)}
                  style={{ textAlign: 'left', background: on ? 'var(--teal-soft)' : '#fff', border: `2px solid ${on ? 'var(--teal)' : 'var(--line)'}`, borderRadius: 20, padding: 18, display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--ink)', minHeight: 150 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', width: '100%' }}>
                    <span style={{ fontWeight: 700, fontSize: 17 }}>{t.name}</span>
                    <span style={{ flex: '0 0 auto', width: 28, height: 28, borderRadius: '50%', border: `2px solid ${on ? 'var(--teal)' : 'var(--line)'}`, background: on ? 'var(--teal)' : '#fff', color: '#fff', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {on ? '✓' : ''}
                    </span>
                  </div>
                  {t.description && <span className="muted" style={{ fontSize: 14, lineHeight: 1.4 }}>{t.description}</span>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: 'auto', fontSize: 15 }}>
                    <span className="muted">{fmtDur(t.duration)}</span>
                    <span style={{ fontWeight: 700 }}>{t.price > 0 ? money(t.price) : '—'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

function relTime(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days < 1) return 'Today';
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${days < 14 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Reviews({ venue }: { venue: Venue }) {
  const reviews: Review[] = useMemo(() => fetchVenueReviews(venue.id), [venue.id]);
  const n = reviews.length;
  const dist = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    pct: n ? Math.round((reviews.filter((r) => r.rating === stars).length / n) * 100) : 0,
  }));
  const avg = (k: keyof Review['aspects']) => {
    const xs = reviews.map((r) => r.aspects[k]).filter((x) => x > 0);
    return xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : '–';
  };

  return (
    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div className="card" style={{ flex: '1 1 260px', maxWidth: 340, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span className="display" style={{ fontWeight: 800, fontSize: 56, letterSpacing: '-.03em', lineHeight: 1 }}>
            {ratingText(venue)}
          </span>
          <span className="muted" style={{ fontSize: 15 }}>{venue.totalReviews} reviews</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
          {dist.map((d) => (
            <div key={d.stars} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
              <span style={{ width: 28, fontWeight: 700 }}>{d.stars}★</span>
              <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--surface)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${d.pct}%`, background: 'var(--amber)', borderRadius: 999 }} />
              </div>
              <span className="muted" style={{ width: 36, textAlign: 'right' }}>{d.pct}%</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--hair)' }}>
          {(
            [
              ['Cleanliness', 'clean'],
              ['Value', 'value'],
              ['Punctuality', 'punct'],
            ] as const
          ).map(([label, k]) => (
            <div key={k} className="sum-row" style={{ fontSize: 14 }}>
              <span className="muted">{label}</span>
              <span style={{ fontWeight: 700 }}>{avg(k)}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: '1 1 420px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {n === 0 && <p className="muted" style={{ margin: 0, fontSize: 15 }}>Written reviews will appear here after people visit.</p>}
        {reviews.map((r, i) => (
          <div key={r.id} style={{ padding: '20px 0', borderBottom: '1px solid var(--line)', display: 'flex', gap: 14 }}>
            <span style={{ flex: '0 0 auto', width: 42, height: 42, borderRadius: '50%', background: AVATARS[i % 4], fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {r.authorName[0]}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="between" style={{ gap: 10 }}>
                <span style={{ fontWeight: 700 }}>{r.authorName}</span>
                <span className="muted" style={{ fontSize: 13 }}>{relTime(r.createdAt)}</span>
              </div>
              <div style={{ fontSize: 13, marginTop: 2 }}>
                <span style={{ color: 'var(--amber)', letterSpacing: 1 }}>{'★★★★★'.slice(0, r.rating) + '☆☆☆☆☆'.slice(0, 5 - r.rating)}</span>{' '}
                <span className="muted">· {r.treatment}</span>
              </div>
              {r.text && <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.5, textWrap: 'pretty' }}>{r.text}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function About({ venue }: { venue: Venue }) {
  return (
    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
      <p style={{ flex: '1 1 420px', fontSize: 20, lineHeight: 1.5, margin: 0, textWrap: 'pretty' }}>
        {venue.bio ?? `${venue.name} hasn’t written a description yet.`}
      </p>
      <div className="card" style={{ flex: '1 1 280px', padding: 20, borderRadius: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Opening hours</div>
        <div className="sum-row" style={{ padding: '8px 0', borderBottom: '1px solid var(--hair)', fontSize: 15 }}>
          <span>Mon – Sat</span>
          <span>9:00 – {CLOSING_TIME}</span>
        </div>
        <div className="sum-row muted" style={{ padding: '8px 0', fontSize: 15 }}>
          <span>Sunday</span>
          <span>Closed</span>
        </div>
      </div>
    </div>
  );
}
