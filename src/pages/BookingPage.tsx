import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useVenue } from '../hooks/useVenues';
import { useAuth } from '../context/AuthContext';
import { useUi } from '../context/UiContext';
import { useUserData } from '../context/UserDataContext';
import { fetchTakenSlots, rescheduleAppointment } from '../services/appointments';
import FloatingBar, { BarSpacer } from '../components/FloatingBar';
import { LoginGate, Spinner } from '../components/ui';
import { BOOKING_WINDOW_DAYS, SLOTS, SLOT_GROUPS } from '../config/slots';
import { bookUrl, isClosed, isPast, payUrl, readBookingParams } from '../utils/booking';
import { addDaysISO, dayParts, daysFromToday, fmtDur, money, todayISO, whenText } from '../utils/format';
import NotFoundPage from './NotFoundPage';

export default function BookingPage() {
  const { id } = useParams<{ id: string }>();
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openAuth } = useUi();
  const { bookings, patchBooking } = useUserData();
  const { venue, loading } = useVenue(id);

  const params = readBookingParams(sp);
  const today = todayISO();
  const dayOffset = params.d ? daysFromToday(params.d) : 0;
  const date = dayOffset >= 0 && dayOffset < BOOKING_WINDOW_DAYS ? params.d! : today;
  const time = params.time && SLOTS.includes(params.time) ? params.time : null;
  const resched = params.r ? bookings.find((b) => b.id === params.r) : undefined;

  const [notes, setNotes] = useState(params.notes ?? '');
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const items = useMemo(() => venue?.treatments.filter((t) => params.t.includes(t.id)) ?? [], [venue, params.t]);
  const total = items.reduce((a, t) => a + t.price, 0);
  const dur = items.reduce((a, t) => a + t.duration, 0);

  useEffect(() => {
    if (!venue) return;
    let live = true;
    fetchTakenSlots(venue.id, date, dur, params.r).then((s) => live && setTaken(s));
    return () => {
      live = false;
    };
  }, [venue, date, dur, params.r]);

  const update = (patch: { d?: string; time?: string | null }) => {
    setSp(new URLSearchParams(bookUrl('', { ...params, ...patch }).split('?')[1]), { replace: true });
  };

  if (loading) return <Spinner />;
  if (!venue) return <NotFoundPage />;
  if (params.r && !user) {
    return (
      <div className="wrap w880 page">
        <LoginGate title="Reschedule a booking" text="Log in to move your booking." />
      </div>
    );
  }
  if (!items.length) return <Navigate to={`/venue/${venue.id}`} replace />;

  const when = whenText(date, time);
  const unavailable = (slot: string) => taken.has(slot) || isPast(date, slot) || isClosed(date);

  const confirm = async () => {
    if (!time) return;
    setError('');
    if (params.r) {
      setBusy(true);
      try {
        await rescheduleAppointment(params.r, date, time);
        patchBooking(params.r, { date, time });
        navigate(`/booked/${params.r}?mode=resched`);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not move your booking');
        setBusy(false);
      }
      return;
    }
    const next = payUrl(venue.id, { t: params.t, d: date, time, notes: notes.trim() || undefined });
    if (!user) openAuth({ hold: when, onSuccess: () => navigate(next) });
    else navigate(next);
  };

  const rp = resched ? dayParts(resched.date) : null;

  return (
    <>
      <div className="wrap w780" style={{ paddingTop: 24, paddingBottom: 48 }}>
        {params.r ? (
          <div className="row" style={{ background: 'var(--amber-soft)', color: 'var(--amber-ink)', borderRadius: 16, padding: '12px 16px', marginBottom: 24, fontSize: 14 }}>
            <span style={{ fontWeight: 700 }}>Rescheduling</span>
            <span style={{ flex: '1 1 200px' }}>
              {resched && rp ? `${resched.serviceName} · ${rp.dow} ${rp.dnum} ${rp.mon} at ${resched.time}` : ''}
            </span>
            <button onClick={() => navigate('/appointments')} style={{ border: 0, background: 'none', padding: 0, color: 'var(--amber-ink)', fontWeight: 700, fontSize: 14, textDecoration: 'underline' }}>
              Keep original
            </button>
          </div>
        ) : (
          <div className="stepper">
            <button className="done" onClick={() => navigate(`/venue/${venue.id}?t=${params.t.join(',')}`)}>
              ✓ {items.length} treatment{items.length === 1 ? '' : 's'}
            </button>
            <span className="sep" />
            <span className="cur">2 · Time</span>
            <span className="sep" />
            <span className="todo">3 · Confirm</span>
          </div>
        )}

        <h1 className="h-flow" style={{ marginBottom: 6 }}>When works for you?</h1>
        <p className="muted" style={{ margin: '0 0 24px', fontSize: 16 }}>
          {venue.name} · {fmtDur(dur)}
        </p>

        <div className="hscroll" style={{ gap: 8, paddingBottom: 8, marginBottom: 28 }}>
          {Array.from({ length: BOOKING_WINDOW_DAYS }, (_, i) => {
            const d = addDaysISO(today, i);
            const p = dayParts(d);
            return (
              <button key={d} className={`day-tile${d === date ? ' on' : ''}`} onClick={() => update({ d, time: null })}>
                <span className="dow">{i === 0 ? 'Today' : p.dow}</span>
                <span className="num">{p.dnum}</span>
              </button>
            );
          })}
        </div>

        {isClosed(date) && <p className="muted" style={{ marginTop: -12, marginBottom: 20 }}>Closed on Sundays — pick another day.</p>}

        {SLOT_GROUPS.map((g) => (
          <div key={g.label} style={{ marginBottom: 24 }}>
            <div className="label" style={{ marginBottom: 10 }}>{g.label}</div>
            <div className="row" style={{ gap: 8 }}>
              {SLOTS.slice(g.from, g.to).map((t) => (
                <button key={t} className={`slot${t === time ? ' on' : ''}`} disabled={unavailable(t)} onClick={() => update({ time: t })}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        ))}

        {!params.r && (
          <>
            <div className="label" style={{ margin: '8px 0 10px' }}>
              Notes for the venue <span className="muted" style={{ fontWeight: 500 }}>(optional)</span>
            </div>
            <textarea className="input" rows={3} placeholder="Allergies, preferences…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </>
        )}

        <div className="card" style={{ marginTop: 28, padding: '18px 20px' }}>
          {items.map((t) => (
            <div key={t.id} className="sum-row" style={{ padding: '8px 0', fontSize: 15 }}>
              <span>
                {t.name} <span className="muted">· {fmtDur(t.duration)}</span>
              </span>
              <span style={{ fontWeight: 700 }}>{money(t.price)}</span>
            </div>
          ))}
          <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>
            {params.r ? 'Same treatments and price — only the time changes.' : 'You won’t be charged yet — choose how to pay next.'}
          </div>
        </div>
        {error && <div className="err">{error}</div>}
        <BarSpacer />
      </div>

      <FloatingBar
        title={when}
        sub={`${money(total)} · ${params.r ? 'no change to price' : venue.deposit ? 'deposit at next step' : 'pay at venue'}`}
        cta={params.r ? 'Move booking' : user ? 'Confirm' : 'Continue'}
        disabled={!time || busy}
        onCta={confirm}
      />
    </>
  );
}
