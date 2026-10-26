import type { CSSProperties, ReactNode } from 'react';
import { useUi } from '../context/UiContext';

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  small,
  onWhite,
  style,
}: {
  options: [T, string][];
  value: T;
  onChange: (v: T) => void;
  small?: boolean;
  /** White track (over the map); the active option turns grey instead. */
  onWhite?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div className={`seg${small ? ' sm' : ''}${onWhite ? ' on-white' : ''}`} style={style}>
      {options.map(([id, label]) => (
        <button key={id} className={value === id ? 'on' : ''} onClick={() => onChange(id)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function ToggleRow({
  label,
  desc,
  on,
  onToggle,
  last,
}: {
  label: string;
  desc: string;
  on: boolean;
  onToggle: () => void;
  last?: boolean;
}) {
  return (
    <button className="toggle-row" role="switch" aria-checked={on} onClick={onToggle} style={last ? { borderBottom: 0 } : undefined}>
      <div style={{ flex: 1 }}>
        <div className="t-label">{label}</div>
        <div className="t-desc">{desc}</div>
      </div>
      <span className={`toggle${on ? ' on' : ''}`}>
        <i />
      </span>
    </button>
  );
}

export function Empty({ title, text, cta, onCta }: { title: string; text: string; cta: string; onCta: () => void }) {
  return (
    <div className="empty">
      <div className="empty-title">{title}</div>
      <p>{text}</p>
      <button className="btn btn-teal btn-sm h44" style={{ fontSize: 15 }} onClick={onCta}>
        {cta}
      </button>
    </div>
  );
}

export function ErrorCard({ title, text, onRetry }: { title: string; text: string; onRetry: () => void }) {
  return (
    <div className="error-card">
      <div className="empty-title">{title}</div>
      <p>{text}</p>
      <button className="btn btn-ink btn-sm h44" style={{ fontSize: 15 }} onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

/** "Log in to …" card shown on signed-in-only pages. */
export function LoginGate({ title, text }: { title: string; text: string }) {
  const { openAuth } = useUi();
  return (
    <div className="gate">
      <h1 className="h-gate">{title}</h1>
      <p>{text}</p>
      <button className="btn btn-teal h52" style={{ padding: '0 26px' }} onClick={() => openAuth()}>
        Log in
      </button>
    </div>
  );
}

/** Striped map placeholder. TODO(maps): plug in the map provider. */
export function MapPlaceholder({ label, style, children }: { label?: string; style?: CSSProperties; children?: ReactNode }) {
  return (
    <div className="map-ph" style={style}>
      {label && <div className="map-ph-label" style={{ height: '100%' }}>{label}</div>}
      {children}
    </div>
  );
}

export function ResultSkeleton() {
  return (
    <div style={{ display: 'flex', gap: 16, border: '1px solid var(--line)', borderRadius: 22, padding: 12 }}>
      <div className="sk" style={{ width: 150, height: 150, borderRadius: 16, flex: '0 0 auto' }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8 }}>
        <div className="sk" style={{ height: 18, width: '55%' }} />
        <div className="sk-2" style={{ height: 12, width: '80%' }} />
        <div className="sk-2" style={{ height: 12, width: '65%' }} />
        <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="sk" style={{ width: 64, height: 38, borderRadius: 10 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CardSkeleton({ width, imgHeight = 180 }: { width?: number; imgHeight?: number }) {
  return (
    <div className="vcard" style={width ? { flex: '0 0 auto', width } : undefined}>
      <div className="sk" style={{ height: imgHeight, borderRadius: 0 }} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="sk" style={{ height: 18, width: '60%' }} />
        <div className="sk-2" style={{ height: 12, width: '80%' }} />
      </div>
    </div>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="center-state">
      <div className="spinner" />
      {label}
    </div>
  );
}

export function BackLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button className="btn-back" onClick={onClick}>
      ← {children}
    </button>
  );
}
