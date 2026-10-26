import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authErrorMessage } from '../utils/authError';

export default function LoginPage() {
  const { signIn, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (!email) {
      setError('Enter your email first, then tap reset.');
      return;
    }
    setError(null);
    try {
      await resetPassword(email);
      setNotice('Password reset email sent — check your inbox.');
    } catch (err) {
      setError(authErrorMessage(err));
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Welcome back</h1>
        <p className="subtle" style={{ marginTop: 0 }}>
          Log in to manage your bookings.
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        {notice && <div className="alert alert-success">{notice}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Logging in…' : 'Log in'}
          </button>
        </form>
        <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={handleReset}>
          Forgot password?
        </button>
        <p className="subtle" style={{ textAlign: 'center', marginBottom: 0 }}>
          New to Primpy? <Link to="/register" style={{ color: 'var(--teal)', fontWeight: 600 }}>Create an account</Link>
        </p>
      </div>
    </div>
  );
}
