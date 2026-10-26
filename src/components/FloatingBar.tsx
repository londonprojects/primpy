import type { ReactNode } from 'react';
import { useNarrow } from '../hooks/useMedia';

/** Ink action bar pinned to the bottom (above the tab bar on narrow screens). */
export default function FloatingBar({
  title,
  sub,
  cta,
  onCta,
  disabled,
  maxWidth = 780,
}: {
  title: ReactNode;
  sub: ReactNode;
  cta: ReactNode;
  onCta: () => void;
  disabled?: boolean;
  maxWidth?: number;
}) {
  const narrow = useNarrow();
  return (
    <div className="fbar" style={{ bottom: narrow ? 68 : 0 }}>
      <div className="fbar-inner" style={{ maxWidth }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="fbar-title">{title}</div>
          <div className="fbar-sub">{sub}</div>
        </div>
        <button className="fbar-cta" disabled={disabled} onClick={onCta}>
          {cta}
        </button>
      </div>
    </div>
  );
}

/** Leaves room at the end of a page so content clears the floating bar. */
export function BarSpacer() {
  return <div style={{ height: 96 }} />;
}
