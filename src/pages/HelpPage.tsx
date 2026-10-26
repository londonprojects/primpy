import { useState } from 'react';

// TODO(content): placeholder policy wording — confirm with the business before launch.
const TILES = [
  { big: '24h+', title: 'Free to change', text: 'Cancel or reschedule for free up to 24 hours before.', bg: 'var(--teal-soft)', fg: 'var(--teal-dark)', body: '#2f4a46' },
  { big: '<24h', title: 'Late changes', text: 'The venue may keep your deposit if you have one.', bg: 'var(--amber-soft)', fg: 'var(--amber-ink)', body: '#5b4310' },
  { big: 'No-show', title: 'Missed appointments', text: 'Deposits are kept and repeat no-shows may limit booking.', bg: 'var(--danger-soft)', fg: 'var(--danger)', body: '#6b2a1f' },
];

const FAQ: [string, string][] = [
  ['How do I cancel or reschedule?', 'Open My bookings and choose Reschedule or Cancel. Changes are free up to 24 hours before your appointment.'],
  ['What happens if I cancel late?', 'Inside 24 hours, the venue may keep your deposit. Without a deposit, repeated late cancellations can limit future bookings.'],
  ['When am I charged?', 'Only if you pay a deposit or pay in full when booking. Otherwise you pay the venue on the day.'],
  ['How do gift cards work?', 'Enter the code at checkout. The balance never expires and can be split across bookings.'],
  ['Will my booking show in Snip?', 'Yes — Primpy and Snip share one account and one booking system.'],
];

export default function HelpPage() {
  const [open, setOpen] = useState(0);
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
      <h2 className="display" style={{ fontWeight: 700, fontSize: 26, margin: '0 0 10px' }}>Common questions</h2>
      <div style={{ borderTop: '1px solid var(--line)' }}>
        {FAQ.map(([q, a], i) => {
          const on = open === i;
          return (
            <div key={q} style={{ borderBottom: '1px solid var(--line)' }}>
              <button
                aria-expanded={on}
                onClick={() => setOpen(on ? -1 : i)}
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
