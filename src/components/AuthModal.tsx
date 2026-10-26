import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { AuthOptions } from '../context/UiContext';
import { authErrorMessage } from '../utils/authError';
import Logo from './Logo';

export interface AuthResult {
  isNew: boolean;
  social: boolean;
}

type Step = 'email' | 'password' | 'register' | 'resetSent';

const EMAIL_RE = /.+@.+\..+/;

/** Email-first log in / sign up modal (replaces the /login and /register pages). */
export default function AuthModal({ options, onClose }: { options: AuthOptions; onClose: () => void }) {
  const { signIn, signUp, signInWithSocial, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(options.startAt ?? 'email');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const done = (r: AuthResult) => {
    onClose();
    if (options.onSuccess) options.onSuccess(r);
    else if (r.isNew) navigate(r.social ? '/onboard' : '/verify');
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setError(authErrorMessage(e));
      }
    } finally {
      setBusy(false);
    }
  };

  const social = (p: 'google' | 'apple') =>
    run(async () => {
      const isNew = await signInWithSocial(p);
      done({ isNew, social: true });
    });

  const go = (s: Step) => {
    setStep(s);
    setError('');
  };

  const cont = () => (EMAIL_RE.test(email) ? go('password') : setError('Enter a valid email address.'));

  const login = () =>
    pw
      ? run(async () => {
          const u = await signIn(email.trim(), pw);
          // Send business accounts straight to their dashboard on a plain login.
          if (!options.onSuccess && !options.hold && (u.role === 'barber' || u.role === 'admin')) {
            onClose();
            navigate('/business');
            return;
          }
          done({ isNew: false, social: false });
        })
      : setError('Enter your password.');

  const register = () => {
    if (!name.trim()) return setError('Tell us your name.');
    if (pw.length < 6) return setError('Password needs at least 6 characters.');
    run(async () => {
      await signUp(email.trim(), pw, name.trim());
      done({ isNew: true, social: false });
    });
  };

  const reset = () =>
    EMAIL_RE.test(email)
      ? run(async () => {
          await resetPassword(email.trim());
          setStep('resetSent');
        })
      : (setStep('email'), setError('Enter your email first.'));

  const submit = (e: React.FormEvent, fn: () => void) => {
    e.preventDefault();
    if (!busy) fn();
  };

  const changeLink = (
    <p className="muted" style={{ margin: '0 0 18px', fontSize: 15 }}>
      {email} ·{' '}
      <button type="button" className="btn-text" style={{ fontSize: 'inherit' }} onClick={() => go('email')}>
        Change
      </button>
    </p>
  );

  return (
    <div className="overlay" style={{ zIndex: 40 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" style={{ padding: 'clamp(24px,5vw,36px)', boxShadow: 'var(--modal-shadow)' }}>
        <button className="modal-close" title="Close" onClick={onClose}>
          ×
        </button>
        <Logo size={24} style={{ marginBottom: 18 }} />
        {options.hold && (
          <div className="banner-amber" style={{ marginBottom: 18 }}>
            Holding {options.hold} for you
          </div>
        )}

        {step === 'email' && (
          <form onSubmit={(e) => submit(e, cont)}>
            <h2 className="display" style={{ fontWeight: 700, fontSize: 30, letterSpacing: '-.02em', margin: '0 0 18px' }}>
              Log in or sign up
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* TODO(design): swap in the official Sign in with Apple / Google button assets. */}
              <button type="button" className="social social-apple" disabled={busy} onClick={() => social('apple')}>
                <AppleMark />
                Continue with Apple
              </button>
              <button type="button" className="social social-google" disabled={busy} onClick={() => social('google')}>
                <GoogleMark />
                Continue with Google
              </button>
            </div>
            <div className="divider">or use email</div>
            <input
              className="input input-lg h54"
              type="email"
              autoComplete="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
            />
            <div className="err">{error}</div>
            <button className="btn btn-teal btn-block h54 btn-bold" style={{ marginTop: 4 }} disabled={busy}>
              Continue
            </button>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={(e) => submit(e, login)}>
            <h2 className="display" style={{ fontWeight: 700, fontSize: 30, letterSpacing: '-.02em', margin: '0 0 6px' }}>
              Welcome back
            </h2>
            {changeLink}
            <input
              className="input input-lg h54"
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              value={pw}
              autoFocus
              onChange={(e) => {
                setPw(e.target.value);
                setError('');
              }}
            />
            <div className="err">{error}</div>
            <button className="btn btn-teal btn-block h54 btn-bold" style={{ marginTop: 4 }} disabled={busy}>
              {busy ? 'Logging in…' : 'Log in'}
            </button>
            <div className="between" style={{ marginTop: 16, fontSize: 14 }}>
              <button type="button" className="btn-back" style={{ fontSize: 14 }} onClick={reset}>
                Forgot password?
              </button>
              <button type="button" className="btn-text" style={{ fontSize: 14, fontWeight: 700 }} onClick={() => go('register')}>
                Create account
              </button>
            </div>
          </form>
        )}

        {step === 'resetSent' && (
          <>
            <h2 className="display" style={{ fontWeight: 700, fontSize: 30, letterSpacing: '-.02em', margin: '0 0 6px' }}>
              Check your inbox
            </h2>
            <p className="muted" style={{ margin: '0 0 20px', fontSize: 15, lineHeight: 1.5 }}>
              We've sent a reset link to <span style={{ color: 'var(--ink)', fontWeight: 700 }}>{email}</span>. It expires in 1 hour.
            </p>
            <button className="btn btn-teal btn-block h54 btn-bold" onClick={() => go('password')}>
              Back to log in
            </button>
            <div className="err">{error}</div>
            <div className="between" style={{ fontSize: 14 }}>
              <button className="btn-back" style={{ fontSize: 14 }} onClick={() => go('email')}>
                Use a different email
              </button>
              <button className="btn-text" style={{ fontSize: 14, fontWeight: 700 }} disabled={busy} onClick={reset}>
                Resend link
              </button>
            </div>
          </>
        )}

        {step === 'register' && (
          <form onSubmit={(e) => submit(e, register)}>
            <h2 className="display" style={{ fontWeight: 700, fontSize: 30, letterSpacing: '-.02em', margin: '0 0 6px' }}>
              Create your account
            </h2>
            {changeLink}
            <input
              className="input input-lg h54"
              autoComplete="name"
              placeholder="Your name"
              value={name}
              style={{ marginBottom: 10 }}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
            />
            <input
              className="input input-lg h54"
              type="password"
              autoComplete="new-password"
              placeholder="Password (6+ characters)"
              value={pw}
              onChange={(e) => {
                setPw(e.target.value);
                setError('');
              }}
            />
            <div className="err">{error}</div>
            <button className="btn btn-teal btn-block h54 btn-bold" style={{ marginTop: 4 }} disabled={busy}>
              {busy ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function AppleMark() {
  return (
    <svg width="18" height="20" viewBox="0 0 17 20" aria-hidden="true" fill="currentColor">
      <path d="M14.1 10.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9C3.6 4.8 2 5.8 1.1 7.4c-1.8 3.1-.5 7.8 1.3 10.3.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.3zM11.6 3c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.1 1.1.1 2.3-.6 3.1-1.5z" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
