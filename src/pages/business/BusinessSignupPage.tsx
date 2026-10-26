import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUi } from '../../context/UiContext';
import { authErrorMessage } from '../../utils/authError';

/** Standalone "list your venue" sign-up for business (barber) accounts. */
export default function BusinessSignupPage() {
  const { user, signUp } = useAuth();
  const { openAuth } = useUi();
  const navigate = useNavigate();

  const [shopName, setShopName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // A signed-in business already has an account; send them to the dashboard.
  useEffect(() => {
    if (user && (user.role === 'barber' || user.role === 'admin')) navigate('/business', { replace: true });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) return setError('Enter your venue name.');
    if (!name.trim()) return setError('Enter your name.');
    if (pw.length < 6) return setError('Password needs at least 6 characters.');
    setBusy(true);
    setError('');
    try {
      await signUp(email.trim(), pw, name.trim(), { role: 'barber', shopName: shopName.trim() });
      navigate('/business', { replace: true });
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="wrap w880 page">
      <div style={{ maxWidth: 460, margin: '0 auto' }}>
        <h1 className="display" style={{ fontWeight: 800, fontSize: 'clamp(28px,5vw,40px)', letterSpacing: '-.03em', margin: '0 0 8px' }}>
          List your venue on Primpy
        </h1>
        <p className="muted" style={{ fontSize: 15, margin: '0 0 24px' }}>
          Create a business account to manage your treatments and take bookings.
        </p>

        <form className="card card-pad-lg" onSubmit={submit}>
          {error && <div className="banner-amber" style={{ marginBottom: 16 }}>{error}</div>}
          <label className="field" style={{ marginBottom: 12 }}>
            Venue name
            <input className="input h50" value={shopName} placeholder="e.g. The Glow Room" onChange={(e) => { setShopName(e.target.value); setError(''); }} />
          </label>
          <label className="field" style={{ marginBottom: 12 }}>
            Your name (owner)
            <input className="input h50" autoComplete="name" value={name} onChange={(e) => { setName(e.target.value); setError(''); }} />
          </label>
          <label className="field" style={{ marginBottom: 12 }}>
            Email
            <input className="input h50" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} />
          </label>
          <label className="field" style={{ marginBottom: 18 }}>
            Password
            <input className="input h50" type="password" autoComplete="new-password" value={pw} placeholder="6+ characters" onChange={(e) => { setPw(e.target.value); setError(''); }} />
          </label>
          <button className="btn btn-teal btn-block h54 btn-bold" disabled={busy}>
            {busy ? 'Creating account…' : 'Create business account'}
          </button>
        </form>

        <p className="muted" style={{ textAlign: 'center', fontSize: 14, marginTop: 16 }}>
          Already have a business account?{' '}
          <button type="button" className="btn-text" style={{ fontWeight: 700 }} onClick={() => openAuth()}>
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}
