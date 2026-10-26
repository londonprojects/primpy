import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUserData } from '../context/UserDataContext';
import { cancelAppointment } from '../services/appointments';
import { BackLink, LoginGate, Spinner, ToggleRow } from '../components/ui';
import { isUpcoming } from '../utils/booking';
import { download } from '../utils/files';
import { authErrorMessage } from '../utils/authError';

const TOGGLES: ['personal' | 'analytics', string, string][] = [
  ['personal', 'Personalised recommendations', 'Use my bookings to suggest venues'],
  ['analytics', 'Product analytics', 'Help improve Primpy with anonymous usage data'],
];

export default function PrivacyPage() {
  const { user, loading, deleteAccount } = useAuth();
  const { extras, updateExtras, bookings } = useUserData();
  const navigate = useNavigate();
  const [msg, setMsg] = useState('');
  const [delOpen, setDelOpen] = useState(false);
  const [delErr, setDelErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return <Spinner />;
  if (!user)
    return (
      <div className="wrap w780 page">
        <LoginGate title="Privacy & data" text="Log in to manage your privacy settings." />
      </div>
    );

  const downloadData = () => {
    const data = { profile: user, preferences: extras, bookings, exportedAt: new Date().toISOString() };
    download('primpy-data.json', JSON.stringify(data, null, 2), 'application/json');
    setMsg('Your data has been downloaded as a file.');
  };

  const confirmDelete = async () => {
    setBusy(true);
    setDelErr('');
    try {
      await deleteAccount(async () => {
        await Promise.all(bookings.filter(isUpcoming).map((b) => cancelAppointment(b.id)));
      });
      navigate('/');
    } catch (e) {
      const code = (e as { code?: string }).code;
      setDelErr(code === 'auth/requires-recent-login' ? 'For security, log out and back in, then try again.' : authErrorMessage(e));
      setBusy(false);
    }
  };

  return (
    <div className="wrap w780 page">
      <BackLink onClick={() => navigate('/account')}>Account</BackLink>
      <h1 className="h-page" style={{ margin: '14px 0 24px' }}>Privacy &amp; data</h1>

      <div className="card" style={{ padding: '6px 20px', marginBottom: 16 }}>
        {TOGGLES.map(([k, label, desc]) => (
          <ToggleRow key={k} label={label} desc={desc} on={extras.privacy[k]} onToggle={() => updateExtras({ privacy: { ...extras.privacy, [k]: !extras.privacy[k] } })} />
        ))}
        {/* TODO(content): link the real privacy policy and terms pages. */}
        <div className="row" style={{ gap: 16, padding: '14px 0', fontSize: 14 }}>
          <button className="btn-text" style={{ fontSize: 14, fontWeight: 700 }}>Privacy policy</button>
          <button className="btn-text" style={{ fontSize: 14, fontWeight: 700 }}>Terms of use</button>
        </div>
      </div>

      <div className="card card-pad row" style={{ gap: 16, marginBottom: 16 }}>
        <div style={{ flex: '1 1 240px' }}>
          <div className="label">Download your data</div>
          <div className="muted" style={{ fontSize: 14, marginTop: 2 }}>Bookings, reviews and profile as a file.</div>
        </div>
        <button className="btn btn-outline btn-sm h46 btn-bold" onClick={downloadData}>
          Request download
        </button>
        {msg && <div className="ok-msg" style={{ flexBasis: '100%' }}>{msg}</div>}
      </div>

      <div className="row" style={{ gap: 16, border: '1px solid var(--error-line)', background: 'var(--error-bg)', borderRadius: 22, padding: 20 }}>
        <div style={{ flex: '1 1 240px' }}>
          <div className="label" style={{ color: 'var(--danger)' }}>Delete account</div>
          <div style={{ color: '#6b2a1f', fontSize: 14, marginTop: 2 }}>
            Removes your profile, saved venues and reviews. Bookings in Snip are anonymised.
          </div>
        </div>
        <button className="btn btn-danger btn-sm h46" onClick={() => setDelOpen(true)}>
          Delete account
        </button>
      </div>

      {delOpen && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setDelOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 420 }}>
            <h2 className="h-modal" style={{ marginBottom: 10 }}>Delete your account?</h2>
            <p className="muted" style={{ fontSize: 15, lineHeight: 1.5, margin: 0 }}>
              This can't be undone. Upcoming bookings will be cancelled and any gift card balance will be lost.
            </p>
            {delErr && <div className="err">{delErr}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
              <button className="btn btn-outline h52 btn-bold" style={{ flex: 1, fontSize: 15 }} onClick={() => setDelOpen(false)}>
                Keep account
              </button>
              <button className="btn btn-danger h52" style={{ flex: 1, fontSize: 15 }} disabled={busy} onClick={confirmDelete}>
                {busy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
