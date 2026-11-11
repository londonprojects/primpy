import { useState } from 'react';
import { Link } from 'react-router-dom';
import { COMMISSION_PCT, PRICING, REPEAT_PCT } from '../config/pricing';

// TODO(content): placeholder policy wording — confirm with the business before launch.
const TILES = [
  { big: '24h+', title: 'Free to change', text: 'Cancel or reschedule for free up to 24 hours before.', bg: 'var(--teal-soft)', fg: 'var(--teal-dark)', body: '#2f4a46' },
  { big: '<24h', title: 'Late changes', text: 'The venue may keep your deposit if you have one.', bg: 'var(--amber-soft)', fg: 'var(--amber-ink)', body: '#5b4310' },
  { big: 'No-show', title: 'Missed appointments', text: 'Deposits are kept and repeat no-shows may limit booking.', bg: 'var(--danger-soft)', fg: 'var(--danger)', body: '#6b2a1f' },
];

const FAQ_CUSTOMERS: [string, string][] = [
  ['How do I cancel or reschedule?', 'Open My bookings and choose Reschedule or Cancel. Changes are free up to 24 hours before your appointment.'],
  ['What happens if I cancel late?', 'Inside 24 hours, the venue may keep your deposit. Without a deposit, repeated late cancellations can limit future bookings.'],
  ['When am I charged?', 'Only if you pay a deposit or pay in full when booking. Otherwise you pay the venue on the day. If you pay online, a small card processing fee is added at cost. Paying at the venue has no fee.'],
  ['How do gift cards work?', 'Enter the code at checkout. The balance never expires and can be split across bookings.'],
  ['Will my booking show in Snip?', 'Yes — Primpy and Snip share one account and one booking system.'],
];

const FAQ_BUSINESS: [string, string][] = [
  ['How much does Primpy cost?', `Listing is free, with no setup fee, monthly fee or contract. You pay ${COMMISSION_PCT} once, only on a new client’s first completed booking through the Primpy marketplace. Repeat and direct bookings are ${REPEAT_PCT}. ${PRICING.vatNote}`],
  ['Who counts as a new client?', `A client your venue hasn’t completed a Primpy booking with in the last ${PRICING.newClientWindowDays} days.`],
  ['Do I pay on repeat clients or my own bookings?', `No, always ${REPEAT_PCT}. That covers every visit after a client’s first, bookings from your own Primpy booking link, website, Google profile and social “Book now” buttons, and clients you import or add yourself.`],
  ['Do my clients pay a fee?', 'No Primpy commission, ever. If they choose to pay online (deposit or pay in full), the card processing fee is passed to them at cost, with no Primpy markup. Paying you on the day has no Primpy fee.'],
  ['Is there a monthly fee?', 'No. No monthly fee, no setup fee and no contract. There’s also no commission on cancelled bookings or no-shows.'],
  // TO CONFIRM: collection wording — check with finance before launch.
  ['When is commission charged?', 'When the client paid online, it’s taken from that payment. Otherwise it’s invoiced to your venue monthly.'],
];

const GROUPS: [string, [string, string][]][] = [
  ['Common questions', FAQ_CUSTOMERS],
  ['For businesses', FAQ_BUSINESS],
];

export default function HelpPage() {
  const [open, setOpen] = useState<string | null>(FAQ_CUSTOMERS[0][0]);
  return (
    <div className="wrap w880 page">
      <h1 className="h-flow" style={{ marginBottom: 24 }}>Help &amp; policies</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,240px),1fr))', gap: 12, marginBottom: 40 }}>
        {TILES.map((t) => (
          <div key={t.big} style={{ background: t.bg, borderRadius: 22, padding: 20 }}>
            <div className="display" style={{ fontWeight: 800, fontSize: 32, color: t.fg }}>{t.big}</div>
            <div style={{ fontWeight: 700, marginTop: 6 }}>{t.title}</div>
            <div style={{ color: t.body, fontSize: 14, marginTop: 4, lineHeight: 1.45 }}>{t.text}</div>
          </div>
        ))}
      </div>
      {GROUPS.map(([title, faq], g) => (
        <section key={title} style={{ marginTop: g ? 40 : 0 }}>
          <div className="between" style={{ marginBottom: 10, alignItems: 'baseline' }}>
            <h2 className="display" style={{ fontWeight: 700, fontSize: 26, margin: 0 }}>{title}</h2>
            {g > 0 && <Link to="/pricing" style={{ fontWeight: 700, fontSize: 15 }}>See pricing</Link>}
          </div>
          <div style={{ borderTop: '1px solid var(--line)' }}>
            {faq.map(([q, a]) => {
              const on = open === q;
              return (
                <div key={q} style={{ borderBottom: '1px solid var(--line)' }}>
                  <button
                    aria-expanded={on}
                    onClick={() => setOpen(on ? null : q)}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '18px 0', border: 0, background: 'none', textAlign: 'left', fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}
                  >
                    {q}
                    <span style={{ flex: '0 0 auto', width: 32, height: 32, borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{on ? '−' : '+'}</span>
                  </button>
                  {on && <p className="muted" style={{ margin: '0 0 18px', fontSize: 15, lineHeight: 1.55, maxWidth: 640 }}>{a}</p>}
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <div className="card row" style={{ marginTop: 32, padding: 22, gap: 16 }}>
        <div style={{ flex: '1 1 260px' }}>
          <div style={{ fontWeight: 700, fontSize: 17 }}>Still stuck?</div>
          <div className="muted" style={{ fontSize: 14, marginTop: 2 }}>We usually reply within a few hours.</div>
        </div>
        {/* TODO(support): wire to the support inbox or chat tool. */}
        <button className="btn btn-ink btn-sm h48 btn-bold" style={{ fontSize: 15, padding: '0 20px' }}>
          Contact support
        </button>
      </div>
    </div>
  );
}
