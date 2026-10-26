import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Appointment, Venue } from '../types';
import { fetchVenues } from '../services/venues';
import { cancelAppointment } from '../services/appointments';
import { requestRefund } from '../services/payments';
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

  const late = msUntil(a.date, a.time) < DAY_MS;
  const paid = a.amountPaid;
  const keeps = late && paid > 0;
  const p = dayParts(a.date);
  const msg = keeps
    ? `This is less than 24 hours away, so the ${money(paid)} deposit won’t be refunded.`
    : late
      ? 'Nothing has been paid online, so cancelling is free.'
      : `It’s more than 24 hours away, so cancelling is free${paid > 0 ? ` and your ${money(paid)} is refunded` : ''}.`;

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      if (paid > 0 && !late) await requestRefund(a.id);
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
