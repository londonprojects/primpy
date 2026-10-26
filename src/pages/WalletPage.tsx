import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUserData } from '../context/UserDataContext';
import { giftBalance, redeemGiftCard, saveCards, savedCards } from '../services/stubs';
import { BackLink, LoginGate, Spinner } from '../components/ui';
import { displayStatus } from '../utils/booking';
import { dayParts, money } from '../utils/format';

/** Payment & receipts. Cards and gift balance are stubs until the Stripe customer API exists. */
export default function WalletPage() {
  const { user, loading } = useAuth();
  const { bookings } = useUserData();
  const navigate = useNavigate();
  const [cards, setCards] = useState(() => (user ? savedCards(user.id) : { cards: [], defaultId: null }));
  const [balance, setBalance] = useState(() => (user ? giftBalance(user.id) : 0));
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');

  if (loading) return <Spinner />;
  if (!user)
    return (
      <div className="wrap w780 page">
        <LoginGate title="Payment & receipts" text="Log in to manage cards and receipts." />
      </div>
    );

  const setAndSave = (next: typeof cards) => {
    setCards(next);
    saveCards(user.id, next);
  };

  const redeem = async () => {
    setMsg('');
    try {
      const next = await redeemGiftCard(user.id, code);
      setBalance(next);
      setCode('');
      setMsg(`${money(next - balance)} added to your balance`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Enter a valid code');
    }
  };

  const receipts = bookings.filter((b) => b.status !== 'cancelled');

  return (
    <div className="wrap w780 page">
      <BackLink onClick={() => navigate('/account')}>Account</BackLink>
      <h1 className="h-page" style={{ margin: '14px 0 24px' }}>Payment &amp; receipts</h1>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="between" style={{ marginBottom: 10 }}>
          <h2 className="h-card">Cards</h2>
          {/* TODO(backend): open a Stripe SetupIntent to add a real card. */}
          <button
            className="btn-text"
            style={{ padding: '8px 0', fontSize: 14, fontWeight: 700 }}
            onClick={() =>
              import.meta.env.DEV
                ? setAndSave({ ...cards, cards: [...cards.cards, { id: `c${Date.now()}`, last4: String(1000 + Math.floor(Math.random() * 9000)), exp: '11/29' }] })
                : setMsg('Cards are saved when you pay for a booking.')
            }
          >
            Add card
          </button>
        </div>
        {cards.cards.length === 0 && <p className="muted" style={{ margin: '6px 0', fontSize: 14 }}>No saved cards yet.</p>}
        {cards.cards.map((c) => (
          <div key={c.id} className="row" style={{ padding: '12px 0', borderTop: '1px solid var(--hair)' }}>
            <span style={{ width: 42, height: 28, borderRadius: 6, background: 'var(--ink)', flex: '0 0 auto' }} />
            <div style={{ flex: '1 1 140px' }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>•••• {c.last4}</div>
              <div className="muted" style={{ fontSize: 13 }}>Expires {c.exp}</div>
            </div>
            {c.id === cards.defaultId ? (
              <span className="status-pill" style={{ background: 'var(--teal-soft)', color: 'var(--teal-dark)' }}>Default</span>
            ) : (
              <button className="btn-text" style={{ padding: 8, fontSize: 14, fontWeight: 700 }} onClick={() => setAndSave({ ...cards, defaultId: c.id })}>
                Make default
              </button>
            )}
            <button
              className="btn-text"
              style={{ padding: 8, fontSize: 14, color: 'var(--danger)' }}
              onClick={() => {
                const rest = cards.cards.filter((x) => x.id !== c.id);
                setAndSave({ cards: rest, defaultId: cards.defaultId === c.id ? (rest[0]?.id ?? null) : cards.defaultId });
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <h2 className="h-card">Gift card balance</h2>
          <span className="display" style={{ fontWeight: 800, fontSize: 32 }}>{money(balance)}</span>
        </div>
        <div className="row" style={{ gap: 8, marginTop: 12 }}>
          <input className="input h50" value={code} onChange={(e) => { setCode(e.target.value); setMsg(''); }} placeholder="Gift card code" style={{ flex: '1 1 200px', width: 'auto', textTransform: 'uppercase' }} />
          <button className="btn btn-ink btn-sm h50 btn-bold" style={{ padding: '0 20px', fontSize: 15 }} onClick={redeem}>
            Redeem
          </button>
        </div>
        <div className="ok-msg" style={{ marginTop: 8 }}>{msg}</div>
      </div>

      <div className="card card-pad">
        <h2 className="h-card" style={{ marginBottom: 6 }}>Receipts</h2>
        {receipts.length === 0 && <p className="muted" style={{ margin: '6px 0', fontSize: 14 }}>Receipts for your bookings appear here.</p>}
        {receipts.map((b) => {
          const p = dayParts(b.date);
          const done = displayStatus(b) === 'completed';
          return (
            <button key={b.id} onClick={() => navigate(`/booking/${b.id}`)} className="row" style={{ width: '100%', flexWrap: 'nowrap', padding: '14px 0', border: 0, borderTop: '1px solid var(--hair)', background: 'none', textAlign: 'left', color: 'var(--ink)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{b.serviceName}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {b.barberName} · {p.dnum} {p.mon} · {done ? (b.amountPaid >= b.price ? 'Paid online' : 'Paid at venue') : 'Upcoming'}
                </div>
              </div>
              <span style={{ fontWeight: 700 }}>{money(b.price)}</span>
              <span className="muted">›</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
