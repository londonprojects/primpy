/**
 * Tiny localStorage wrapper for features that have no backend yet
 * (saved venues, preferences, inbox read state, wallet, reviews).
 * Every caller is marked TODO with the Firestore shape it should move to.
 */
const PREFIX = 'primpy:';

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage full or blocked — the feature just won't persist */
  }
}

export function removeLocal(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}
