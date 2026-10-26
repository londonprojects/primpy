import type { Appointment } from '../types';
import { parseISODate, timeToMin } from './format';
import { bookingRef } from './booking';

export function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const icsStamp = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`;

const icsText = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');

/** An .ics event in local (floating) time. */
export function appointmentIcs(a: Appointment, address: string): string {
  const start = parseISODate(a.date) ?? new Date();
  const mins = timeToMin(a.time);
  start.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  const end = new Date(start.getTime() + (a.duration ?? 60) * 60000);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Primpy//Booking//EN',
    'BEGIN:VEVENT',
    `UID:${a.id}@primpy`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${icsText(`${a.serviceName} at ${a.barberName}`)}`,
    `LOCATION:${icsText(address)}`,
    `DESCRIPTION:${icsText(`Primpy booking ${bookingRef(a.id)}`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function receiptText(a: Appointment, address: string): string {
  const fmt = (n: number) => `£${n.toFixed(2)}`;
  return [
    'Primpy receipt',
    `Reference: ${bookingRef(a.id)}`,
    '',
    `${a.barberName}`,
    address,
    `${a.date} at ${a.time}`,
    '',
    `${a.serviceName.padEnd(40)} ${fmt(a.price)}`,
    `${'Paid online'.padEnd(40)} ${fmt(a.amountPaid)}`,
    `${'Due at venue'.padEnd(40)} ${fmt(Math.max(0, a.price - a.amountPaid))}`,
    '',
    `Status: ${a.status}`,
  ].join('\n');
}
