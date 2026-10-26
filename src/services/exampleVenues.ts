/**
 * Fictional example venues, built into the frontend only (never written to the
 * shared Snip Firestore). Shown only while the backend has zero real venues;
 * they step aside as soon as a real venue exists. Not bookable.
 */
const s = (name: string, price: number, duration: number, category: string) => ({ name, price, duration, category });

export const EXAMPLE_VENUE_DOCS: { id: string; doc: Record<string, unknown> }[] = [
  {
    id: 'example-1',
    doc: {
      shopName: 'Juniper & Pearl Nail Studio', barberAddressCity: 'Islington', barberLat: 51.5362, barberLng: -0.1033, barberAddressRegion: 'London',
      bio: 'Example venue for preview purposes — not a real business.',
      barberAverageRating: 4.8, barberReviewCount: 126, barberLogoDataUrl: '/venues/juniper-pearl.webp',
      barberServices: [s('Gel manicure', 32, 45, 'nails'), s('Classic pedicure', 38, 50, 'nails'), s('Nail art (per set)', 12, 20, 'nails')],
    },
  },
  {
    id: 'example-2',
    doc: {
      shopName: 'Fernway Hair Rooms', barberAddressCity: 'Peckham', barberLat: 51.474, barberLng: -0.069, barberAddressRegion: 'London',
      bio: 'Example venue for preview purposes — not a real business.',
      barberAverageRating: 4.7, barberReviewCount: 89, barberLogoDataUrl: '/venues/fernway.webp',
      barberServices: [s('Cut & blow dry', 55, 60, 'hair'), s('Full head colour', 95, 120, 'hair'), s('Blow dry', 30, 30, 'hair')],
    },
  },
  {
    id: 'example-3',
    doc: {
      shopName: 'Quiet Tide Massage', barberAddressCity: 'Clapham', barberLat: 51.462, barberLng: -0.138, barberAddressRegion: 'London',
      bio: 'Example venue for preview purposes — not a real business.',
      barberAverageRating: 4.9, barberReviewCount: 203, barberLogoDataUrl: '/venues/quiet-tide.webp',
      barberServices: [s('Swedish massage', 60, 60, 'massage'), s('Deep tissue massage', 70, 60, 'massage'), s('Back, neck & shoulders', 40, 30, 'massage')],
    },
  },
  {
    id: 'example-4',
    doc: {
      shopName: 'Bramble Brow Bar', barberAddressCity: 'Hackney', barberLat: 51.545, barberLng: -0.0553, barberAddressRegion: 'London',
      bio: 'Example venue for preview purposes — not a real business.',
      barberAverageRating: 4.6, barberReviewCount: 57, barberLogoDataUrl: '/venues/bramble.webp',
      barberServices: [s('Brow shape & tint', 25, 30, 'brows'), s('Lash lift', 45, 45, 'Lashes'), s('Brow lamination', 40, 40, 'brows')],
    },
  },
  {
    id: 'example-5',
    doc: {
      shopName: 'Copperleaf Barbers', barberAddressCity: 'Camden', barberLat: 51.539, barberLng: -0.1426, barberAddressRegion: 'London',
      bio: 'Example venue for preview purposes — not a real business.',
      barberAverageRating: 4.7, barberReviewCount: 148, barberLogoDataUrl: '/venues/copperleaf.webp',
      barberServices: [s('Skin fade', 28, 40, 'Barbering'), s('Beard trim', 15, 20, 'Barbering'), s('Cut & beard', 38, 50, 'Barbering')],
    },
  },
];
