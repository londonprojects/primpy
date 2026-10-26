import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
  title: string;
  example?: boolean;
  selected?: boolean;
}

/** MapLibre + MapTiler streets map. Lazy-loaded; only rendered when VITE_MAPTILER_KEY is set. */
export default function LiveMap({ pins, apiKey, onPin }: { pins: MapPin[]; apiKey: string; onPin: (id: string) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const onPinRef = useRef(onPin);
  onPinRef.current = onPin;

  useEffect(() => {
    if (!el.current) return;
    map.current = new maplibregl.Map({
      container: el.current,
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(apiKey)}`,
      center: [-0.1276, 51.5072],
      zoom: 11,
      attributionControl: { compact: true },
    });
    map.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [apiKey]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    markers.current.forEach((x) => x.remove());
    markers.current = pins.map((p) => {
      const b = document.createElement('button');
      b.className = `pin${p.selected ? ' on' : ''}`;
      b.style.position = 'static';
      b.title = p.title + (p.example ? ' (Example)' : '');
      b.textContent = p.example ? `${p.label} · Example` : p.label;
      b.onclick = (e) => {
        e.stopPropagation();
        onPinRef.current(p.id);
      };
      const wrap = document.createElement('div');
      wrap.style.zIndex = p.selected ? '3' : '1';
      wrap.appendChild(b);
      return new maplibregl.Marker({ element: wrap }).setLngLat([p.lng, p.lat]).addTo(m);
    });
    if (pins.length === 1) m.jumpTo({ center: [pins[0].lng, pins[0].lat], zoom: 14 });
    else if (pins.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      pins.forEach((p) => bounds.extend([p.lng, p.lat]));
      m.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 0 });
    }
  }, [pins]);

  return <div ref={el} style={{ position: 'absolute', inset: 0 }} />;
}
