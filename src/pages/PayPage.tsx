import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { Stripe, StripeElements } from '@stripe/stripe-js';
import { useVenue } from '../hooks/useVenues';
import { useAuth } from '../context/AuthContext';
import { useUserData } from '../context/UserDataContext';
import { getStripe, paymentsEnabled } from '../services/payments';
import {
  confirmPayment,
  createBooking,
  createPaymentIntent,
  type BookingResult,
  type PaymentIntentResult,
} from '../services/snipApi';
import FloatingBar, { BarSpacer } from '../components/FloatingBar';
import { LoginGate, Spinner } from '../components/ui';
import type { PaymentMethod, Venue } from '../types';
import { bookUrl, readBookingParams } from '../utils/booking';
import { money, whenText } from '../utils/format';
import NotFoundPage from './NotFoundPage';

const appearance = {
  theme: 'stripe' as const,
  variables: {
    colorPrimary: '#0b7b73',
    colorText: '#0e1513',
    colorDanger: '#9a3324',
    colorBackground: '#f2f4f3',
    fontFamily: 'Figtree, system-ui, sans-serif',
    borderRadius: '12px',
  },
};
const FONTS = [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;700&display=swap' }];

/** Which ways to pay this venue offers. The server enforces the same rules. */
function offered(venue: Venue): Record<PaymentMethod, boolean> {
  return {
    venue: venue.payAtVenue === true,
    deposit: paymentsEnabled && !!venue.deposit,
    full: paymentsEnabled,
  };
}

/**
 * Step 3 of booking: pay at the venue, pay a deposit, or pay in full.
 *
 * The booking is made through the Snip API: the server prices the treatments, holds the time
 * and works out what's due now. Paying online then charges exactly that amount (Stripe), and
 * the server confirms the booking once the payment succeeds.
 */
export default function PayPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { venue, loading } = useVenue(id);
  const [sp] = useSearchParams();
  const params = readBookingParams(sp);

  const [booking, setBooking] = useState<BookingResult | null>(null);
  const [intent, setIntent] = useState<PaymentIntentResult | null>(null);

  const items = useMemo(() => venue?.treatments.filter((t) => params.t.includes(t.id)) ?? [], [venue, params.t]);

  if (loading || authLoading) return <Spinner />;
  if (!venue) return <NotFoundPage />;
  if (!items.length || !params.d || !params.time) return <Navigate to={bookUrl(venue.id, params)} replace />;
  if (!user)
    return (
      <div className="wrap w780 page">
        <LoginGate title="Almost there" text="Log in to confirm your booking." />
      </div>
    );

  const view = (stripe: Stripe | null, elements: StripeElements | null) => (
    <PayView
      venue={venue}
      items={items}
      booking={booking}
      setBooking={setBooking}
      intent={intent}
      setIntent={setIntent}
      stripe={stripe}
      elements={elements}
    />
  );

  const stripePromise = getStripe();
  if (intent && stripePromise) {
    return (
      <Elements key={intent.clientSecret} stripe={stripePromise} options={{ clientSecret: intent.clientSecret, appearance, fonts: FONTS }}>
        <WithStripe>{view}</WithStripe>
      </Elements>
    );
  }
  return view(null, null);
}

function WithStripe({ children }: { children: (s: Stripe | null, e: StripeElements | null) => React.ReactNode }) {
  const stripe = useStripe();
  const elements = useElements();
  return <>{children(stripe, elements)}</>;
}

