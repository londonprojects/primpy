import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUi } from '../context/UiContext';
import { Spinner } from '../components/ui';
import { authErrorMessage } from '../utils/authError';

/** "Confirm your email" after an email sign-up. */
export default function VerifyPage() {
  const { user, loading, refreshVerified, resendVerification, signOut } = useAuth();
  const { openAuth } = useUi();
  const navigate = useNavigate();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/" replace />;

  const confirmed = async () => {
    setBusy(true);
    setMsg('');
    const ok = await refreshVerified().catch(() => false);
    setBusy(false);
    if (ok) navigate('/onboard');
    else setMsg('Not confirmed yet — tap the link in the email, then try again.');
  };

  const resend = async () => {
    try {
      await resendVerification();
      setMsg('Sent again — check spam too.');
    } catch (e) {
      setMsg(authErrorMessage(e));
    }
  };

  // Changing the address means a fresh sign-up with the right one.
  const changeEmail = async () => {
    await signOut();
    openAuth();
  };

  return (
    <div className="wrap w520" style={{ padding: 'clamp(32px,8vw,80px) var(--gutter) 64px', textAlign: 'center' }}>
      <div className="display" style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--amber)', fontWeight: 800, fontSize: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
        @
      </div>
      <h1 className="h-gate" style={{ margin: '24px 0 10px' }}>Confirm your email</h1>
      <p className="muted" style={{ margin: '0 0 28px', fontSize: 16, lineHeight: 1.5 }}>
        We sent a link to <span style={{ color: 'var(--ink)', fontWeight: 700 }}>{user.email}</span>. Tap it to finish setting up — you can keep browsing meanwhile.
      </p>
      <button className="btn btn-teal btn-block h54 btn-bold" disabled={busy} onClick={confirmed}>
        I've confirmed it
      </button>
      <div className="row" style={{ justifyContent: 'center', gap: 20, marginTop: 16, fontSize: 14 }}>
        <button className="btn-text" style={{ fontSize: 14, fontWeight: 700 }} onClick={resend}>
          Resend email
        </button>
        <button className="btn-back" style={{ fontSize: 14 }} onClick={changeEmail}>
          Change email
        </button>
      </div>
      <div className="ok-msg" style={{ marginTop: 12 }}>{msg}</div>
    </div>
  );
}
