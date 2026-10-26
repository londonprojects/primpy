import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { AppUser, UserRole } from '../types';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      try {
        setUser(fbUser ? await loadProfile(fbUser) : null);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // Create a matching `users` profile so Primpy users exist in the shared backend.
    await setDoc(doc(db, 'users', cred.user.uid), {
      displayName,
      email,
      role: 'customer' as UserRole,
      createdAt: new Date().toISOString(),
      source: 'primpy-web',
    });
    setUser(await loadProfile(cred.user));
  };

  const signOut = async () => {
    await fbSignOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
