import { deleteField, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { authReady, db } from '../firebase';

export interface VenueProfileForm {
  shopName: string;
  bio: string;
  phone: string;
  addressLine1: string;
  city: string;
  region: string;
  /** Customers may book now and pay when they arrive. */
  allowPayAtVenue: boolean;
  /** Deposit taken at booking, as a percentage of the total (0 = no deposit option). */
  depositPercent: number;
}

/**
 * A venue's public listing lives in `barberProfiles/{uid}`, shared with the Snip app.
 * `users/{uid}` is private to the owner; older Primpy venues kept their listing there, so it
 * is only read as a fallback until the venue saves again.
 */
const PROFILES = 'barberProfiles';

/** Editable treatment used in the business UI (numbers, not formatted strings). */
export interface TreatmentDraft {
  id: string;
  name: string;
  duration: number;
  price: number;
  /** Primpy category id used for grouping on the venue page. */
  category: string;
  description: string;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}
function parseNum(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** Load the signed-in venue's own profile for editing. */
export async function fetchVenueProfile(
  uid: string,
): Promise<{ profile: VenueProfileForm; treatments: TreatmentDraft[] }> {
  await authReady();
  const [profileSnap, userSnap] = await Promise.all([
    getDoc(doc(db, PROFILES, uid)),
    getDoc(doc(db, 'users', uid)),
  ]);
  const legacy = (userSnap.exists() ? userSnap.data() : {}) as Record<string, unknown>;
  const d = { ...legacy, ...((profileSnap.exists() ? profileSnap.data() : {}) as Record<string, unknown>) };
  const fraction = typeof d.depositFraction === 'number' ? d.depositFraction : 0;
  const rawServices = Array.isArray(d.barberServices) ? d.barberServices : [];
  const treatments: TreatmentDraft[] = rawServices.map((r, i) => {
    const o = (r ?? {}) as Record<string, unknown>;
    return {
      id: str(o.id) || `svc-${i}`,
      name: str(o.name),
      duration: parseNum(o.duration),
      price: parseNum(o.price),
      category: str(o.category),
      description: str(o.description),
    };
  });
  return {
    profile: {
      shopName: str(d.shopName) || str(d.displayName),
      bio: str(d.bio),
      phone: str(d.phone) || str(d.barberPhone),
      addressLine1: str(d.barberAddressLine1),
      city: str(d.barberAddressCity),
      region: str(d.barberAddressRegion),
      allowPayAtVenue: d.allowPayAtVenue === true,
      depositPercent: fraction > 0 && fraction <= 1 ? Math.round(fraction * 100) : 0,
    },
    treatments,
  };
}

export async function saveVenueProfile(uid: string, form: VenueProfileForm): Promise<void> {
  const pct = Math.min(100, Math.max(0, Math.round(form.depositPercent)));
  await setDoc(
    doc(db, PROFILES, uid),
    {
      shopName: form.shopName.trim(),
      bio: form.bio.trim(),
      phone: form.phone.trim(),
      barberAddressLine1: form.addressLine1.trim(),
      barberAddressCity: form.city.trim(),
      barberAddressRegion: form.region.trim(),
      allowPayAtVenue: form.allowPayAtVenue,
      // The Snip API reads depositFraction; deleteField() turns the deposit option off.
      depositFraction: pct > 0 ? pct / 100 : deleteField(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * Persist treatments as `barberServices`. Durations/prices are stored as
 * Snip-style strings ("45 min", "£40") so the data reads correctly in both apps;
 * `category` drives grouping on the venue page.
 */
export async function saveTreatments(uid: string, treatments: TreatmentDraft[]): Promise<void> {
  const barberServices = treatments
    .filter((t) => t.name.trim())
    .map((t) => ({
      id: t.id,
      name: t.name.trim(),
      duration: `${Math.max(0, Math.round(t.duration))} min`,
      price: `£${Math.max(0, Math.round(t.price))}`,
      category: t.category || '',
      description: t.description.trim(),
    }));
  await setDoc(doc(db, PROFILES, uid), { barberServices, updatedAt: serverTimestamp() }, { merge: true });
}

export function emptyTreatment(): TreatmentDraft {
  return { id: `svc-${Date.now()}`, name: '', duration: 30, price: 0, category: '', description: '' };
}
