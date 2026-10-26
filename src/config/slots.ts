/** Bookable start times. Venues open Mon–Sat 9:00 – 19:00 (until opening hours are in the backend). */
export const SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00',
  '16:30', '17:00', '17:30', '18:00',
];

export const SLOT_GROUPS: { label: string; from: number; to: number }[] = [
  { label: 'Morning', from: 0, to: 7 },
  { label: 'Afternoon', from: 7, to: 14 },
  { label: 'Evening', from: 14, to: 18 },
];

export const CLOSING_TIME = '19:00';
export const BOOKING_WINDOW_DAYS = 14;
