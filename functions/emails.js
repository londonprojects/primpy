/**
 * Pure email builders for Primpy booking alerts. No Firebase imports, so they're unit-testable.
 * Appointment docs store `date` (YYYY-MM-DD) and `time` (HH:MM) as UK wall-clock time.
 */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export function formatWhen(date, time) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ''))
  if (!m) return `${date || ''} ${time || ''}`.trim()
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12))
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()]
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]
  return `${wd} ${d.getUTCDate()} ${mon} ${m[1]}${time ? `, ${time}` : ''} (UK time)`
}

export const formatPrice = (n) => {
  const v = typeof n === 'number' ? n : parseFloat(String(n ?? '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(v) ? `£${v % 1 ? v.toFixed(2) : v}` : ''
}

export function venueAddress(v = {}) {
  return [v.barberAddressLine1, v.barberAddressCity, v.barberAddressRegion].map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean).join(', ')
}

export const venueName = (appt = {}, v = {}) => v.shopName || appt.barberName || v.displayName || 'your venue'

function paymentLine(appt) {
  const paid = Number(appt.amountPaid) || 0
  if (appt.paymentMethod === 'full' && paid) return `Paid online: ${formatPrice(paid)}`
  if (appt.paymentMethod === 'deposit' && paid) return `Deposit paid online: ${formatPrice(paid)}, rest at the venue`
  return 'Pay at the venue'
}

function layout(title, rows, cta, footer) {
  const text = [title, '', ...rows.map(([k, v]) => `${k}: ${v}`), '', cta ? `${cta.label}: ${cta.url}` : '', footer || '', '', '— Primpy · primpy.app'].filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n').trim()
  const html = `<!doctype html><html><body style="margin:0;background:#f6f4ef;font-family:Helvetica,Arial,sans-serif;color:#1d2b2a">
<div style="max-width:520px;margin:0 auto;padding:24px">
<div style="font-weight:800;font-size:22px;color:#0f766e;margin-bottom:16px">Primpy</div>
<div style="background:#fff;border-radius:14px;padding:22px">
<h1 style="font-size:19px;margin:0 0 14px">${esc(title)}</h1>
<table style="width:100%;border-collapse:collapse;font-size:14px">${rows.map(([k, v]) => `<tr><td style="padding:6px 0;color:#5b6b69;width:38%;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;font-weight:600">${esc(v)}</td></tr>`).join('')}</table>
${cta ? `<p style="margin:20px 0 0"><a href="${esc(cta.url)}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:11px 18px;border-radius:999px;font-weight:700">${esc(cta.label)}</a></p>` : ''}
${footer ? `<p style="font-size:13px;color:#5b6b69;margin:16px 0 0">${esc(footer)}</p>` : ''}
</div><p style="font-size:12px;color:#8a9694;text-align:center;margin-top:14px">Primpy · <a href="https://primpy.app" style="color:#8a9694">primpy.app</a></p></div></body></html>`
  return { text, html }
}

/**
 * @param {'created'|'cancelled'|'rescheduled'} kind
 * @returns {Array<{key:string,to:string,subject:string,html:string,text:string,replyTo?:string}>}
 */
export function bookingEmails(kind, { id, appt, before = null, venue = {}, venueEmail, client = {}, site = 'https://primpy.app' }) {
  const out = []
  const vName = venueName(appt, venue)
  const when = formatWhen(appt.date, appt.time)
  const clientName = client.name || 'A client'
  const contact = [client.email, client.phone].filter(Boolean).join(' · ') || 'Not provided (guest booking)'
  const dash = `${site}/business/bookings`
  const bookingUrl = `${site}/booking/${id}`
  const base = [['Client', clientName], ['Treatments', appt.serviceName || 'Treatment'], ['When', when], ['Price', formatPrice(appt.price)], ['Payment', paymentLine(appt)]]
  if (appt.notes) base.push(['Notes', appt.notes])

  if (kind === 'created') {
    if (venueEmail) out.push({ key: 'venue', to: venueEmail, replyTo: client.email || undefined, subject: `New booking: ${appt.serviceName || 'Treatment'}, ${when}`,
      ...layout(`New booking from ${clientName}`, [...base, ['Contact', contact]], { label: 'Open your bookings', url: dash }) })
    if (client.email) out.push({ key: 'client', to: client.email, replyTo: venueEmail || undefined, subject: `Booking confirmed at ${vName}, ${when}`,
      ...layout(`You're booked at ${vName}`, [['Venue', vName], ['Address', venueAddress(venue) || '—'], ['Treatments', appt.serviceName || 'Treatment'], ['When', when], ['Price', formatPrice(appt.price)], ['Payment', paymentLine(appt)]],
        { label: 'View your booking', url: bookingUrl }, 'Free to cancel or reschedule up to 24 hours before. Inside 24 hours the venue may keep any deposit.') })
  } else if (kind === 'cancelled') {
    if (venueEmail) out.push({ key: 'venue', to: venueEmail, subject: `Booking cancelled: ${appt.serviceName || 'Treatment'}, ${when}`,
      ...layout(`Booking cancelled`, [...base, ['Contact', contact]], { label: 'Open your bookings', url: dash }, 'This slot is free again.') })
  } else if (kind === 'rescheduled') {
    const was = before ? formatWhen(before.date, before.time) : ''
    if (venueEmail) out.push({ key: 'venue', to: venueEmail, subject: `Booking moved to ${when}`,
      ...layout(`${clientName} moved their booking`, [...base.slice(0, 2), ['New time', when], ['Was', was], ...base.slice(3), ['Contact', contact]], { label: 'Open your bookings', url: dash }) })
  }
  return out
}

/** Which alert, if any, a change to an appointment needs. */
export function changeKind(before, after) {
  if (!after || after.source !== 'primpy-web') return null
  if (!before) return after.status === 'cancelled' ? null : 'created'
  if (before.status !== 'cancelled' && after.status === 'cancelled') return 'cancelled'
  if (after.status !== 'cancelled' && (before.date !== after.date || before.time !== after.time)) return 'rescheduled'
  return null
}

/** Stable per-event idempotency key (also the Firestore claim field name). */
export function alertKey(kind, after) {
  return kind === 'rescheduled' ? `rescheduled_${String(after.date)}_${String(after.time).replace(':', '')}` : kind
}
