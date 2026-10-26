import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Venue } from '../types';
import { fromText, ratingText } from './VenueCards';
import { MapPlaceholder } from './ui';

/**
 * Price-pin map of search results.
 * TODO(maps): replace the striped placeholder with the map provider; the pins
 * already use real coordinates when venues have `barberLat` / `barberLng`.
 */
export default function MapPanel({
  venues,
  selected,
  onSelect,
  style,
  toolbar,
}: {
  venues: Venue[];
  selected: string | null;
  onSelect: (id: string) => void;
  style?: React.CSSProperties;
  toolbar?: React.ReactNode;
}) {
  const navigate = useNavigate();

  const pins = useMemo(() => {
    const withCoords = venues.filter((v) => v.coordinate);
    const lats = withCoords.map((v) => v.coordinate!.latitude);
    const lngs = withCoords.map((v) => v.coordinate!.longitude);
    const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
    return venues.map((v) => {
      let left: number;
      let top: number;
      if (v.coordinate && withCoords.length > 1 && maxLat > minLat && maxLng > minLng) {
        left = 10 + ((v.coordinate.longitude - minLng) / (maxLng - minLng)) * 70;
        top = 12 + ((maxLat - v.coordinate.latitude) / (maxLat - minLat)) * 50;
      } else {
        // Stable pseudo-position from the id until coordinates exist.
        const h = Array.from(v.id).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
        left = 10 + (h % 70);
        top = 12 + ((h >> 8) % 50);
      }
      return { v, left, top };
    });
  }, [venues]);

  const sel = venues.find((v) => v.id === selected) ?? venues[0];

  return (
    <MapPlaceholder style={style}>
      <div style={{ position: 'absolute', left: 14, top: 12, fontFamily: 'ui-monospace,monospace', fontSize: 12, color: 'var(--muted)' }}>map tiles</div>
      {toolbar}
      {pins.map(({ v, left, top }) => (
        <button key={v.id} className={`pin${v.id === sel?.id ? ' on' : ''}`} style={{ left: `${left}%`, top: `${top}%` }} onClick={() => onSelect(v.id)}>
          {fromText(v)}
        </button>
      ))}
      {sel && (
        <div style={{ position: 'absolute', left: 12, right: 12, bottom: 12, zIndex: 5, background: '#fff', borderRadius: 18, padding: 10, display: 'flex', gap: 12, alignItems: 'center', boxShadow: '0 10px 30px -10px rgba(0,0,0,.3)' }}>
          <img src={sel.image} alt="" style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover', flex: '0 0 auto' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{sel.name}</div>
            <div className="muted" style={{ fontSize: 13 }}>
              ★ {ratingText(sel)} · {sel.area} · from {fromText(sel)}
            </div>
          </div>
          <button className="btn btn-teal btn-sm h42 btn-bold" onClick={() => navigate(`/venue/${sel.id}`)}>
            View
          </button>
        </div>
      )}
    </MapPlaceholder>
  );
}
