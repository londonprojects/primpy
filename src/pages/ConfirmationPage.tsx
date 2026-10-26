import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppointment } from '../hooks/useAppointment';
import { Spinner } from '../components/ui';
import { dayParts, money } from '../utils/format';
import NotFoundPage from './NotFoundPage';

export default function ConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { appointment: a, loading } = useAppointment(id);

  if (loading) return <Spinner />;
  if (!a) return <NotFoundPage />;
  const p = dayParts(a.date);

  return (
    <div className="wrap w720" style={{ paddingTop: 24, paddingBottom: 64 }}>
      <div style={{ background: 'var(--teal)', color: '#fff', borderRadius: 32, padding: 'clamp(28px,6vw,56px)', position: 'relative', overflow: 'hidden' }}>
        <div className="circle-deco" style={{ right: -60, bottom: -60, width: 220, height: 220 }} />
        <div style={{ position: 'relative', width: 56, height: 56, borderRadius: '50%', background: '#fff', color: 'var(--teal)', fontSize: 26, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          ✓
        </div>
        <div className="eyebrow" style={{ position: 'relative', marginTop: 22, color: 'var(--teal-soft)' }}>
          {sp.get('mode') === 'resched' ? 'Rescheduled' : 'You’re booked'}
        </div>
        <h1 className="display" style={{ position: 'relative', fontWeight: 800, fontSize: 'clamp(40px,6vw,64px)', letterSpacing: '-.035em', lineHeight: 0.95, margin: '8px 0 10px' }}>
          See you {p.dow} {p.dnum} {p.mon}
        </h1>
        <div style={{ position: 'relative', fontSize: 18 }}>
          {a.time} · {a.barberName}
        </div>
        <div style={{ position: 'relative', fontSize: 15, color: 'var(--teal-soft)', marginTop: 4 }}>
          {a.serviceName} · {money(a.price)} · confirmation sent to {user?.email}
        </div>
      </div>
      <div className="row" style={{ gap: 10, marginTop: 20 }}>
        <button className="btn btn-ink h54" style={{ flex: '1 1 200px' }} onClick={() => navigate(`/booking/${a.id}`)}>
          View booking
        </button>
        <button className="btn btn-outline h54" style={{ flex: '1 1 200px' }} onClick={() => navigate('/')}>
          Back to explore
        </button>
      </div>
    </div>
  );
}
