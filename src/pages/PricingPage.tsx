import { useNavigate } from 'react-router-dom';
import { COMMISSION_PCT, PRICING, REPEAT_PCT, cardFeeLabel, newClientCommission } from '../config/pricing';
import { money } from '../utils/format';

/** Public partner pricing for venues. All numbers come from config/pricing. */
export default function PricingPage() {
  const navigate = useNavigate();
  const ex = PRICING.exampleTreatment;

  const tiles = [
    { big: '£0', title: 'To list', text: 'No upfront, setup or monthly fee. No contract.', bg: 'var(--teal-soft)', fg: 'var(--teal-dark)', body: '#2f4a46' },
    { big: COMMISSION_PCT, title: 'New clients only', text: 'Once, on a new client’s first completed booking through the Primpy marketplace.', bg: 'var(--amber-soft)', fg: 'var(--amber-ink)', body: '#5b4310' },
    { big: REPEAT_PCT, title: 'Repeat & direct', text: 'Every visit after a client’s first, and every booking from your own links.', bg: 'var(--surface)', fg: 'var(--ink)', body: 'var(--muted)' },
  ];

  const rules: [string, string][] = [
    ['Who counts as a new client?', `Someone your venue hasn’t completed a Primpy booking with in the last ${PRICING.newClientWindowDays} days.`],
    [`What’s always ${REPEAT_PCT}?`, 'Repeat bookings, and bookings from your own Primpy booking link, website, Google profile and social “Book now” buttons — plus clients you import or add yourself.'],
    ['Cancellations and no-shows', 'No commission on cancelled bookings or no-shows.'],
    ['Card fees', `If a client pays online through Primpy (deposit or pay in full), the card processing fee (${cardFeeLabel()}) is passed to them at cost, with no Primpy markup. If they pay you on the day, there’s no card fee from Primpy.`],
  ];

  return (
    <div className="wrap w880 page">
      <div className="eyebrow" style={{ color: 'var(--teal)', marginBottom: 12 }}>Pricing for venues</div>
      <h1 className="h-flow" style={{ marginBottom: 16, textWrap: 'balance' }}>
        Free to list. {COMMISSION_PCT} only on a new client’s first booking. Repeat and direct bookings are always {REPEAT_PCT}.
      </h1>
      <p className="muted" style={{ fontSize: 17, margin: '0 0 28px', maxWidth: 620, lineHeight: 1.5 }}>
        You only pay when Primpy brings you someone new. Your clients never pay Primpy commission.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,240px),1fr))', gap: 12, marginBottom: 40 }}>
        {tiles.map((t) => (
          <div key={t.title} style={{ background: t.bg, borderRadius: 22, padding: 20 }}>
            <div className="display" style={{ fontWeight: 800, fontSize: 32, color: t.fg }}>{t.big}</div>
            <div style={{ fontWeight: 700, marginTop: 6 }}>{t.title}</div>
            <div style={{ color: t.body, fontSize: 14, marginTop: 4, lineHeight: 1.45 }}>{t.text}</div>
          </div>
        ))}
      </div>

      <h2 className="display" style={{ fontWeight: 700, fontSize: 26, margin: '0 0 12px' }}>Who pays what</h2>
      <div className="card" style={{ overflow: 'hidden', marginBottom: 40 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)', textAlign: 'left' }}>
              <th scope="col" style={{ padding: '14px 18px', width: '28%' }}>Who</th>
              <th scope="col" style={{ padding: '14px 18px' }}>What they pay Primpy</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderTop: '1px solid var(--line)' }}>
              <th scope="row" style={{ padding: '16px 18px', textAlign: 'left', verticalAlign: 'top' }}>Salon</th>
              <td style={{ padding: '16px 18px', lineHeight: 1.5 }}>
                {COMMISSION_PCT} on a new client’s first Primpy booking, {REPEAT_PCT} otherwise. No monthly fee.
              </td>
            </tr>
            <tr style={{ borderTop: '1px solid var(--line)' }}>
              <th scope="row" style={{ padding: '16px 18px', textAlign: 'left', verticalAlign: 'top' }}>Guest</th>
              <td style={{ padding: '16px 18px', lineHeight: 1.5 }}>
                No commission. Card fee at cost only when paying online.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ background: 'var(--teal)', color: '#fff', borderRadius: 28, padding: 'clamp(24px,5vw,40px)', marginBottom: 40, position: 'relative', overflow: 'hidden' }}>
        <div className="circle-deco" style={{ right: -60, top: -60, width: 200, height: 200, opacity: 0.9 }} />
        <div className="eyebrow" style={{ position: 'relative', color: 'var(--teal-soft)', marginBottom: 10 }}>Worked example</div>
        <p className="display" style={{ position: 'relative', margin: 0, fontWeight: 700, fontSize: 'clamp(22px,3vw,30px)', lineHeight: 1.2, letterSpacing: '-.02em', maxWidth: 640 }}>
          A new client finds you on Primpy and books a {money(ex)} treatment: you pay {money(newClientCommission(ex))}, once. Every visit after that, and every booking from your own links: {money(0)}. Your client pays no Primpy commission.
        </p>
      </div>

      <h2 className="display" style={{ fontWeight: 700, fontSize: 26, margin: '0 0 4px' }}>The detail</h2>
      <div style={{ borderTop: '1px solid var(--line)', marginTop: 10 }}>
        {rules.map(([q, a]) => (
          <div key={q} style={{ borderBottom: '1px solid var(--line)', padding: '16px 0' }}>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{q}</div>
            <p className="muted" style={{ margin: '6px 0 0', fontSize: 15, lineHeight: 1.55, maxWidth: 640 }}>{a}</p>
          </div>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>{PRICING.vatNote}</p>

      <div className="card row" style={{ marginTop: 32, padding: 22, gap: 16 }}>
        <div style={{ flex: '1 1 260px' }}>
          <div style={{ fontWeight: 700, fontSize: 17 }}>Ready to list your venue?</div>
          <div className="muted" style={{ fontSize: 14, marginTop: 2 }}>Free to join, no monthly fee. More answers in Help.</div>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-outline btn-sm h48" style={{ fontSize: 15 }} onClick={() => navigate('/help')}>
            Business FAQ
          </button>
          <button className="btn btn-teal btn-sm h48 btn-bold" style={{ fontSize: 15, padding: '0 20px' }} onClick={() => navigate('/business/signup')}>
            List your venue
          </button>
        </div>
      </div>
    </div>
  );
}
