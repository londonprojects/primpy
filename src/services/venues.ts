import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Treatment, Venue } from '../types';
import { categories, categoriesForText, categoryById } from '../config/categories';

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&q=70';

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}
function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/** Parse "$30", "£45", "45", "45.00", "from 30" → 30 (number). */
function parsePrice(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = String(v ?? '').replace(/[^0-9.]/g, '');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/** Parse "30 min", "1 hr", "90" → minutes. */
function parseDuration(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = String(v ?? '').toLowerCase();
  const hr = s.match(/([\d.]+)\s*(hr|hour)/);
  const min = s.match(/([\d.]+)\s*(min)/);
  if (hr) return Math.round(parseFloat(hr[1]) * 60) + (min ? parseInt(min[1], 10) : 0);
  if (min) return parseInt(min[1], 10);
  const n = parseInt(s.replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 30;
}

/** Group heading for a treatment: its own category, else the matching Primpy category. */
function treatmentGroup(o: Record<string, unknown>, name: string): string {
  const own = str(o.group) || str(o.category);
  if (own) return categoryById(own)?.name ?? own;
  const cat = categoriesForText(name, str(o.description))[0];
  return cat ? categoryById(cat)!.name : 'Treatments';
}

function mapTreatments(d: Record<string, unknown>): Treatment[] {
  const raw = d.barberServices;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r, i): Treatment | null => {
      if (!r || typeof r !== 'object') return null;
      const o = r as Record<string, unknown>;
      const name = str(o.name);
      if (!name) return null;
      return {
        id: str(o.id) || `svc-${i}`,
        name,
        duration: parseDuration(o.duration),
        price: parsePrice(o.price),
        description: str(o.description) || undefined,
        category: str(o.category) || undefined,
        group: treatmentGroup(o, name),
      };
    })
    .filter((t): t is Treatment => t !== null);
}

function formatAddress(d: Record<string, unknown>): { address: string; city: string; area: string } {
  const line1 = str(d.barberAddressLine1);
  const city = str(d.barberAddressCity);
  const region = str(d.barberAddressRegion);
  const cityRegion = [city, region].filter(Boolean).join(', ');
  const address = [line1, cityRegion].filter(Boolean).join(', ') || 'Address not listed';
  return { address, city: city || region || '', area: city || region || line1 || 'London' };
}

function venueImage(d: Record<string, unknown>): string {
  const logo = str(d.barberLogoDataUrl) || str(d.logoUrl);
  return logo || DEFAULT_IMAGE;
}

/** Hero first, then any `photos` on the doc, then category imagery as filler. */
function venuePhotos(d: Record<string, unknown>, image: string, cats: string[]): string[] {
  const own = Array.isArray(d.photos) ? d.photos.filter((p): p is string => typeof p === 'string') : [];
  const filler = (cats.length ? cats : categories.map((c) => c.id))
    .map((c) => categoryById(c)?.image)
    .filter((x): x is string => !!x);
  return Array.from(new Set([image, ...own, ...filler])).slice(0, 7);
}

/** Deposit as a fraction. Accepts `depositFraction` (0.2) or `depositPercent` (20). */
function depositFraction(d: Record<string, unknown>): number | undefined {
  const f = num(d.depositFraction);
  if (f != null && f > 0 && f < 1) return f;
  const p = num(d.depositPercent) ?? num(d.barberDepositPercent);
  if (p != null && p > 0 && p < 100) return p / 100;
  return undefined;
}

function mapVenue(id: string, d: Record<string, unknown>): Venue {
  const name = str(d.shopName) || str(d.displayName) || 'Beauty venue';
  const treatments = mapTreatments(d);
  const { address, city, area } = formatAddress(d);
  const bio = str(d.bio);
  const ratingRaw = num(d.barberAverageRating) ?? num(d.averageRating) ?? 0;
  const rating = Math.min(5, Math.max(0, ratingRaw));
  const totalReviews = Math.round(num(d.barberReviewCount) ?? num(d.totalReviews) ?? 0);
  const lat = num(d.barberLat);
  const lng = num(d.barberLng);

  const treatmentText = treatments.map((t) => `${t.name} ${t.description ?? ''}`).join(' ');
  const cats = categoriesForText(name, bio, treatmentText);
  const image = venueImage(d);

  return {
    id,
    name,
    tagline: treatments[0]?.name || bio.slice(0, 60) || 'Beauty & wellness',
    rating,
    totalReviews,
    image,
    photos: venuePhotos(d, image, cats),
    address,
    city,
    area,
    categories: cats,
    treatments,
    bio: bio || undefined,
    phone: str(d.phone) || str(d.barberPhone) || undefined,
    deposit: depositFraction(d),
    coordinate: lat != null && lng != null ? { latitude: lat, longitude: lng } : undefined,
  };
}

/** Cheapest non-zero treatment price, or 0. */
export function fromPrice(v: Venue): number {
  const prices = v.treatments.map((t) => t.price).filter((p) => p > 0);
  return prices.length ? Math.min(...prices) : 0;
}

let venuesCache: Promise<Venue[]> | null = null;

/** All bookable venues (providers) from the shared `users` collection. Cached per session. */
export function fetchVenues(force = false): Promise<Venue[]> {
  if (!venuesCache || force) {
    const q = query(collection(db, 'users'), where('role', 'in', ['barber', 'admin']));
    venuesCache = getDocs(q)
      .then((snap) =>
        snap.docs
          .map((docSnap) => mapVenue(docSnap.id, docSnap.data() as Record<string, unknown>))
          .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name)),
      )
      .catch((e) => {
        venuesCache = null;
        throw e;
      });
  }
  return venuesCache;
}

export async function fetchVenue(id: string): Promise<Venue | null> {
  const ref = doc(db, 'users', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, unknown>;
  if (data.role !== 'barber' && data.role !== 'admin') return null;
  return mapVenue(snap.id, data);
}
