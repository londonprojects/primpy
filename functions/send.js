/** Resend sender, same pattern as SpareKitchen's notify.js (plain fetch, Idempotency-Key). */
export async function sendEmail({ apiKey, from, idempotencyKey, to, replyTo, subject, html, text, fetchImpl = fetch, url = 'https://api.resend.com/emails' }) {
  if (!apiKey || apiKey === 'none') {
    console.log(`[email skipped: no PRIMPY_RESEND_API_KEY] ${subject} → ${to}`)
    return { skipped: true }
  }
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
    body: JSON.stringify({ from, to: [to], subject, html, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
  return res.json()
}
