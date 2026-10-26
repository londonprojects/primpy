/** Treatwell-style treatment categories used across Primpy's browse experience. */
export interface Category {
  id: string;
  name: string;
  emoji: string;
  /** Keywords matched (case-insensitive) against treatment/venue text. */
  keywords: string[];
  image: string;
}

export const categories: Category[] = [
  {
    id: 'hair',
    name: 'Hair',
    emoji: '💇',
    keywords: ['hair', 'haircut', 'cut', 'blow', 'color', 'colour', 'highlight', 'balayage', 'style', 'styling', 'barber'],
    image: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=600&q=70',
  },
  {
    id: 'nails',
    name: 'Nails',
    emoji: '💅',
    keywords: ['nail', 'manicure', 'pedicure', 'gel', 'acrylic', 'mani', 'pedi'],
    image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=70',
  },
  {
    id: 'massage',
    name: 'Massage',
    emoji: '💆',
    keywords: ['massage', 'swedish', 'deep tissue', 'sports massage', 'reflexology', 'hot stone'],
    image: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=600&q=70',
  },
  {
    id: 'facials',
    name: 'Facials & Skin',
    emoji: '🧖',
    keywords: ['facial', 'skin', 'peel', 'microdermabrasion', 'dermaplaning', 'cleanse'],
    image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=70',
  },
  {
    id: 'brows',
    name: 'Brows & Lashes',
    emoji: '👁️',
    keywords: ['brow', 'eyebrow', 'lash', 'lashes', 'tint', 'lamination', 'threading'],
    image: 'https://images.unsplash.com/photo-1583001931096-959e9a1a6223?w=600&q=70',
  },
  {
    id: 'waxing',
    name: 'Waxing & Hair Removal',
    emoji: '🪒',
    keywords: ['wax', 'waxing', 'hair removal', 'laser', 'sugaring'],
    image: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=600&q=70',
  },
  {
    id: 'makeup',
    name: 'Make-up',
    emoji: '💄',
    keywords: ['makeup', 'make-up', 'make up', 'bridal', 'glam'],
    image: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&q=70',
  },
  {
    id: 'spa',
    name: 'Spa & Wellness',
    emoji: '🌿',
    keywords: ['spa', 'sauna', 'wellness', 'treatment', 'body', 'aromatherapy'],
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=70',
  },
];

export function categoriesForText(...texts: (string | undefined)[]): string[] {
  const hay = texts.filter(Boolean).join(' ').toLowerCase();
  const matched = categories
    .filter((c) => c.keywords.some((k) => hay.includes(k)))
    .map((c) => c.id);
  return matched.length ? Array.from(new Set(matched)) : [];
}

export function categoryById(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}
