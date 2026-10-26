import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { Stripe, StripeElements } from '@stripe/stripe-js';
import { useVenue } from '../hooks/useVenues';
import { useAuth } from '../context/AuthContext';
import { useUserData } from '../context/UserDataContext';
import { createAppointment } from '../services/appointments';
import { createBookingIntent, getStripe, paymentsEnabled, type BookingIntent } from '../services/payments';
import { validatePromo } from '../services/stubs';
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

/** Step 3 of booking: pay at venue, pay a deposit, or pay in full (Stripe). */
export default function PayPage() {
  const { id } = useParams<{ id: string }>();
  const [sp] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { venue, loading } = useVenue(id);
  const params = readBookingParams(sp);

  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [promo, setPromo] = useState('');
  const [credit, setCredit] = useState(0);
  const [promoMsg, setPromoMsg] = useState('');
  const [intent, setIntent] = useState<BookingIntent | null>(null);
  const [intentError, setIntentError] = useState('');

  const items = useMemo(() => venue?.treatments.filter((t) => params.t.includes(t.id)) ?? [], [venue, params.t]);
  const deposit = venue?.deposit && paymentsEnabled ? venue.deposit : 0;
  const m: PaymentMethod = method ?? (deposit ? 'deposit' : 'venue');

  // Ask the server for a PaymentIntent whenever the amount could change.
  const promoCode = credit ? promo.trim().toUpperCase() : '';
  useEffect(() => {
    setIntent(null);
    setIntentError('');
    if (!venue || !user || m === 'venue' || !paymentsEnabled || !params.time || !params.d) return;
    let live = true;
    createBookingIntent({ venueId: venue.id, treatmentIds: params.t, date: params.d, time: params.time, method: m, promoCode: promoCode || undefined })
      .then((i) => live && setIntent(i))
      .catch((e) => live && setIntentError(e instanceof Error ? e.message : 'Could not start payment'));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue?.id, user?.id, m, promoCode, params.d, params.time, params.t.join(',')]);

  if (loading || authLoading) return <Spinner />;
  if (!venue) return <NotFoundPage />;
  if (!items.length || !params.d || !params.time) return <Navigate to={bookUrl(venue.id, params)} replace />;
  if (!user)
    return (
      <div className="wrap w780 page">
        <LoginGate title="Almost there" text="Log in to confirm your booking." />
      </div>
    );

  const applyPromo = async () => {
    setPromoMsg('');
    try {
      const r = await validatePromo(promo);
      setCredit(r.credit);
      setPromoMsg(r.label);
    } catch (e) {
      setCredit(0);
      setPromoMsg(e instanceof Error ? e.message : 'That code didn’t work');
    }
  };

  const view = (stripe: Stripe | null, elements: StripeElements | null) => (
    <PayView
      venue={venue}
      items={items}
      method={m}
      deposit={deposit}
      setMethod={setMethod}
      promo={promo}
      setPromo={(v) => {
        setPromo(v);
        setPromoMsg('');
      }}
      applyPromo={applyPromo}
      promoMsg={promoMsg}
      credit={credit}
      intent={intent}
      intentError={intentError}
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
  method: PaymentMethod;
  deposit: number;
  setMethod: (m: PaymentMethod) => void;
  promo: string;
  setPromo: (v: string) => void;
  applyPromo: () => void;
  promoMsg: string;
  credit: number;
  intent: BookingIntent | null;
  intentError: string;
  stripe: Stripe | null;
  elements: StripeElements | null;
}) {
  const { venue, items, method: m, deposit, intent, stripe, elements } = props;
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const params = readBookingParams(sp);
  const { user } = useAuth();
  const { reloadBookings } = useUserData();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const creating = useRef(false);

  const total = items.reduce((a, t) => a + t.price, 0);
  const credit = Math.min(props.credit, total);
  const dep = deposit ? Math.round(total * deposit) : 0;
  const estNow = m === 'full' ? total - credit : m === 'deposit' ? Math.max(0, dep - credit) : 0;
  // The server's amount wins once there is a PaymentIntent.
  const dueNow = intent ? intent.amount / 100 : estNow;
  const dueLater = Math.max(0, total - credit - dueNow);
  const when = whenText(params.d!, params.time);

  const book = async (amountPaid: number, paymentIntentId?: string) => {
    if (creating.current || !user) return;
    creating.current = true;
    const id = await createAppointment({
      userId: user.id,
      venueId: venue.id,
      venueName: venue.name,
      treatments: items.map((t) => ({ id: t.id, name: t.name, price: t.price, duration: t.duration })),
      date: params.d!,
      time: params.time!,
      notes: params.notes,
      paymentMethod: m,
      amountPaid,
      paymentIntentId,
    });
    reloadBookings();
    navigate(`/booked/${id}`, { replace: true });
  };

  // Back from a redirect-based payment method (3-D Secure, wallets).
  useEffect(() => {
    const pi = sp.get('payment_intent');
    const status = sp.get('redirect_status');
    if (!pi || !user) return;
    const key = `primpy:booked:${pi}`;
    if (sessionStorage.getItem(key)) return;
    if (status === 'succeeded') {
      sessionStorage.setItem(key, '1');
      book(Number(sp.get('amount') ?? 0), pi).catch((e) => setError(e?.message ?? 'Booking failed'));
    } else if (status) setError('Payment didn’t go through. Try again or pay at the venue.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      if (m === 'venue' || dueNow === 0) {
        await book(0);
        return;
      }
      if (!stripe || !elements || !intent) throw new Error(props.intentError || 'Payment is still loading.');
      const returnUrl = new URL(window.location.href);
      returnUrl.searchParams.set('amount', String(dueNow));
      const res = await stripe.confirmPayment({ elements, redirect: 'if_required', confirmParams: { return_url: returnUrl.toString() } });
      if (res.error) throw new Error(res.error.message ?? 'Payment failed');
      if (res.paymentIntent && ['succeeded', 'processing', 'requires_capture'].includes(res.paymentIntent.status)) {
        await book(dueNow, res.paymentIntent.id);
      } else throw new Error('Payment didn’t complete.');
    } catch (e) {
      creating.current = false;
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setBusy(false);
    }
  };

  const off = 'Card payments aren’t set up yet';
  const opts: [PaymentMethod, string, string, boolean][] = [
    ['venue', 'Pay at the venue', dep ? 'Not available — this venue asks for a deposit' : 'Nothing to pay today', !dep],
    ['deposit', 'Pay a deposit now', !paymentsEnabled ? off : dep ? `${money(dep)} now, the rest at the venue` : 'Not required by this venue', !!dep],
    ['full', 'Pay in full now', paymentsEnabled ? 'Settle up now and skip the till' : off, paymentsEnabled],
  ];

  return (
    <>
      <div className="wrap w780" style={{ paddingTop: 24, paddingBottom: 48 }}>
        <div className="stepper">
          <button className="done" onClick={() => navigate(`/venue/${venue.id}?t=${params.t.join(',')}`)}>
            ✓ {items.length} treatment{items.length === 1 ? '' : 's'}
          </button>
          <span className="sep" />
          <button className="done" onClick={() => navigate(bookUrl(venue.id, { ...params, time: params.time }))}>
            ✓ {when}
          </button>
          <span className="sep" />
          <span className="cur">3 · Pay</span>
        </div>
        <h1 className="h-flow" style={{ marginBottom: 24 }}>How would you like to pay?</h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {opts.map(([id, label, desc, ok]) => (
            <button key={id} className={`radio-card${m === id ? ' on' : ''}`} disabled={!ok} onClick={() => ok && props.setMethod(id)} role="radio" aria-checked={m === id}>
              <span className="dot" />
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{label}</div>
                <div className="muted" style={{ fontSize: 14, marginTop: 2 }}>{desc}</div>
              </div>
            </button>
          ))}
        </div>

        {m !== 'venue' && (
          <div className="card card-pad" style={{ marginTop: 20 }}>
            <div className="label" style={{ marginBottom: 12 }}>Card</div>
            {props.intentError ? (
              <div className="err" style={{ marginTop: 0 }}>{props.intentError}</div>
            ) : intent ? (
              <PaymentElement options={{ layout: 'tabs' }} />
            ) : (
              <div className="muted" style={{ fontSize: 14 }}>Loading secure card form…</div>
            )}
          </div>
        )}

        <div className="card card-pad" style={{ marginTop: 20 }}>
          <div className="label" style={{ marginBottom: 12 }}>Gift card or promo code</div>
          <div className="row" style={{ gap: 8 }}>
            <input
              className="input h50"
              value={props.promo}
              onChange={(e) => props.setPromo(e.target.value)}
              placeholder="e.g. GLOW-1234"
              style={{ flex: '1 1 200px', width: 'auto', textTransform: 'uppercase' }}
            />
            <button className="btn btn-ink btn-sm h50 btn-bold" style={{ padding: '0 20px', fontSize: 15 }} onClick={props.applyPromo}>
              Apply
            </button>
          </div>
          <div className="ok-msg" style={{ marginTop: 8, color: credit ? 'var(--teal-dark)' : 'var(--danger)' }}>{props.promoMsg}</div>
        </div>

        <div className="card card-pad" style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 15 }}>
          <div className="sum-row"><span className="muted">Subtotal</span><span>{money(total)}</span></div>
          {credit > 0 && (
            <div className="sum-row" style={{ color: 'var(--teal-dark)', fontWeight: 600 }}>
              <span>Gift card</span>
              <span>−{money(credit)}</span>
            </div>
          )}
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
        sub={dueNow > 0 ? `${money(dueLater)} due at venue` : `Pay ${money(total - credit)} at the venue`}
        cta={busy ? 'Booking…' : dueNow > 0 ? `Pay ${money(dueNow)}` : 'Confirm booking'}
        disabled={busy || (m !== 'venue' && dueNow > 0 && !intent)}
        onCta={confirm}
      />
    </>
  );
}
