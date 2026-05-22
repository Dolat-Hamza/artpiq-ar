import { StockRoom } from '@/types'

// Stock-room library.
//
// Source of truth is now the `public.stock_rooms` Supabase table (visually
// audited for empty / paintable walls). This file keeps a *tiny* hardcoded
// fallback so the visualiser still renders something if the DB fetch fails
// (network error, RLS regression, etc.) — every entry here has been visually
// checked too.
//
// Do NOT pad this list — every entry must be a paintable empty wall. Add new
// rooms via the Super-Admin → Stock Rooms panel, which writes to the DB.
export const STOCK_ROOMS: StockRoom[] = [
  {
    id: 'fallback-minimal-living',
    name: 'Minimal living room',
    category: 'living',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1600&q=82',
    thumb: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=70',
    wallQuad: [[0.18, 0.04], [0.82, 0.04], [0.82, 0.55], [0.18, 0.55]],
    wallWidthCm: 320,
    perspective: 'front', orientation: 'landscape', wallSize: 'medium', smart: true,
  },
  {
    id: 'fallback-sofa-neutral',
    name: 'Sofa, neutral wall',
    category: 'living',
    image: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=1600&q=82',
    thumb: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&q=70',
    wallQuad: [[0.10, 0.06], [0.90, 0.06], [0.90, 0.55], [0.10, 0.55]],
    wallWidthCm: 380,
    perspective: 'front', orientation: 'landscape', wallSize: 'large', smart: true,
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
