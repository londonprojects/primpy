import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { categories, categoryById } from '../config/categories';
import { useVenues } from '../hooks/useVenues';
import { useNarrow } from '../hooks/useMedia';
import { fromPrice } from '../services/venues';
import { ResultRow } from '../components/VenueCards';
import MapPanel from '../components/MapPanel';
import { ErrorCard, ResultSkeleton, Segmented } from '../components/ui';

type Sort = 'rating' | 'price';
const WHEN_LABEL: Record<string, string> = { today: 'today', tomorrow: 'tomorrow', weekend: 'this weekend' };

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const narrow = useNarrow();
  const { venues, loading, error, retry } = useVenues();

  const category = params.get('category') ?? '';
  const sort: Sort = params.get('sort') === 'price' ? 'price' : 'rating';
  const when = params.get('when') ?? '';
  const [q, setQ] = useState(params.get('q') ?? '');
  const [area, setArea] = useState(params.get('area') ?? '');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [mapSel, setMapSel] = useState<string | null>(null);
  const [settling, setSettling] = useState(false);
  const timer = useRef<number>(undefined);

  const setParam = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  // Typing updates the URL after a pause.
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (q !== (params.get('q') ?? '') || area !== (params.get('area') ?? '')) setParam({ q, area });
    }, 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, area]);

  // Brief skeleton whenever the filters change.
  const filterKey = `${params.get('q')}|${params.get('area')}|${category}|${sort}`;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSettling(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSettling(false), 700);
    return () => window.clearTimeout(timer.current);
  }, [filterKey]);

  const results = useMemo(() => {
    const ql = (params.get('q') ?? '').toLowerCase().trim();
    const al = (params.get('area') ?? '').toLowerCase().trim();
    const out = venues.filter((v) => {
      if (category && !v.categories.includes(category)) return false;
      if (al && !`${v.address} ${v.city} ${v.area}`.toLowerCase().includes(al)) return false;
      if (ql) {
        const hay = [v.name, v.bio, ...v.treatments.map((t) => t.name), ...v.categories.map((c) => categoryById(c)?.name)]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    });
    return sort === 'price'
      ? out.sort((a, b) => (fromPrice(a) || Infinity) - (fromPrice(b) || Infinity))
      : out.sort((a, b) => b.rating - a.rating);
  }, [venues, params, category, sort]);

  const busy = loading || settling;
  const urlArea = params.get('area');
  const count =
    `${results.length} venue${results.length === 1 ? '' : 's'}` +
    (category ? ` for ${categoryById(category)?.name ?? category}` : '') +
    (urlArea ? ` in ${urlArea}` : '') +
    (WHEN_LABEL[when] ? ` · ${WHEN_LABEL[when]}` : '');

  const showList = !narrow || view === 'list';
  const showMap = !narrow || view === 'map';
  const viewToggle = <Segmented small options={[['list', 'List'], ['map', 'Map']]} value={view} onChange={setView} />;

  return (
    <>
      <div className="sticky-sub">
        <div className="wrap" style={{ paddingTop: 14, paddingBottom: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="row" style={{ gap: 8 }}>
            <input className="input h48" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Treatment or venue" style={{ flex: '2 1 220px', width: 'auto', padding: '0 16px' }} />
            <input className="input h48" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Area" style={{ flex: '1 1 140px', width: 'auto', padding: '0 16px' }} />
            <Segmented options={[['rating', 'Top rated'], ['price', 'Cheapest']]} value={sort} onChange={(s) => setParam({ sort: s === 'price' ? 'price' : '' })} />
          </div>
          <div className="hscroll" style={{ gap: 8 }}>
            {[{ id: '', name: 'All' }, ...categories].map((c) => (
              <button key={c.id} className={`chip${category === c.id ? ' on' : ''}`} onClick={() => setParam({ category: c.id })}>
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 64, display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {showList && (
          <div style={{ flex: '1 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="between">
              <div className="display" style={{ fontWeight: 700, fontSize: 24, letterSpacing: '-.01em' }}>
                {busy ? 'Searching…' : count}
              </div>
              {narrow && viewToggle}
            </div>
            {error ? (
              <ErrorCard title="We couldn't load venues" text="Check your connection and try again. Your filters are saved." onRetry={retry} />
            ) : busy ? (
              [0, 1, 2].map((i) => <ResultSkeleton key={i} />)
            ) : results.length === 0 ? (
              <div className="empty">
                <div className="empty-title">No venues match</div>
                <p>Try another treatment or area.</p>
                <button
                  className="btn btn-ink btn-sm h44"
                  style={{ fontSize: 15 }}
                  onClick={() => {
                    setQ('');
                    setArea('');
                    setParams(new URLSearchParams(), { replace: true });
                  }}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              results.map((v) => <ResultRow key={v.id} venue={v} />)
            )}
          </div>
        )}
        {showMap && (
          <MapPanel
            venues={busy ? [] : results}
            selected={mapSel}
            onSelect={setMapSel}
            toolbar={narrow ? <Segmented small onWhite options={[['list', 'List'], ['map', 'Map']]} value={view} onChange={setView} style={{ position: 'absolute', right: 12, top: 12, zIndex: 4, boxShadow: '0 4px 12px rgba(0,0,0,.08)' }} /> : undefined}
            style={{ flex: '1 1 380px', position: 'sticky', top: 200, height: narrow ? '60vh' : 'calc(100vh - 230px)', minHeight: 360 }}
          />
        )}
      </div>
    </>
  );
}
