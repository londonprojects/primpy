import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUi } from '../context/UiContext';
import { Spinner } from '../components/ui';
import { authErrorMessage } from '../utils/authError';

const LABELS = ['Too short', 'Weak', 'Okay', 'Good', 'Strong'];

function score(p: string): number {
  return Number(p.length >= 6) + Number(p.length >= 10) + Number(/\d/.test(p)) + Number(/[^A-Za-z0-9]/.test(p));
}

/**
 * Landing page for Firebase's emailed action links. Point the console's
 * custom action URL (Authentication → Templates) at `/reset`; it then handles
 * `mode=resetPassword` and `mode=verifyEmail`.
 */
export default function ResetPage() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { checkResetCode, completeReset, applyEmailCode } = useAuth();
  const { openAuth } = useUi();
  const mode = sp.get('mode');
  const code = sp.get('oobCode') ?? '';
  const [email, setEmail] = useState<string | null>(null);
  const [linkErr, setLinkErr] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!code) {
      setLinkErr('This link is missing its code.');
      return;
    }
    if (mode === 'verifyEmail') {
      applyEmailCode(code)
        .then(() => navigate('/onboard', { replace: true }))
        .catch((e) => setLinkErr(authErrorMessage(e)));
      return;
    }
    checkResetCode(code)
      .then(setEmail)
      .catch(() => setLinkErr('This reset link has expired or was already used.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, mode]);

  const save = async () => {
    if (pw.length < 6) return setErr('Password needs at least 6 characters.');
    if (pw !== pw2) return setErr('Passwords don’t match.');
    setBusy(true);
    try {
      await completeReset(code, pw);
      setDone(true);
    } catch (e) {
      setErr(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const s = score(pw);
  const barColor = s < 2 ? '#d6455d' : s < 3 ? 'var(--amber)' : 'var(--teal)';

  return (
    <div className="wrap w480" style={{ padding: 'clamp(32px,8vw,80px) var(--gutter) 64px' }}>
      {linkErr ? (
        <>
          <h1 className="h-gate" style={{ fontSize: 'clamp(32px,5vw,44px)', marginBottom: 8 }}>Link not valid</h1>
          <p className="muted" style={{ margin: '0 0 24px', fontSize: 15 }}>{linkErr}</p>
          <button className="btn btn-ink btn-block h54 btn-bold" onClick={() => openAuth()}>
            Back to log in
          </button>
        </>
      ) : done ? (
        <>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--teal)', color: '#fff', fontSize: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</div>
          <h1 className="h-gate" style={{ fontSize: 'clamp(32px,5vw,44px)', margin: '20px 0 8px' }}>Password updated</h1>
          <p className="muted" style={{ margin: '0 0 24px', fontSize: 15 }}>You've been signed out on other devices.</p>
          <button className="btn btn-ink btn-block h54 btn-bold" onClick={() => openAuth({ onSuccess: () => navigate('/') })}>
            Log in
          </button>
        </>
      ) : email === null ? (
        <Spinner />
      ) : (
        <>
          <h1 className="h-gate" style={{ fontSize: 'clamp(32px,5vw,44px)', marginBottom: 8 }}>Choose a new password</h1>
          <p className="muted" style={{ margin: '0 0 24px', fontSize: 15 }}>For {email}</p>
          <input className="input input-lg h54" type="password" autoComplete="new-password" placeholder="New password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(''); }} />
          <div style={{ display: 'flex', gap: 4, margin: '10px 0 6px' }}>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i < s ? barColor : 'var(--line)' }} />
            ))}
          </div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
            {pw ? LABELS[s] : 'Use 6+ characters, ideally with a number or symbol'}
          </div>
          <input className="input input-lg h54" type="password" autoComplete="new-password" placeholder="Confirm new password" value={pw2} onChange={(e) => { setPw2(e.target.value); setErr(''); }} />
          <div className="err">{err}</div>
          <button className="btn btn-teal btn-block h54 btn-bold" style={{ marginTop: 4 }} disabled={busy} onClick={save}>
            Save password
          </button>
        </>
      )}
    </div>
  );
}
