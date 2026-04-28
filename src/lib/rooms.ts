import { StockRoom } from '@/types'

// Curated stock rooms. Wall quad coords are normalized [0..1] image space,
// clockwise from top-left. wallWidthCm = physical width of the visible
// wall at the quad, used for true-scale artwork placement.
//
// Images served via Unsplash CDN with explicit dimensions; license = free
// commercial use. Replace per-asset later with bespoke photography.
export const STOCK_ROOMS: StockRoom[] = [
  {
    id: 'plain-warm-grey',
    name: 'Warm grey wall',
    category: 'plain',
    image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1600&q=82',
    thumb: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=400&q=70',
    wallQuad: [[0.05, 0.05], [0.95, 0.05], [0.95, 0.78], [0.05, 0.78]],
    wallWidthCm: 360,
  },
  {
    id: 'minimal-living',
    name: 'Minimal living room',
    category: 'living',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1600&q=82',
    thumb: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=70',
    wallQuad: [[0.18, 0.04], [0.82, 0.04], [0.82, 0.55], [0.18, 0.55]],
    wallWidthCm: 320,
  },
  {
    id: 'sofa-neutral',
    name: 'Sofa, neutral wall',
    category: 'living',
    image: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=1600&q=82',
    thumb: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&q=70',
    wallQuad: [[0.10, 0.06], [0.90, 0.06], [0.90, 0.55], [0.10, 0.55]],
    wallWidthCm: 380,
  },
  {
    id: 'bedroom-soft',
    name: 'Bedroom, soft light',
    category: 'bedroom',
    image: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1600&q=82',
    thumb: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=400&q=70',
    wallQuad: [[0.08, 0.05], [0.92, 0.05], [0.92, 0.50], [0.08, 0.50]],
    wallWidthCm: 340,
  },
  {
    id: 'office-modern',
    name: 'Modern office',
    category: 'office',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=82',
    thumb: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=70',
    wallQuad: [[0.06, 0.05], [0.94, 0.05], [0.94, 0.60], [0.06, 0.60]],
    wallWidthCm: 360,
  },
  {
    id: 'gallery-empty',
    name: 'Gallery, empty',
    category: 'gallery',
    image: 'https://images.unsplash.com/photo-1577720580479-7d839d829c73?w=1600&q=82',
    thumb: 'https://images.unsplash.com/photo-1577720580479-7d839d829c73?w=400&q=70',
    wallQuad: [[0.10, 0.05], [0.90, 0.05], [0.90, 0.70], [0.10, 0.70]],
    wallWidthCm: 400,
  },
  {
    id: 'plain-white',
    name: 'Plain white wall',
    category: 'plain',
    image: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=1600&q=82',
    thumb: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=400&q=70',
    wallQuad: [[0.05, 0.05], [0.95, 0.05], [0.95, 0.85], [0.05, 0.85]],
    wallWidthCm: 380,
  },
  {
    id: 'plain-beige',
    name: 'Plain beige wall',
    category: 'plain',
    image: 'https://images.unsplash.com/photo-1604014237800-1c9102c219da?w=1600&q=82',
    thumb: 'https://images.unsplash.com/photo-1604014237800-1c9102c219da?w=400&q=70',
    wallQuad: [[0.05, 0.05], [0.95, 0.05], [0.95, 0.85], [0.05, 0.85]],
    wallWidthCm: 380,
  },
]
