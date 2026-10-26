import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUi } from '../context/UiContext';
import { useUserData } from '../context/UserDataContext';
import { useVenues } from '../hooks/useVenues';
import { reviewedAppointmentIds } from '../services/stubs';
import type { Appointment, Venue } from '../types';
import { Empty, ErrorCard, LoginGate, Segmented, Spinner } from '../components/ui';
import { appointmentTreatmentIds, bookUrl, displayStatus, isUpcoming, STATUS_STYLE } from '../utils/booking';
import { dayParts, daysFromToday, money, relDays } from '../utils/format';

export default function AppointmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const { bookings, bookingsLoading, bookingsError, reloadBookings } = useUserData();
  const { venues } = useVenues();
  const { openCancel } = useUi();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const venueMap = useMemo(() => new Map(venues.map((v) => [v.id, v])), [venues]);
  const up = bookings.filter(isUpcoming).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const past = bookings.filter((b) => !isUpcoming(b));
  const reviewed = user ? reviewedAppointmentIds(user.id) : [];

  if (authLoading) return <Spinner />;
  if (!user)
    return (
      <div className="wrap w880 page">
        <LoginGate title="Your bookings live here" text="Log in to see what's coming up." />
      </div>
    );

  const resched = (a: Appointment) => navigate(bookUrl(a.barberId, { t: appointmentTreatmentIds(a, venueMap.get(a.barberId)), d: a.date, r: a.id }));
  const next = tab === 'upcoming' ? up[0] : undefined;
  const list = tab === 'upcoming' ? up.slice(1) : past;
  const empty = tab === 'upcoming' ? up.length === 0 : past.length === 0;

  return (
    <div className="wrap w880 page">
      <div className="between" style={{ marginBottom: 24 }}>
        <h1 className="h-page">My bookings</h1>
        <Segmented options={[['upcoming', 'Upcoming'], ['past', 'Past']]} value={tab} onChange={setTab} />
      </div>

      {bookingsError ? (
        <ErrorCard title="We couldn't load your bookings" text="Check your connection and try again." onRetry={reloadBookings} />
      ) : bookingsLoading && !bookings.length ? (
        <Spinner />
      ) : (
        <>
          {next && <NextUp a={next} venue={venueMap.get(next.barberId)} onResched={() => resched(next)} onCancel={() => openCancel(next)} />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {list.map((a) => (
              <Ticket
                key={a.id}
                a={a}
                canReview={displayStatus(a) === 'completed' && !reviewed.includes(a.id)}
                onResched={() => resched(a)}
                onCancel={() => openCancel(a)}
              />
            ))}
            {empty && <Empty title="Nothing here yet" text="Find a treatment and grab a slot." cta="Explore venues" onCta={() => navigate('/search')} />}
          </div>
        </>
      )}
    </div>
  );
}

function NextUp({ a, venue, onResched, onCancel }: { a: Appointment; venue?: Venue; onResched: () => void; onCancel: () => void }) {
  const navigate = useNavigate();
  const p = dayParts(a.date);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', borderRadius: 28, overflow: 'hidden', background: 'var(--ink)', color: '#fff', marginBottom: 12 }}>
      {venue && <img src={venue.image} alt="" style={{ flex: '1 1 260px', minHeight: 220, maxHeight: 320, objectFit: 'cover', minWidth: 0 }} />}
      <div style={{ flex: '1 1 320px', padding: 'clamp(22px,4vw,36px)', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ alignSelf: 'flex-start', background: 'var(--amber)', color: 'var(--ink)', borderRadius: 999, padding: '5px 11px', fontSize: 12, fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase' }}>
          Next up · {relDays(daysFromToday(a.date))}
        </span>
        <div className="display" style={{ fontWeight: 800, fontSize: 'clamp(30px,4vw,44px)', letterSpacing: '-.03em', lineHeight: 1, marginTop: 10 }}>
          {p.dow} {p.dnum} {p.mon} · {a.time}
        </div>
        <div style={{ fontSize: 17, fontWeight: 600, marginTop: 4 }}>{a.barberName}</div>
        <div style={{ color: '#b9c4c1', fontSize: 14 }}>
          {a.serviceName} · {money(a.price)}
          {venue ? ` · ${venue.area}` : ''}
        </div>
        <div className="row" style={{ gap: 8, marginTop: 'auto', paddingTop: 20 }}>
          <button className="btn btn-sm h44 btn-bold" onClick={onResched}>
            Reschedule
          </button>
          <button className="btn btn-sm h44" style={{ border: '1px solid #3a4644', background: 'transparent', color: '#fff' }} onClick={() => navigate(`/booking/${a.id}`)}>
            Details
          </button>
          <button className="btn btn-sm h44" style={{ background: 'none', color: '#f3a99b', padding: '0 10px' }} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Ticket({ a, canReview, onResched, onCancel }: { a: Appointment; canReview: boolean; onResched: () => void; onCancel: () => void }) {
  const navigate = useNavigate();
  const p = dayParts(a.date);
  const up = isUpcoming(a);
  const st = STATUS_STYLE[displayStatus(a)] ?? STATUS_STYLE.scheduled;
  return (
    <div style={{ display: 'flex', border: '1px solid var(--line)', borderRadius: 22, overflow: 'hidden', flexWrap: 'wrap', background: '#fff' }}>
      <div style={{ flex: '0 0 96px', background: up ? 'var(--teal)' : 'var(--surface)', color: up ? '#fff' : 'var(--ink)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 0' }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{p.dow}</span>
        <span className="display" style={{ fontWeight: 800, fontSize: 36, lineHeight: 1 }}>{p.dnum}</span>
        <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase' }}>{p.mon}</span>
      </div>
      <div style={{ flex: '1 1 240px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center' }}>
        <div className="row" style={{ gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 17 }}>{a.serviceName}</span>
          <span className="status-pill" style={{ background: st.bg, color: st.fg }}>{st.text}</span>
        </div>
        <div className="muted" style={{ fontSize: 14 }}>
          {a.time} · {a.barberName} · {money(a.price)}
        </div>
      </div>
      <div className="row" style={{ gap: 8, padding: '12px 16px' }}>
        {canReview && (
          <button className="btn btn-amber btn-sm h42 btn-bold" onClick={() => navigate(`/review/${a.id}`)}>
            Leave a review
          </button>
        )}
        <button className="btn btn-outline btn-sm h42" onClick={() => navigate(up ? `/booking/${a.id}` : `/venue/${a.barberId}`)}>
          {up ? 'Details' : 'Book again'}
        </button>
        {up && (
          <>
            <button className="btn btn-outline btn-sm h42" onClick={onResched}>
              Reschedule
            </button>
            <button className="btn btn-sm h42" style={{ background: 'none', padding: '0 10px', color: 'var(--danger)' }} onClick={onCancel}>
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
