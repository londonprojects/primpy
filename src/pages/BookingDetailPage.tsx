import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUi } from '../context/UiContext';
import { useAppointment } from '../hooks/useAppointment';
import { useVenue } from '../hooks/useVenues';
import { BackLink, LoginGate, MapPlaceholder, Spinner } from '../components/ui';
import { appointmentTreatmentIds, bookingRef, bookUrl, displayStatus, isUpcoming, STATUS_STYLE } from '../utils/booking';
import { dayParts, money } from '../utils/format';
import { appointmentIcs, download, receiptText } from '../utils/files';
import NotFoundPage from './NotFoundPage';

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { openCancel } = useUi();
  const { appointment: a, loading } = useAppointment(user ? id : undefined);
  const { venue } = useVenue(a?.barberId);
  const [calMsg, setCalMsg] = useState('');

  if (authLoading || (user && loading)) return <Spinner />;
  if (!user)
    return (
      <div className="wrap w880 page">
        <LoginGate title="Your booking" text="Log in to see this booking." />
      </div>
    );
  if (!a) return <NotFoundPage />;

  const p = dayParts(a.date);
  const up = isUpcoming(a);
  const st = STATUS_STYLE[displayStatus(a)] ?? STATUS_STYLE.scheduled;
  const address = venue?.address ?? '';
  const due = Math.max(0, a.price - a.amountPaid);

  const actionBtn = { height: 48, borderRadius: 12, fontSize: 14, fontWeight: 700 } as const;

  return (
    <div className="wrap w880" style={{ paddingTop: 24, paddingBottom: 64 }}>
      <BackLink onClick={() => navigate('/appointments')}>My bookings</BackLink>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start', marginTop: 18 }}>
        <div style={{ flex: '1 1 420px', minWidth: 0 }}>
          <div className="row" style={{ gap: 8 }}>
            <span className="status-pill" style={{ background: st.bg, color: st.fg }}>{st.text}</span>
            <span className="muted" style={{ fontSize: 13, fontFamily: 'ui-monospace,monospace' }}>{bookingRef(a.id)}</span>
          </div>
          <h1 className="display" style={{ fontWeight: 800, fontSize: 'clamp(34px,5vw,56px)', letterSpacing: '-.035em', lineHeight: 0.95, margin: '14px 0 8px' }}>
            {p.dow} {p.dnum} {p.mon} · {a.time}
          </h1>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{a.serviceName}</div>
          <button
            onClick={() => navigate(`/venue/${a.barberId}`)}
            style={{ display: 'flex', gap: 14, alignItems: 'center', width: '100%', marginTop: 22, border: '1px solid var(--line)', borderRadius: 20, padding: 12, background: '#fff', textAlign: 'left', color: 'var(--ink)' }}
          >
            {venue && <img src={venue.image} alt="" style={{ width: 64, height: 64, borderRadius: 14, objectFit: 'cover' }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{a.barberName}</div>
              <div className="muted" style={{ fontSize: 14 }}>{address}</div>
            </div>
            <span className="muted" style={{ fontSize: 20 }}>›</span>
          </button>
          <MapPlaceholder label={`map · ${address}`} style={{ height: 200, marginTop: 12, borderRadius: 20 }} />
          {up && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,150px),1fr))', gap: 8, marginTop: 12 }}>
                <a
                  className="btn btn-outline"
                  style={actionBtn}
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Directions
                </a>
                <button
                  className="btn btn-outline"
                  style={actionBtn}
                  onClick={() => {
                    download(`primpy-${bookingRef(a.id)}.ics`, appointmentIcs(a, address), 'text/calendar');
                    setCalMsg('Added to your calendar');
                  }}
                >
                  Add to calendar
                </button>
                {venue?.phone ? (
                  <a className="btn btn-outline" style={actionBtn} href={`tel:${venue.phone.replace(/\s/g, '')}`}>
                    Call venue
                  </a>
                ) : (
                  <button className="btn btn-outline" style={{ ...actionBtn, color: 'var(--taken-fg)' }} disabled title="No phone number listed">
                    Call venue
                  </button>
                )}
              </div>
              <div className="ok-msg" style={{ marginTop: 8 }}>{calMsg}</div>
            </>
          )}
        </div>
        <div style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 15 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Payment</div>
            <div className="sum-row"><span className="muted">{a.serviceName}</span><span>{money(a.price)}</span></div>
            <div className="sum-row"><span className="muted">Paid online</span><span>{money(a.amountPaid)}</span></div>
            <div className="sum-row" style={{ paddingTop: 10, borderTop: '1px solid var(--hair)', fontWeight: 700 }}>
              <span>Due at venue</span>
              <span>{money(due)}</span>
            </div>
            <button className="btn-text" style={{ alignSelf: 'flex-start', paddingTop: 6, fontSize: 14, fontWeight: 700 }} onClick={() => download(`primpy-receipt-${bookingRef(a.id)}.txt`, receiptText(a, address), 'text/plain')}>
              Download receipt
            </button>
          </div>
          <div className="card card-pad">
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Your notes</div>
            <div className="muted" style={{ fontSize: 15 }}>{a.notes || 'No notes added'}</div>
          </div>
          {up ? (
            <>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn-ink h50 btn-bold" style={{ flex: '1 1 140px', fontSize: 15 }} onClick={() => navigate(bookUrl(a.barberId, { t: appointmentTreatmentIds(a, venue ?? undefined), d: a.date, r: a.id }))}>
                  Reschedule
                </button>
                <button className="btn btn-danger-soft h50" style={{ flex: '1 1 140px', fontSize: 15 }} onClick={() => openCancel(a)}>
                  Cancel booking
                </button>
              </div>
              <div className="muted" style={{ fontSize: 13 }}>
                Free changes up to 24 hours before.{' '}
                <button className="btn-text" style={{ fontSize: 13, fontWeight: 700 }} onClick={() => navigate('/help')}>
                  Policy
                </button>
              </div>
            </>
          ) : (
            <button className="btn btn-teal h50 btn-bold" style={{ fontSize: 15 }} onClick={() => navigate(`/venue/${a.barberId}`)}>
              Book again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
