import { StockRoom } from '@/types'

// Curated stock rooms. Wall quad coords are normalized [0..1] image space,
// clockwise from top-left. wallWidthCm = physical width of the visible
// wall at the quad, used for true-scale artwork placement.
//
// ArtPlacer-parity metadata: perspective (front/angled/corner),
// orientation (portrait/landscape/square), wallSize (small <250 / medium / large >360),
// smart (auto-detected wall placement).
export const STOCK_ROOMS: StockRoom[] = [
  {
    id: 'plain-warm-grey',
    name: 'Warm grey wall',
    category: 'plain',
    image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1600&q=82',
    thumb: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=400&q=70',
    wallQuad: [[0.05, 0.05], [0.95, 0.05], [0.95, 0.78], [0.05, 0.78]],
    wallWidthCm: 360,
    perspective: 'front', orientation: 'landscape', wallSize: 'large', smart: true,
  },
  {
    id: 'minimal-living',
    name: 'Minimal living room',
    category: 'living',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1600&q=82',
    thumb: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=70',
    wallQuad: [[0.18, 0.04], [0.82, 0.04], [0.82, 0.55], [0.18, 0.55]],
    wallWidthCm: 320,
    perspective: 'front', orientation: 'landscape', wallSize: 'medium', smart: true,
  },
  {
    id: 'sofa-neutral',
    name: 'Sofa, neutral wall',
    category: 'living',
    image: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=1600&q=82',
    thumb: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&q=70',
    wallQuad: [[0.10, 0.06], [0.90, 0.06], [0.90, 0.55], [0.10, 0.55]],
    wallWidthCm: 380,
    perspective: 'front', orientation: 'landscape', wallSize: 'large', smart: true,
  },
  {
    id: 'bedroom-soft',
    name: 'Bedroom, soft light',
    category: 'bedroom',
    image: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1600&q=82',
    thumb: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=400&q=70',
    wallQuad: [[0.08, 0.05], [0.92, 0.05], [0.92, 0.50], [0.08, 0.50]],
    wallWidthCm: 340,
    perspective: 'front', orientation: 'landscape', wallSize: 'medium', smart: true,
  },
  {
    id: 'office-modern',
    name: 'Modern office',
    category: 'office',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=82',
    thumb: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=70',
    wallQuad: [[0.06, 0.05], [0.94, 0.05], [0.94, 0.60], [0.06, 0.60]],
    wallWidthCm: 360,
    perspective: 'angled', orientation: 'landscape', wallSize: 'large', smart: false,
  },
  {
    id: 'gallery-empty',
    name: 'Gallery, empty',
    category: 'gallery',
    image: 'https://images.unsplash.com/photo-1577720580479-7d839d829c73?w=1600&q=82',
    thumb: 'https://images.unsplash.com/photo-1577720580479-7d839d829c73?w=400&q=70',
    wallQuad: [[0.10, 0.05], [0.90, 0.05], [0.90, 0.70], [0.10, 0.70]],
    wallWidthCm: 400,
    perspective: 'front', orientation: 'landscape', wallSize: 'large', smart: true,
  },
  {
    id: 'plain-white',
    name: 'Plain white wall',
    category: 'plain',
    image: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=1600&q=82',
    thumb: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=400&q=70',
    wallQuad: [[0.05, 0.05], [0.95, 0.05], [0.95, 0.85], [0.05, 0.85]],
    wallWidthCm: 380,
    perspective: 'front', orientation: 'landscape', wallSize: 'large', smart: true,
  },
  {
    id: 'plain-beige',
    name: 'Plain beige wall',
    category: 'plain',
    image: 'https://images.unsplash.com/photo-1604014237800-1c9102c219da?w=1600&q=82',
    thumb: 'https://images.unsplash.com/photo-1604014237800-1c9102c219da?w=400&q=70',
    wallQuad: [[0.05, 0.05], [0.95, 0.05], [0.95, 0.85], [0.05, 0.85]],
    wallWidthCm: 380,
    perspective: 'front', orientation: 'landscape', wallSize: 'large', smart: true,
  },
  {
    id: 'living-scandi',
    name: 'Scandinavian living',
    category: 'living',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1600&q=82',
    thumb: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=70',
    wallQuad: [[0.12, 0.05], [0.88, 0.05], [0.88, 0.55], [0.12, 0.55]],
    wallWidthCm: 340,
    perspective: 'front', orientation: 'landscape', wallSize: 'medium', smart: true,
  },
  {
    id: 'living-warm',
    name: 'Warm-tone living',
    category: 'living',
    image: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=1600&q=82',
    thumb: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=400&q=70',
    wallQuad: [[0.10, 0.06], [0.90, 0.06], [0.90, 0.58], [0.10, 0.58]],
    wallWidthCm: 360,
    perspective: 'front', orientation: 'landscape', wallSize: 'large', smart: true,
  },
  {
    id: 'bedroom-minimal',
    name: 'Minimal bedroom',
    category: 'bedroom',
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1600&q=82',
    thumb: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400&q=70',
    wallQuad: [[0.10, 0.05], [0.90, 0.05], [0.90, 0.50], [0.10, 0.50]],
    wallWidthCm: 320,
    perspective: 'front', orientation: 'landscape', wallSize: 'medium', smart: true,
  },
  {
    id: 'bedroom-dark',
    name: 'Dark bedroom',
    category: 'bedroom',
    image: 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=1600&q=82',
    thumb: 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=400&q=70',
    wallQuad: [[0.12, 0.05], [0.88, 0.05], [0.88, 0.55], [0.12, 0.55]],
    wallWidthCm: 340,
    perspective: 'front', orientation: 'landscape', wallSize: 'medium', smart: false,
  },
  {
    id: 'office-loft',
    name: 'Loft office',
    category: 'office',
    image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1600&q=82',
    thumb: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400&q=70',
    wallQuad: [[0.08, 0.05], [0.92, 0.05], [0.92, 0.62], [0.08, 0.62]],
    wallWidthCm: 380,
    perspective: 'angled', orientation: 'landscape', wallSize: 'large', smart: false,
  },
  {
    id: 'office-home',
    name: 'Home office',
    category: 'office',
    image: 'https://images.unsplash.com/photo-1518655048521-f130df041f66?w=1600&q=82',
    thumb: 'https://images.unsplash.com/photo-1518655048521-f130df041f66?w=400&q=70',
    wallQuad: [[0.10, 0.05], [0.90, 0.05], [0.90, 0.55], [0.10, 0.55]],
    wallWidthCm: 320,
    perspective: 'front', orientation: 'landscape', wallSize: 'medium', smart: true,
  },
  {
    id: 'kitchen-modern',
    name: 'Modern kitchen',
    category: 'kitchen',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1600&q=82',
    thumb: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=70',
    wallQuad: [[0.10, 0.06], [0.90, 0.06], [0.90, 0.50], [0.10, 0.50]],
    wallWidthCm: 360,
    perspective: 'front', orientation: 'landscape', wallSize: 'large', smart: false,
  },
  {
    id: 'kitchen-rustic',
    name: 'Rustic kitchen',
    category: 'kitchen',
    image: 'https://images.unsplash.com/photo-1556909211-d5b0a3f47cc4?w=1600&q=82',
    thumb: 'https://images.unsplash.com/photo-1556909211-d5b0a3f47cc4?w=400&q=70',
    wallQuad: [[0.10, 0.05], [0.90, 0.05], [0.90, 0.55], [0.10, 0.55]],
    wallWidthCm: 340,
    perspective: 'angled', orientation: 'landscape', wallSize: 'medium', smart: false,
  },
  {
    id: 'gallery-spotlit',
    name: 'Gallery, spotlit',
    category: 'gallery',
    image: 'https://images.unsplash.com/photo-1580130379624-3a069adbffc2?w=1600&q=82',
    thumb: 'https://images.unsplash.com/photo-1580130379624-3a069adbffc2?w=400&q=70',
    wallQuad: [[0.08, 0.05], [0.92, 0.05], [0.92, 0.72], [0.08, 0.72]],
    wallWidthCm: 420,
    perspective: 'front', orientation: 'landscape', wallSize: 'large', smart: true,
  },
  {
    id: 'gallery-arch',
    name: 'Gallery arch',
    category: 'gallery',
    image: 'https://images.unsplash.com/photo-1577083552431-6e5fd01988ec?w=1600&q=82',
    thumb: 'https://images.unsplash.com/photo-1577083552431-6e5fd01988ec?w=400&q=70',
    wallQuad: [[0.20, 0.10], [0.80, 0.10], [0.80, 0.78], [0.20, 0.78]],
    wallWidthCm: 360,
    perspective: 'corner', orientation: 'portrait', wallSize: 'medium', smart: false,
  },
  {
    id: 'plain-charcoal',
    name: 'Charcoal wall',
    category: 'plain',
    image: 'https://images.unsplash.com/photo-1615873968403-89e068629265?w=1600&q=82',
    thumb: 'https://images.unsplash.com/photo-1615873968403-89e068629265?w=400&q=70',
    wallQuad: [[0.05, 0.05], [0.95, 0.05], [0.95, 0.85], [0.05, 0.85]],
    wallWidthCm: 380,
    perspective: 'front', orientation: 'landscape', wallSize: 'large', smart: true,
  },
  {
    id: 'living-loft',
    name: 'Loft living',
    category: 'living',
    image: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=1600&q=82',
    thumb: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=400&q=70',
    wallQuad: [[0.10, 0.06], [0.90, 0.06], [0.90, 0.55], [0.10, 0.55]],
    wallWidthCm: 400,
    perspective: 'angled', orientation: 'landscape', wallSize: 'large', smart: false,
  },
]

// Filter helper for library page
export function filterRooms(opts: {
  category?: string
  perspective?: string
  orientation?: string
  wallSize?: string
  smart?: boolean | 'all'
}): StockRoom[] {
  return STOCK_ROOMS.filter(r => {
    if (opts.category && opts.category !== 'all' && r.category !== opts.category) return false
    if (opts.perspective && opts.perspective !== 'all' && r.perspective !== opts.perspective) return false
    if (opts.orientation && opts.orientation !== 'all' && r.orientation !== opts.orientation) return false
    if (opts.wallSize && opts.wallSize !== 'all' && r.wallSize !== opts.wallSize) return false
    if (opts.smart !== undefined && opts.smart !== 'all' && Boolean(r.smart) !== opts.smart) return false
    return true
  })
}
