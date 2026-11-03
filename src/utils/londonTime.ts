/** Venues are in the UK: booking times are London wall-clock times, whatever the browser's zone. */
export const LONDON = 'Europe/London';

function londonParts(ms: number): Record<string, number> {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: LONDON,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(ms));
  const out: Record<string, number> = {};
  for (const p of parts) if (p.type !== 'literal') out[p.type] = Number(p.value);
  return out;
}

/** Epoch ms for a wall-clock date ("2026-11-03") and time ("14:30") in London. */
export function londonEpochMs(date: string, time: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const asUtc = Date.UTC(y, m - 1, d, hh, mm);
  const p = londonParts(asUtc);
  const londonAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return asUtc - (londonAsUtc - asUtc);
}

/** London wall-clock date ("YYYY-MM-DD") and time ("HH:MM") for an epoch ms. */
export function londonDateTime(ms: number): { date: string; time: string } {
  const p = londonParts(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return { date: `${p.year}-${pad(p.month)}-${pad(p.day)}`, time: `${pad(p.hour)}:${pad(p.minute)}` };
}
