import { useEffect, useState } from 'react';

/** Full-screen photo viewer with arrows and a thumbnail strip. */
export default function Gallery({ title, photos, onClose }: { title: string; photos: string[]; onClose: () => void }) {
  const [i, setI] = useState(0);
  const n = photos.length;
  const prev = () => setI((x) => (x + n - 1) % n);
  const next = () => setI((x) => (x + 1) % n);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setI((x) => (x + n - 1) % n);
      if (e.key === 'ArrowRight') setI((x) => (x + 1) % n);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [n, onClose]);

  const round = { flex: '0 0 auto', width: 48, height: 48, borderRadius: '50%', border: 0, background: '#1d2725', color: '#fff', fontSize: 20 } as const;

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 45, background: '#0a0f0e', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div className="between" style={{ padding: '14px var(--gutter)', flexWrap: 'nowrap' }}>
        <div>
          <div style={{ fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: 13, color: '#9aa7a4' }}>
            {i + 1} / {n}
          </div>
        </div>
        <button title="Close" onClick={onClose} style={{ ...round, width: 44, height: 44, fontSize: 22 }}>
          ×
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '0 clamp(8px,2vw,24px)' }}>
        <button title="Previous" onClick={prev} style={round}>
          ‹
        </button>
        <img src={photos[i]} alt="" style={{ flex: 1, minWidth: 0, height: '100%', maxHeight: 'calc(100vh - 200px)', objectFit: 'contain' }} />
        <button title="Next" onClick={next} style={round}>
          ›
        </button>
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '14px var(--gutter) 20px', justifyContent: 'center' }}>
        {photos.map((src, k) => (
          <button
            key={src}
            onClick={() => setI(k)}
            style={{ flex: '0 0 auto', width: 72, height: 56, borderRadius: 10, overflow: 'hidden', border: `2px solid ${k === i ? '#fff' : 'transparent'}`, padding: 0, background: 'none', opacity: k === i ? 1 : 0.6 }}
          >
            <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </button>
        ))}
      </div>
    </div>
  );
}
