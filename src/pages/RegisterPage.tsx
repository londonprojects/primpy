import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authErrorMessage } from '../utils/authError';

export default function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signUp(email, password, name.trim());
      navigate('/', { replace: true });
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Create your account</h1>
        <p className="subtle" style={{ marginTop: 0 }}>
          Book beauty &amp; wellness in seconds.
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label>Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
          </div>
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
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Creating account…' : 'Sign up'}
          </button>
        </form>
        <p className="subtle" style={{ textAlign: 'center', marginBottom: 0 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--teal)', fontWeight: 600 }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
