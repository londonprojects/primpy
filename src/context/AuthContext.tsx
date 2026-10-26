import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  applyActionCode,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  deleteUser,
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile as fbUpdateProfile,
  verifyBeforeUpdateEmail,
  verifyPasswordResetCode,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { AppUser, UserRole } from '../types';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AppUser>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    opts?: { role?: UserRole; shopName?: string },
  ) => Promise<void>;
  /** Returns true when this created a new Primpy account. */
  signInWithSocial: (provider: 'google' | 'apple') => Promise<boolean>;
  /** Applies an emailed verify-email action code. */
  applyEmailCode: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  checkResetCode: (code: string) => Promise<string>;
  completeReset: (code: string, password: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  /** Re-reads the Firebase user; returns whether the email is now verified. */
  refreshVerified: () => Promise<boolean>;
  updateProfile: (patch: { displayName?: string; email?: string }) => Promise<{ emailPending: boolean }>;
  /** `beforeDelete` runs only once we know deletion will be allowed. */
  deleteAccount: (beforeDelete?: () => Promise<void>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Where Firebase's emailed links send people (set the same URL in the console's email templates). */
const actionSettings = () => ({ url: `${window.location.origin}/` });

async function loadProfile(fbUser: FirebaseUser): Promise<AppUser> {
  const ref = doc(db, 'users', fbUser.uid);
  const snap = await getDoc(ref);
  const data = snap.exists() ? (snap.data() as Record<string, unknown>) : {};
  return {
    id: fbUser.uid,
    email: fbUser.email ?? '',
    displayName: (data.displayName as string) || fbUser.displayName || fbUser.email || 'Guest',
    role: ((data.role as UserRole) || 'customer') as UserRole,
    avatar: (data.avatar as string) || undefined,
    // Social providers verify the address themselves.
    emailVerified:
      fbUser.emailVerified || fbUser.providerData.some((p) => p.providerId !== 'password'),
  };
}

/**
 * Create a matching `users` profile so Primpy users exist in the shared backend.
 * A business account uses role `barber` + `shopName` so it appears as a venue,
 * matching the Snip data model.
 */
async function ensureProfile(
  fbUser: FirebaseUser,
  displayName: string,
  role: UserRole = 'customer',
  shopName?: string,
): Promise<boolean> {
  const ref = doc(db, 'users', fbUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return false;
  const data: Record<string, unknown> = {
    displayName,
    email: fbUser.email ?? '',
    role,
    createdAt: new Date().toISOString(),
    source: 'primpy-web',
  };
  if (role === 'barber' && shopName) {
    data.shopName = shopName;
    data.barberServices = [];
  }
  await setDoc(ref, data);
  return true;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      try {
        // Anonymous guest sessions exist only so browsing can read venues; treat as signed out.
        setUser(fbUser && !fbUser.isAnonymous ? await loadProfile(fbUser) : null);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const refresh = async () => {
    if (auth.currentUser && !auth.currentUser.isAnonymous) setUser(await loadProfile(auth.currentUser));
  };

  const signIn = async (email: string, password: string): Promise<AppUser> => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const profile = await loadProfile(cred.user);
    setUser(profile);
    return profile;
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    opts?: { role?: UserRole; shopName?: string },
  ) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await fbUpdateProfile(cred.user, { displayName });
    await ensureProfile(cred.user, displayName, opts?.role, opts?.shopName);
    await sendEmailVerification(cred.user, actionSettings()).catch(() => undefined);
    setUser(await loadProfile(cred.user));
  };

  const signInWithSocial = async (which: 'google' | 'apple') => {
    const provider =
      which === 'google' ? new GoogleAuthProvider() : new OAuthProvider('apple.com');
    if (provider instanceof OAuthProvider) {
      provider.addScope('email');
      provider.addScope('name');
    }
    const cred = await signInWithPopup(auth, provider);
    const name = cred.user.displayName || cred.user.email?.split('@')[0] || 'Guest';
    const created = await ensureProfile(cred.user, name);
    setUser(await loadProfile(cred.user));
    return created;
  };

  const applyEmailCode = async (code: string) => {
    await applyActionCode(auth, code);
    if (auth.currentUser) {
      await reload(auth.currentUser);
      await refresh();
    }
  };

  const signOut = async () => {
    await fbSignOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email, actionSettings());
  };

  const checkResetCode = (code: string) => verifyPasswordResetCode(auth, code);
  const completeReset = (code: string, password: string) => confirmPasswordReset(auth, code, password);

  const resendVerification = async () => {
    if (auth.currentUser) await sendEmailVerification(auth.currentUser, actionSettings());
  };

  const refreshVerified = async () => {
    if (!auth.currentUser) return false;
    await reload(auth.currentUser);
    await refresh();
    return auth.currentUser.emailVerified;
  };

  const updateProfile = async (patch: { displayName?: string; email?: string }) => {
    const fbUser = auth.currentUser;
    if (!fbUser || fbUser.isAnonymous) throw new Error('You’re signed out.');
    let emailPending = false;
    if (patch.displayName && patch.displayName !== user?.displayName) {
      await fbUpdateProfile(fbUser, { displayName: patch.displayName });
      await updateDoc(doc(db, 'users', fbUser.uid), { displayName: patch.displayName });
    }
    if (patch.email && patch.email !== fbUser.email) {
      // Firebase only switches the address once the new one is confirmed.
      await verifyBeforeUpdateEmail(fbUser, patch.email, actionSettings());
      emailPending = true;
    }
    await refresh();
    return { emailPending };
  };

  const deleteAccount = async (beforeDelete?: () => Promise<void>) => {
    const fbUser = auth.currentUser;
    if (!fbUser || fbUser.isAnonymous) return;
    // Firebase refuses deletion without a recent sign-in; check first so nothing
    // is cancelled for an account that then can't be deleted.
    const last = Date.parse(fbUser.metadata.lastSignInTime ?? '');
    if (!last || Date.now() - last > 5 * 60000) {
      throw Object.assign(new Error('Recent sign-in required'), { code: 'auth/requires-recent-login' });
    }
    await beforeDelete?.();
    // TODO(backend): anonymise this user's `users` doc and Snip bookings server-side.
    await deleteUser(fbUser);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signInWithSocial,
        applyEmailCode,
        signOut,
        resetPassword,
        checkResetCode,
        completeReset,
        resendVerification,
        refreshVerified,
        updateProfile,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
