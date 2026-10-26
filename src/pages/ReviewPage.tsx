import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppointment } from '../hooks/useAppointment';
import { useVenue } from '../hooks/useVenues';
import { createReview } from '../services/stubs';
import { BackLink, LoginGate, Spinner } from '../components/ui';
import { dayParts, firstName } from '../utils/format';
import NotFoundPage from './NotFoundPage';

type Aspect = 'clean' | 'value' | 'punct';
const ASPECTS: [Aspect, string][] = [
  ['clean', 'Cleanliness'],
  ['value', 'Value for money'],
  ['punct', 'Punctuality'],
];
const LABELS = ['Tap a star to rate', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { appointment: a, loading } = useAppointment(user ? id : undefined);
  const { venue } = useVenue(a?.barberId);
  const [stars, setStars] = useState(0);
  const [asp, setAsp] = useState<Record<Aspect, number>>({ clean: 0, value: 0, punct: 0 });
  const [text, setText] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (authLoading || (user && loading)) return <Spinner />;
  if (!user)
    return (
      <div className="wrap w680 page">
        <LoginGate title="How was it?" text="Log in to review your visit." />
      </div>
    );
  if (!a) return <NotFoundPage />;
  const p = dayParts(a.date);

  const submit = async () => {
    if (!stars) return;
    setBusy(true);
    setError('');
    try {
      await createReview({
        venueId: a.barberId,
        userId: user.id,
        appointmentId: a.id,
        authorName: firstName(user.displayName),
        treatment: a.serviceName,
        rating: stars,
        aspects: asp,
        text: text.trim(),
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not post your review');
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <div className="wrap w680 page">
        <div style={{ background: 'var(--amber)', borderRadius: 32, padding: 'clamp(28px,6vw,56px)' }}>
          <div style={{ fontSize: 44, lineHeight: 1 }}>★★★★★</div>
          <h1 className="display" style={{ fontWeight: 800, fontSize: 'clamp(36px,6vw,56px)', letterSpacing: '-.035em', lineHeight: 0.95, margin: '20px 0 10px' }}>
            Thanks for the review
          </h1>
          <p style={{ margin: 0, fontSize: 16, color: '#3d2c00' }}>It helps {a.barberName} and everyone choosing where to go next.</p>
        </div>
        <div className="row" style={{ gap: 10, marginTop: 20 }}>
          <button className="btn btn-ink h54" style={{ flex: '1 1 200px' }} onClick={() => navigate(`/venue/${a.barberId}`)}>
            Book again
          </button>
          <button className="btn btn-outline h54" style={{ flex: '1 1 200px' }} onClick={() => navigate('/appointments')}>
            My bookings
          </button>
        </div>
      </div>
    );

  return (
    <div className="wrap w680 page">
      <BackLink onClick={() => navigate('/appointments')}>My bookings</BackLink>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', margin: '20px 0 28px' }}>
        {venue && <img src={venue.image} alt="" style={{ width: 64, height: 64, borderRadius: 16, objectFit: 'cover' }} />}
        <div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>{a.barberName}</div>
          <div className="muted" style={{ fontSize: 14 }}>
            {a.serviceName} · {p.dnum} {p.mon}
          </div>
        </div>
      </div>
      <h1 className="h-gate">How was it?</h1>
      <div style={{ display: 'flex', gap: 4, margin: '20px 0 6px' }} role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            role="radio"
            aria-checked={stars === n}
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
            onClick={() => setStars(n)}
            style={{ width: 56, height: 56, border: 0, background: 'none', padding: 0, fontSize: 44, lineHeight: 1, color: n <= stars ? 'var(--amber)' : '#dfe4e2' }}
          >
            ★
          </button>
        ))}
      </div>
      <div className="label muted" style={{ marginBottom: 28 }}>{LABELS[stars]}</div>
      <div className="card" style={{ padding: '8px 20px', marginBottom: 20 }}>
        {ASPECTS.map(([k, label], i) => (
          <div key={k} className="between" style={{ padding: '12px 0', borderBottom: i < 2 ? '1px solid var(--hair)' : 0 }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>{label}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3, 4, 5].map((n) => {
                const on = asp[k] >= n;
                return (
                  <button
                    key={n}
                    onClick={() => setAsp({ ...asp, [k]: n })}
                    style={{ width: 40, height: 40, border: 0, borderRadius: 10, background: on ? 'var(--ink)' : 'var(--surface)', color: on ? '#fff' : 'var(--muted)', fontSize: 14, fontWeight: 700 }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="label" style={{ marginBottom: 10 }}>Tell others about your visit</div>
      <textarea className="input" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="What did you love? Anything they could do better?" />
      {/* TODO(backend): photo uploads to Firebase Storage. */}
      <div className="map-ph map-ph-label" style={{ marginTop: 14, height: 110, borderRadius: 16, border: '1px dashed var(--off)' }}>
        add photos (optional)
      </div>
      <button className="btn btn-block h56 btn-bold" disabled={!stars || busy} onClick={submit} style={{ marginTop: 20, background: stars ? 'var(--teal)' : 'var(--off)', color: '#fff' }}>
        {busy ? 'Posting…' : 'Post review'}
      </button>
      {error && <div className="err" style={{ textAlign: 'center' }}>{error}</div>}
      <p className="muted" style={{ fontSize: 13, textAlign: 'center', margin: '10px 0 0' }}>
        Your first name and treatment are shown with your review.
      </p>
    </div>
  );
}
