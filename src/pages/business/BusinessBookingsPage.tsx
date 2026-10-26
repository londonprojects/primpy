import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import BusinessNav from '../../components/BusinessNav';
import { Spinner } from '../../components/ui';
import { fetchVenueBookings, setAppointmentStatus } from '../../services/appointments';
import type { Appointment } from '../../types';
import { money } from '../../utils/format';

function dayParts(dateStr: string): { d: string; m: string } {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { d: '?', m: '' };
  return { d: String(d.getDate()), m: d.toLocaleDateString('en-GB', { month: 'short' }) };
}

export default function BusinessBookingsPage() {
  const { user } = useAuth();
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchVenueBookings(user.id)
      .then(setAppts)
      .catch((e) =>
        setError(
          e?.code === 'permission-denied'
            ? 'Cannot read bookings — the backend rules may not grant venues read access.'
            : e?.message ?? 'Could not load bookings',
        ),
      )
      .finally(() => setLoading(false));
  }, [user]);

  const change = async (id: string, status: Appointment['status']) => {
    try {
      await setAppointmentStatus(id, status);
      setAppts((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not update');
    }
  };

  return (
    <div className="wrap w880 page">
      <BusinessNav />
      <h2 className="h-card" style={{ marginBottom: 14 }}>Incoming bookings</h2>

      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="banner-amber">{error}</div>
      ) : appts.length === 0 ? (
        <div className="empty">
          <div className="empty-title">No bookings yet</div>
          <p>Bookings customers make for your venue will appear here.</p>
        </div>
      ) : (
        appts.map((a) => {
          const { d, m } = dayParts(a.date);
          return (
            <div key={a.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, marginBottom: 12 }}>
              <div className="biz-date">
                <div className="d">{d}</div>
                <div className="m">{m}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{a.serviceName}</div>
                <div className="muted" style={{ fontSize: 14 }}>{a.time || 'Time TBC'}</div>
              </div>
              <span className={`pill pill-${a.status}`}>{a.status}</span>
              <div style={{ fontWeight: 800, minWidth: 56, textAlign: 'right' }}>{a.price > 0 ? money(a.price) : ''}</div>
              {a.status === 'scheduled' && (
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn btn-outline btn-sm h40" style={{ fontSize: 13 }} onClick={() => change(a.id, 'completed')}>
                    Complete
                  </button>
                  <button className="btn-text" style={{ fontSize: 13 }} onClick={() => change(a.id, 'no-show')}>
                    No-show
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
