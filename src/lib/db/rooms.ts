// Fetch the global stock-rooms library from the DB. Every authenticated user
// (and anon viewing a public surface) sees the same set — it's intentionally
// not owner-scoped. RLS allows SELECT for everyone; writes are blocked at the
// policy layer + only the super-admin RPCs can mutate.

import { supabase } from './client'
import type { StockRoom, StockRoomCategory } from '@/types'

type Row = {
  id: string
  name: string
  category: string
  image_url: string
  thumb_url: string | null
  wall_quad: unknown
  wall_width_cm: number | string | null
  orientation: string | null
  perspective: string | null
  smart: boolean | null
  wall_size: string | null
}

const VALID_CATS: StockRoomCategory[] = [
  'living', 'bedroom', 'office', 'kitchen', 'gallery', 'plain',
  'hallway', 'dining', 'studio', 'lobby', 'cafe', 'restaurant',
]

function rowToRoom(r: Row): StockRoom | null {
  // Quad must be a [[n,n],[n,n],[n,n],[n,n]] — drop anything malformed so
  // the visualiser never tries to render an unplaceable room.
  const quad = r.wall_quad
  if (!Array.isArray(quad) || quad.length !== 4) return null
  const valid = quad.every(p => Array.isArray(p) && p.length === 2 && p.every(n => typeof n === 'number'))
  if (!valid) return null
  const cat = VALID_CATS.includes(r.category as StockRoomCategory)
    ? (r.category as StockRoomCategory)
    : 'plain'
  return {
    id: r.id,
    name: r.name,
    category: cat,
    image: r.image_url,
    thumb: r.thumb_url ?? r.image_url,
    wallQuad: quad as StockRoom['wallQuad'],
    wallWidthCm: Number(r.wall_width_cm) || 350,
    perspective: (r.perspective ?? 'front') as StockRoom['perspective'],
    orientation: (r.orientation ?? 'landscape') as StockRoom['orientation'],
    wallSize: (r.wall_size ?? undefined) as StockRoom['wallSize'],
    smart: r.smart ?? false,
  }
}

// Sane default cap. We list all rooms in one go because the UI needs them up
// front for filter chips + room picker. If the library ever grows past ~1k
// we should switch to .range() pagination.
const ROOM_LIST_LIMIT = 1000

export async function listStockRooms(): Promise<StockRoom[]> {
  const { data, error } = await supabase()
    .from('stock_rooms')
    .select('*')
    .order('category')
    .order('name')
    .limit(ROOM_LIST_LIMIT)
  if (error) throw error
  return ((data ?? []) as Row[]).map(rowToRoom).filter((r): r is StockRoom => r !== null)
}
