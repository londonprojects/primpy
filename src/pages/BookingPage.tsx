import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchVenue } from '../services/venues';
import { createAppointment } from '../services/appointments';
import type { Treatment, Venue } from '../types';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '13:00', '13:30', '14:00', '14:30', '15:00',
  '15:30', '16:00', '16:30', '17:00', '17:30', '18:00',
];

function nextDays(count: number): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push({
      value: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
    });
  }
  return out;
}

export default function BookingPage() {
  const { id, treatmentId } = useParams<{ id: string; treatmentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const days = useMemo(() => nextDays(14), []);
  const [date, setDate] = useState(days[0].value);
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!id) return;
    fetchVenue(id)
      .then((v) => {
        if (!v) setError('Venue not found');
        setVenue(v);
      })
      .catch((e) => setError(e?.message ?? 'Could not load venue'))
      .finally(() => setLoading(false));
  }, [id]);

  const treatment: Treatment | undefined = venue?.treatments.find((t) => t.id === treatmentId);

  const confirm = async () => {
    if (!venue || !treatment || !user || !time) return;
    setSubmitting(true);
    setError(null);
    try {
      await createAppointment({
        userId: user.id,
        venueId: venue.id,
        venueName: venue.name,
        treatmentId: treatment.id,
        treatmentName: treatment.name,
        date,
        time,
        price: treatment.price,
        notes: notes.trim() || undefined,
      });
      navigate('/appointments', { state: { justBooked: true } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Booking failed, please try again');
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;
  if (error && !venue)
    return (
      <div className="container center-state">
        {error} · <Link to="/search">Browse venues</Link>
      </div>
    );
  if (!venue || !treatment)
    return (
      <div className="container center-state">
        Treatment not found · <Link to={`/venue/${id}`}>Back to venue</Link>
      </div>
    );

  return (
    <div className="container section">
      <Link to={`/venue/${venue.id}`} className="subtle">
        ← Back to {venue.name}
      </Link>
      <h1 style={{ fontSize: 30, margin: '12px 0 24px' }}>Book your appointment</h1>

      <div className="detail-grid">
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginTop: 0 }}>1. Choose a date</h3>
            <div className="field">
              <select value={date} onChange={(e) => setDate(e.target.value)}>
                {days.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <h3>2. Choose a time</h3>
            <div className="slot-grid">
              {TIME_SLOTS.map((slot) => (
                <button
                  key={slot}
                  className={`slot ${time === slot ? 'active' : ''}`}
                  onClick={() => setTime(slot)}
                  type="button"
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>3. Anything we should know?</h3>
            <div className="field" style={{ marginBottom: 0 }}>
              <textarea
                rows={3}
                placeholder="Optional notes for the venue (allergies, preferences…)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        <aside className="card sticky-card">
          <h3 style={{ marginTop: 0 }}>Booking summary</h3>
          <div className="treatment-row">
            <div>
              <div className="t-name">{treatment.name}</div>
              <div className="t-dur">{treatment.duration} min</div>
            </div>
            <div className="t-price">{treatment.price > 0 ? `£${treatment.price}` : '—'}</div>
          </div>
          <div className="subtle" style={{ margin: '12px 0' }}>
            <div>📍 {venue.name}</div>
            <div>
              🗓️ {days.find((d) => d.value === date)?.label}
              {time ? ` · ${time}` : ' · pick a time'}
            </div>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <button
            className="btn btn-primary btn-block"
            disabled={!time || submitting}
            onClick={confirm}
          >
            {submitting ? 'Booking…' : 'Confirm booking'}
          </button>
          <p className="subtle" style={{ fontSize: 12, marginBottom: 0 }}>
            You won’t be charged now — pay at the venue.
          </p>
        </aside>
      </div>
    </div>
  );
}
