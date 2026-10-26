import { lazy, Suspense } from 'react';
import type { MapPin } from './LiveMap';

export type { MapPin };
export const MAPTILER_KEY: string = import.meta.env.VITE_MAPTILER_KEY || '';
const LiveMap = lazy(() => import('./LiveMap'));

/** Real map when VITE_MAPTILER_KEY is set; renders nothing otherwise (callers keep the placeholder). */
export function MapView({ pins, onPin }: { pins: MapPin[]; onPin: (id: string) => void }) {
  if (!MAPTILER_KEY) return null;
  return (
    <Suspense fallback={null}>
      <LiveMap pins={pins} apiKey={MAPTILER_KEY} onPin={onPin} />
    </Suspense>
  );
}
