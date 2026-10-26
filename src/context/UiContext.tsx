import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { Appointment } from '../types';
import AuthModal, { type AuthResult } from '../components/AuthModal';
import CancelModal from '../components/CancelModal';

export interface AuthOptions {
  /** Shown as "Holding {hold} for you". */
  hold?: string;
  /** Runs after sign-in / sign-up. Without it, new accounts go to /verify or /onboard. */
  onSuccess?: (r: AuthResult) => void;
  startAt?: 'email' | 'password';
}

interface UiValue {
  openAuth: (opts?: AuthOptions) => void;
  openCancel: (a: Appointment) => void;
}

const Ctx = createContext<UiValue | undefined>(undefined);

export function UiProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthOptions | null>(null);
  const [cancelFor, setCancelFor] = useState<Appointment | null>(null);

  const openAuth = useCallback((opts?: AuthOptions) => setAuth(opts ?? {}), []);
  const openCancel = useCallback((a: Appointment) => setCancelFor(a), []);

  return (
    <Ctx.Provider value={{ openAuth, openCancel }}>
      {children}
      {cancelFor && <CancelModal appointment={cancelFor} onClose={() => setCancelFor(null)} />}
      {auth && <AuthModal options={auth} onClose={() => setAuth(null)} />}
    </Ctx.Provider>
  );
}

export function useUi(): UiValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useUi must be used within UiProvider');
  return ctx;
}
