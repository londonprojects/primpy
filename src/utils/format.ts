/** Date, duration and money helpers. Dates are local `YYYY-MM-DD` strings. */

export function toISODate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseISODate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDaysISO(base: string, days: number): string {
  const d = parseISODate(base) ?? new Date();
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Whole days from today (0 = today, negative = past). */
export function daysFromToday(dateStr: string): number {
  const d = parseISODate(dateStr);
  if (!d) return 0;
  const t = parseISODate(todayISO())!;
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}

export interface DayParts {
  dow: string;
  dnum: number | string;
  mon: string;
  long: string;
}

export function dayParts(dateStr: string): DayParts {
  const d = parseISODate(dateStr);
  if (!d) return { dow: '', dnum: '?', mon: '', long: '' };
  return {
    dow: d.toLocaleDateString('en-GB', { weekday: 'short' }),
    dnum: d.getDate(),
    mon: d.toLocaleDateString('en-GB', { month: 'short' }),
    long: d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
  };
}

/** "Today · 14:00" or "Thu 29 Oct · 14:00". */
export function whenText(dateStr: string, time?: string | null): string {
  if (!time) return 'Pick a time';
  const p = dayParts(dateStr);
  const day = daysFromToday(dateStr) === 0 ? 'Today' : `${p.dow} ${p.dnum} ${p.mon}`;
  return `${day} · ${time}`;
}

export function relDays(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

/** Milliseconds until an appointment starts. */
export function msUntil(dateStr: string, time: string): number {
  const d = parseISODate(dateStr);
  if (!d) return Infinity;
  const [h, m] = (time || '00:00').split(':').map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d.getTime() - Date.now();
}

export function fmtDur(m: number): string {
  if (m >= 60) return `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}`;
  return `${m} min`;
}

export function money(n: number): string {
  const v = Math.round(n * 100) / 100;
  return `£${Number.isInteger(v) ? v : v.toFixed(2)}`;
}

export function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}
