import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Appointment, Venue } from '../types';
import { fetchVenues } from '../services/venues';
import { cancelAppointment } from '../services/appointments';
import { useUserData } from '../context/UserDataContext';
import { appointmentTreatmentIds, bookUrl } from '../utils/booking';
import { dayParts, money, msUntil } from '../utils/format';

const DAY_MS = 86400000;

/** Replaces window.confirm: booking summary, fee message, reschedule instead. */
export default function CancelModal({ appointment: a, onClose }: { appointment: Appointment; onClose: () => void }) {
  const navigate = useNavigate();
  const { patchBooking } = useUserData();
  const [venue, setVenue] = useState<Venue | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchVenues()
      .then((vs) => setVenue(vs.find((v) => v.id === a.barberId)))
      .catch(() => undefined);
  }, [a.barberId]);

  // Mirrors the server's policy (it decides the actual refund): within 24 hours the venue keeps
  // the deposit, or a deposit-sized part of a full payment; otherwise everything is refunded.
  const late = msUntil(a.date, a.time) < DAY_MS;
  const paid = a.amountPaid;
  const kept = late ? Math.min(paid, Math.round(a.price * (venue?.deposit ?? 0) * 100) / 100) : 0;
  const refund = Math.max(0, paid - kept);
  const keeps = kept > 0;
  const p = dayParts(a.date);
  const msg = keeps
    ? `This is less than 24 hours away, so ${money(kept)} won’t be refunded${refund > 0 ? ` and ${money(refund)} is refunded` : ''}.`
    : paid > 0
      ? `Cancelling is free and your ${money(paid)} is refunded.`
      : 'Nothing has been paid online, so cancelling is free.';

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      await cancelAppointment(a.id);
      patchBooking(a.id, { status: 'cancelled' });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not cancel. Please try again.');
      setBusy(false);
    }
  };

  const reschedInstead = () => {
    onClose();
    navigate(bookUrl(a.barberId, { t: appointmentTreatmentIds(a, venue), d: a.date, r: a.id }));
  };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <h2 className="h-modal" style={{ marginBottom: 14 }}>
          Cancel this booking?
        </h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--surface)', borderRadius: 16, padding: 12 }}>
          {venue && <img src={venue.image} alt="" style={{ width: 52, height: 52, borderRadius: 12, objectFit: 'cover' }} />}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{a.serviceName}</div>
            <div className="muted" style={{ fontSize: 14 }}>
              {a.barberName} · {p.dow} {p.dnum} {p.mon}, {a.time}
            </div>
          </div>
        </div>
        <div className={keeps ? 'banner-amber' : 'banner-teal'} style={{ marginTop: 14, padding: '12px 14px', lineHeight: 1.45 }}>
          {msg}
        </div>
        {error && <div className="err">{error}</div>}
        <button className="btn btn-outline btn-block h52 btn-bold" style={{ marginTop: 18, fontSize: 15 }} onClick={reschedInstead}>
          Reschedule instead
        </button>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="btn btn-ink h52 btn-bold" style={{ flex: 1, fontSize: 15 }} onClick={onClose}>
            Keep it
          </button>
          <button className="btn btn-danger-soft h52" style={{ flex: 1, fontSize: 15 }} disabled={busy} onClick={confirm}>
            {busy ? 'Cancelling…' : 'Cancel booking'}
          </button>
        </div>
      </div>
    </div>
  );
}
