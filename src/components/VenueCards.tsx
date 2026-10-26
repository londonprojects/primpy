import { useNavigate } from 'react-router-dom';
import type { Venue } from '../types';
import { categoryById } from '../config/categories';
import { fromPrice } from '../services/venues';
import { useUserData } from '../context/UserDataContext';
import { bookUrl, slotsLeftToday } from '../utils/booking';
import { money, todayISO } from '../utils/format';

export const ratingText = (v: Venue) => (v.rating ? v.rating.toFixed(1) : 'New');
export const fromText = (v: Venue) => {
  const p = fromPrice(v);
  return p ? money(p) : '—';
};
export const catText = (v: Venue) => v.categories.map((c) => categoryById(c)?.name ?? c).join(', ');

export function Heart({ venueId, size = 36 }: { venueId: string; size?: number }) {
  const { isSaved, toggleSaved } = useUserData();
  const on = isSaved(venueId);
  return (
    <button
      className="heart"
      title={on ? 'Remove from saved' : 'Save'}
      aria-pressed={on}
      onClick={(e) => {
        e.stopPropagation();
        toggleSaved(venueId);
      }}
      style={{ width: size, height: size, fontSize: size >= 40 ? 20 : 18, color: on ? 'var(--heart)' : 'var(--ink)' }}
    >
      {on ? '♥' : '♡'}
    </button>
  );
}

/** Today's next free times; tapping one jumps straight to booking with the first treatment. */
export function QuickSlots({ venue, pillStyle }: { venue: Venue; pillStyle?: React.CSSProperties }) {
  const navigate = useNavigate();
  const first = venue.treatments[0];
  const slots = first ? slotsLeftToday() : [];
  if (!slots.length) return <span className="none">No times left today</span>;
  return (
    <>
      {slots.map((t) => (
        <button
          key={t}
          className="slot-pill"
          style={pillStyle}
          onClick={() => navigate(bookUrl(venue.id, { t: [first.id], d: todayISO(), time: t }))}
        >
          {t}
        </button>
      ))}
    </>
  );
}

/** Image card with time pills — Home "Available today", Category and Saved. */
export function SlotCard({
  venue: v,
  width,
  imgHeight = 180,
  heart = true,
  ratingInMeta = false,
}: {
  venue: Venue;
  width?: number;
  imgHeight?: number;
  heart?: boolean;
  ratingInMeta?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <div className="vcard" style={width ? { flex: '0 0 auto', width } : undefined}>
      <div style={{ position: 'relative' }}>
        <button className="vcard-open" onClick={() => navigate(`/venue/${v.id}`)}>
          <div className="vcard-img" style={{ height: imgHeight }}>
            <img src={v.image} alt={v.name} loading="lazy" />
            {!ratingInMeta && (
              <span className="badge-white" style={{ position: 'absolute', left: 12, top: 12 }}>
                ★ {ratingText(v)}
              </span>
            )}
          </div>
          <div className="vcard-body">
            <div className="vcard-name">{v.name}</div>
            <div className="vcard-meta">
              {ratingInMeta && <>★ {ratingText(v)} · </>}
              {v.area} · from {fromText(v)}
            </div>
          </div>
        </button>
        {heart && <Heart venueId={v.id} />}
      </div>
      <div className="vcard-slots">
        <QuickSlots venue={v} />
      </div>
    </div>
  );
}

/** Square photo card — Home "Top rated in London". */
export function TopCard({ venue: v }: { venue: Venue }) {
  const navigate = useNavigate();
  const open = () => navigate(`/venue/${v.id}`);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ aspectRatio: '1 / 1', borderRadius: 22, overflow: 'hidden', background: 'var(--surface)', width: '100%', position: 'relative' }}>
        <button onClick={open} style={{ border: 0, padding: 0, width: '100%', height: '100%', background: 'none' }} aria-label={v.name}>
          <img src={v.image} alt={v.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </button>
        <span style={{ position: 'absolute', left: 12, bottom: 12, background: 'var(--ink)', color: '#fff', borderRadius: 999, padding: '6px 12px', fontSize: 13, fontWeight: 600 }}>
          from {fromText(v)}
        </span>
        <Heart venueId={v.id} size={40} />
      </div>
      <button onClick={open} style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', color: 'var(--ink)' }}>
        <div className="between" style={{ gap: 10, flexWrap: 'nowrap' }}>
          <span style={{ fontWeight: 700, fontSize: 17 }}>{v.name}</span>
          <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}>★ {ratingText(v)}</span>
        </div>
        <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>
          {v.area}
          {v.categories.length ? ` · ${catText(v)}` : ''}
        </div>
      </button>
    </div>
  );
}

/** Horizontal result row — Search. */
export function ResultRow({ venue: v }: { venue: Venue }) {
  const navigate = useNavigate();
  const open = () => navigate(`/venue/${v.id}`);
  const top = v.treatments
    .slice(0, 3)
    .map((t) => `${t.name} ${money(t.price)}`)
    .join(' · ');
  return (
    <div style={{ display: 'flex', gap: 16, border: '1px solid var(--line)', borderRadius: 22, padding: 12, flexWrap: 'wrap', background: '#fff' }}>
      <button onClick={open} style={{ flex: '0 0 auto', width: 150, height: 150, border: 0, padding: 0, borderRadius: 16, overflow: 'hidden', background: 'var(--surface)' }} aria-label={v.name}>
        <img src={v.image} alt={v.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </button>
      <div style={{ flex: '1 1 240px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6, padding: '4px 4px 4px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
          <button onClick={open} style={{ background: 'none', border: 0, padding: 0, fontWeight: 700, fontSize: 19, color: 'var(--ink)', textAlign: 'left' }}>
            {v.name}
          </button>
          <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}>
            ★ {ratingText(v)} <span style={{ color: 'var(--muted)', fontWeight: 500 }}>({v.totalReviews})</span>
          </span>
        </div>
        <div className="muted" style={{ fontSize: 14 }}>{v.address}</div>
        {top && <div style={{ fontSize: 14 }}>{top}</div>}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 'auto', paddingTop: 6 }}>
          <QuickSlots venue={v} pillStyle={{ height: 38, padding: '0 14px' }} />
        </div>
      </div>
    </div>
  );
}