function PayView(props: {
  venue: Venue;
  items: Venue['treatments'];
  booking: BookingResult | null;
  setBooking: (b: BookingResult | null) => void;
  intent: PaymentIntentResult | null;
  setIntent: (i: PaymentIntentResult | null) => void;
  stripe: Stripe | null;
  elements: StripeElements | null;
}) {
  const { venue, items, booking, intent, stripe, elements } = props;
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const params = readBookingParams(sp);
  const { reloadBookings } = useUserData();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const confirming = useRef(false);

  const can = offered(venue);
  const firstOffered = (['deposit', 'venue', 'full'] as PaymentMethod[]).find((k) => can[k]) ?? null;
  const [method, setMethod] = useState<PaymentMethod | null>(firstOffered);
  const m = booking?.paymentMethod ?? method;

  const total = items.reduce((a, t) => a + t.price, 0);
  const dep = venue.deposit ? Math.round(total * venue.deposit) : 0;
  const estNow = m === 'full' ? total : m === 'deposit' ? dep : 0;
  // Once the server has priced the booking, its amount wins.
  const dueNow = booking ? booking.amountDueCents / 100 : estNow;
  const priced = booking ? booking.priceCents / 100 : total;
  const dueLater = Math.max(0, priced - dueNow);
  const when = whenText(params.d!, params.time);

  const done = (appointmentId: string) => {
    reloadBookings();
    navigate(`/booked/${appointmentId}`, { replace: true });
  };

  // Back from a redirect-based payment method (3-D Secure, wallets).
  useEffect(() => {
    const appt = sp.get('appt');
    const status = sp.get('redirect_status');
    if (!appt || !status) return;
    const key = `primpy:confirmed:${appt}`;
    if (sessionStorage.getItem(key)) return;
    if (status === 'succeeded') {
      sessionStorage.setItem(key, '1');
      confirmPayment(appt)
        .then(() => done(appt))
        .catch(() => done(appt)); // the Stripe webhook confirms it too; show the booking either way
    } else setError('Payment didn’t go through. Please try again.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Step 1: reserve the time on the server (and, if paying now, get the card form ready). */
  const reserve = async () => {
    if (!m) return;
    const created = await createBooking({
      venueId: venue.id,
      treatmentIds: items.map((t) => t.id),
      date: params.d!,
      time: params.time!,
      paymentMethod: m,
      notes: params.notes,
    });
    props.setBooking(created);
    if (created.amountDueCents === 0) {
      done(created.appointmentId);
      return;
    }
    props.setIntent(await createPaymentIntent(created.appointmentId));
  };

  /** Step 2: pay the amount the server set, then let the server confirm the booking. */
  const pay = async () => {
    if (!booking || !stripe || !elements) throw new Error('The card form is still loading.');
    const returnUrl = new URL(window.location.href);
    returnUrl.searchParams.set('appt', booking.appointmentId);
    const res = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: { return_url: returnUrl.toString() },
    });
    if (res.error) throw new Error(res.error.message ?? 'Payment failed');
    if (!res.paymentIntent || !['succeeded', 'processing'].includes(res.paymentIntent.status)) {
      throw new Error('Payment didn’t complete.');
    }
    try {
      await confirmPayment(booking.appointmentId);
    } catch {
      // The Stripe webhook also confirms the booking; don't make the customer pay twice.
    }
    done(booking.appointmentId);
  };

  const onCta = async () => {
    if (confirming.current) return;
    confirming.current = true;
    setBusy(true);
    setError('');
    try {
      if (!booking || !intent) await reserve();
      else await pay();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      confirming.current = false;
      setBusy(false);
    }
  };

  const off = 'Card payments aren’t set up yet';
  const opts: [PaymentMethod, string, string][] = [
    ['venue', 'Pay at the venue', can.venue ? 'Nothing to pay today' : 'This venue asks you to pay when you book'],
    ['deposit', 'Pay a deposit now', !paymentsEnabled ? off : dep ? `${money(dep)} now, the rest at the venue` : 'Not offered by this venue'],
    ['full', 'Pay in full now', paymentsEnabled ? 'Settle up now and skip the till' : off],
  ];
  const locked = !!booking; // the time is held for this payment choice

  const cta = busy
    ? m === 'venue'
      ? 'Booking…'
      : 'Please wait…'
    : !booking && dueNow > 0
      ? 'Continue to payment'
      : dueNow > 0
        ? `Pay ${money(dueNow)}`
        : 'Confirm booking';

  return (
    <>
      <div className="wrap w780" style={{ paddingTop: 24, paddingBottom: 48 }}>
        <div className="stepper">
          <button className="done" disabled={locked} onClick={() => navigate(`/venue/${venue.id}?t=${params.t.join(',')}`)}>
            ✓ {items.length} treatment{items.length === 1 ? '' : 's'}
          </button>
          <span className="sep" />
          <button className="done" disabled={locked} onClick={() => navigate(bookUrl(venue.id, { ...params, time: params.time }))}>
            ✓ {when}
          </button>
          <span className="sep" />
          <span className="cur">3 · Pay</span>
        </div>
        <h1 className="h-flow" style={{ marginBottom: 24 }}>How would you like to pay?</h1>

        {!firstOffered ? (
          <div className="banner-amber" style={{ padding: '12px 14px' }}>
            This venue isn’t taking online bookings right now. Please contact them directly.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {opts.map(([id, label, desc]) => {
              const ok = can[id] && !locked;
              return (
                <button key={id} className={`radio-card${m === id ? ' on' : ''}`} disabled={!ok} onClick={() => ok && setMethod(id)} role="radio" aria-checked={m === id}>
                  <span className="dot" />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{label}</div>
                    <div className="muted" style={{ fontSize: 14, marginTop: 2 }}>{desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {intent && (
          <div className="card card-pad" style={{ marginTop: 20 }}>
            <div className="label" style={{ marginBottom: 12 }}>Card</div>
            <PaymentElement options={{ layout: 'tabs' }} />
            {booking?.holdExpiresAtMs ? (
              <div className="muted" style={{ fontSize: 13, marginTop: 10 }}>
                We’re holding this time for you for a few minutes while you pay.
              </div>
            ) : null}
          </div>
        )}

        <div className="card card-pad" style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 15 }}>
          <div className="sum-row"><span className="muted">Subtotal</span><span>{money(priced)}</span></div>
          <div className="sum-row" style={{ paddingTop: 10, borderTop: '1px solid var(--hair)', fontWeight: 700, fontSize: 17 }}>
            <span>Due now</span>
            <span>{money(dueNow)}</span>
          </div>
          <div className="sum-row muted"><span>Due at venue</span><span>{money(dueLater)}</span></div>
          <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
            Free changes up to 24 hours before.{' '}
            <button className="btn-text" style={{ fontSize: 13, fontWeight: 700 }} onClick={() => navigate('/help')}>
              Cancellation policy
            </button>
          </div>
        </div>
        {error && <div className="err">{error}</div>}
        <BarSpacer />
      </div>

      <FloatingBar
        title={when}
        sub={dueNow > 0 ? `${money(dueLater)} due at venue` : `Pay ${money(priced)} at the venue`}
        cta={cta}
        disabled={busy || !m || (!!booking && !intent)}
        onCta={onCta}
      />
    </>
  );
}
