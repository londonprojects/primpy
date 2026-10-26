import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

/**
 * Primpy connects to the SAME Firebase backend as the Snip app
 * (project: currentlyremote-snip). These are public web-config values;
 * data access is governed by the project's Firestore security rules.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || undefined,
};

export const app: FirebaseApp = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

/**
 * Snip's rules only allow `users` reads when signed in, so signed-out visitors
 * get a background anonymous (guest) session. The UI treats guests as signed out.
 * `authReady()` resolves once some user (guest or real) exists, or once the guest
 * sign-in has failed (e.g. Anonymous provider disabled), so callers never hang.
 */
let markReady: () => void = () => undefined;
const ready = new Promise<void>((resolve) => (markReady = resolve));
onAuthStateChanged(auth, (u) => {
  if (u) markReady();
  else signInAnonymously(auth).catch(() => markReady());
});
export const authReady = (): Promise<void> => ready;

export const API_BASE_URL: string = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
).replace(/\/+$/, '');
