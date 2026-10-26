import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchaseGiftCard } from '../services/stubs';
import Logo from '../components/Logo';

const DESIGNS: [string, string, string][] = [
  ['var(--teal)', '#fff', 'var(--amber)'],
  ['var(--amber)', 'var(--ink)', 'var(--teal)'],
  ['var(--ink)', '#fff', 'var(--amber)'],
];
const AMOUNTS = [25, 50, 75, 100];

export default function GiftPage() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState(50);
  const [design, setDesign] = useState(0);
  const [to, setTo] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [bg, fg, accent] = DESIGNS[design];
  const toText = to.trim() || 'Someone lovely';

  const buy = async () => {
    if (!/.+@.+\..+/.test(email)) return setError('Enter their email address.');
    setBusy(true);
    setError('');
    try {
      await purchaseGiftCard({ amount, design, to: to.trim(), email: email.trim(), message: message.trim() });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not buy the gift card');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrap w1100 page">
      <h1 className="h-flow" style={{ marginBottom: 8 }}>Gift cards</h1>
      <p className="muted" style={{ margin: '0 0 28px', fontSize: 16 }}>Sent by email, spendable at any Primpy venue. Never expires.</p>
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 360px', position: 'sticky', top: 96 }}>
          <div style={{ aspectRatio: '1.6 / 1', borderRadius: 24, background: bg, color: fg, padding: 'clamp(20px,4vw,32px)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', boxShadow: '0 24px 50px -24px rgba(0,0,0,.35)' }}>
            <div style={{ position: 'absolute', right: -50, bottom: -50, width: 180, height: 180, borderRadius: '50%', background: accent }} />
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Logo size={24} style={{ color: 'inherit' }} />
              <span className="display" style={{ fontWeight: 800, fontSize: 'clamp(36px,5vw,52px)', letterSpacing: '-.03em', lineHeight: 1 }}>£{amount}</span>
            </div>
            <div style={{ position: 'relative', marginTop: 'auto' }}>
              <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.8 }}>For {toText}</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4, maxWidth: '70%' }}>{message.trim() || 'Treat yourself — you deserve it.'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            {DESIGNS.map(([b], i) => (
              <button key={i} title={`Design ${i + 1}`} aria-pressed={i === design} onClick={() => setDesign(i)} style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #fff', background: b, boxShadow: `0 0 0 2px ${i === design ? 'var(--ink)' : 'transparent'}` }} />
            ))}
          </div>
        </div>

        <div style={{ flex: '1 1 360px', minWidth: 0 }}>
          {done ? (
            <div className="card" style={{ borderRadius: 24, padding: 'clamp(24px,4vw,36px)' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--teal)', color: '#fff', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</div>
              <h2 className="display" style={{ fontWeight: 800, fontSize: 32, letterSpacing: '-.03em', margin: '18px 0 8px' }}>Gift card sent</h2>
              <p className="muted" style={{ fontSize: 16, margin: 0 }}>£{amount} for {toText} is on its way to their inbox.</p>
              <div className="row" style={{ gap: 10, marginTop: 22 }}>
                <button className="btn btn-outline h50" style={{ flex: '1 1 160px', fontSize: 15 }} onClick={() => { setDone(false); setTo(''); setEmail(''); setMessage(''); }}>
                  Send another
                </button>
                <button className="btn btn-ink h50" style={{ flex: '1 1 160px', fontSize: 15 }} onClick={() => navigate('/')}>
                  Back to explore
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="label" style={{ marginBottom: 10 }}>Amount</div>
              <div className="row" style={{ gap: 8, marginBottom: 22 }}>
                {AMOUNTS.map((a) => (
                  <button key={a} onClick={() => setAmount(a)} style={{ flex: '1 1 70px', height: 52, borderRadius: 14, border: `2px solid ${a === amount ? 'var(--ink)' : 'var(--line)'}`, background: a === amount ? 'var(--ink)' : '#fff', color: a === amount ? '#fff' : 'var(--ink)', fontSize: 17, fontWeight: 700 }}>
                    £{a}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label className="field">
                  Recipient's name
                  <input className="input h50" value={to} onChange={(e) => setTo(e.target.value)} />
                </label>
                <label className="field">
                  Their email
                  <input className="input h50" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} />
                </label>
                <label className="field">
                  Message
                  <textarea className="input" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Treat yourself — you deserve it." style={{ borderRadius: 12, padding: '12px 14px', fontSize: 16 }} />
                </label>
              </div>
              {error && <div className="err">{error}</div>}
              <button className="btn btn-teal btn-block h56 btn-bold" style={{ marginTop: 22 }} disabled={busy} onClick={buy}>
                Buy £{amount} gift card
              </button>
              <p className="muted" style={{ fontSize: 13, textAlign: 'center', margin: '10px 0 0' }}>
                Delivered instantly. Have a code? Add it when you pay for a booking.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
