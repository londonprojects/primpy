import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cancelAppointment, fetchMyAppointments } from '../services/appointments';
import type { Appointment } from '../types';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';

function formatDay(dateStr: string): { d: string; m: string } {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { d: '?', m: '' };
  return {
    d: String(d.getDate()),
    m: d.toLocaleDateString('en-GB', { month: 'short' }),
  };
}

export default function AppointmentsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const justBooked = (location.state as { justBooked?: boolean } | null)?.justBooked;

  const [appts, setAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!user) return;
    setLoading(true);
    fetchMyAppointments(user.id)
      .then(setAppts)
      .catch((e) => setError(e?.message ?? 'Could not load appointments'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [user]);

  const handleCancel = async (apptId: string) => {
    if (!confirm('Cancel this appointment?')) return;
    try {
      await cancelAppointment(apptId);
      setAppts((prev) =>
        prev.map((a) => (a.id === apptId ? { ...a, status: 'cancelled' } : a)),
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not cancel');
    }
  };

  return (
    <div className="container section">
      <h1 style={{ fontSize: 30, marginBottom: 20 }}>My bookings</h1>
      {justBooked && <div className="alert alert-success">🎉 Your booking is confirmed!</div>}

      {loading ? (
        <Loading />
      ) : error ? (
        <div className="alert alert-error">{error}</div>
      ) : appts.length === 0 ? (
        <div className="center-state">
          No bookings yet. <Link to="/search">Find a treatment →</Link>
        </div>
      ) : (
        appts.map((a) => {
          const { d, m } = formatDay(a.date);
          return (
            <div key={a.id} className="appt-row">
              <div className="appt-date">
                <div className="d">{d}</div>
                <div className="m">{m}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{a.serviceName}</div>
                <div className="subtle">
                  {a.barberName} · {a.time || 'Time TBC'}
                </div>
              </div>
              <span className={`status ${a.status}`}>{a.status}</span>
              <div style={{ fontWeight: 700, minWidth: 54, textAlign: 'right' }}>
                {a.price > 0 ? `£${a.price}` : ''}
              </div>
              {a.status === 'scheduled' && (
                <button className="btn btn-ghost" onClick={() => handleCancel(a.id)}>
                  Cancel
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
