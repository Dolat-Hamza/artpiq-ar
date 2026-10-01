import { NextResponse } from 'next/server'
import { publicServerClient } from '@/lib/db/serverClient'
import { rowToArtwork } from '@/lib/db/artworks'
import { arLandingPath, canPlaceInAr } from '@/lib/ar/urls'
import { isUuid } from '@/lib/validation/uuid'

export const runtime = 'nodejs'

const MAX_SKU = 64
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' }
const CACHED = { ...CORS, 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400' }
const NO_STORE = { ...CORS, 'Cache-Control': 'no-store' }

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

// Squarespace product SKU -> AR landing for the footer loader in /embed/widget.js.
export async function GET(req: Request) {
  const search = new URL(req.url).searchParams
  const owner = (search.get('owner') ?? '').trim()
  const sku = (search.get('sku') ?? '').trim()
  if (!isUuid(owner)) return NextResponse.json({ error: 'invalid owner' }, { status: 400, headers: CORS })
  if (!sku || sku.length > MAX_SKU) return NextResponse.json({ error: 'invalid sku' }, { status: 400, headers: CORS })

  const db = publicServerClient()
  if (!db) return NextResponse.json({ error: 'unavailable' }, { status: 503, headers: NO_STORE })
  const { data, error } = await db
    .from('artworks')
    .select('*')
    .eq('owner_id', owner)
    .eq('privacy', 'public')
    .eq('sqsp_sku', sku)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'unavailable' }, { status: 503, headers: NO_STORE })

  const aw = data ? rowToArtwork(data) : null
  if (!aw || !canPlaceInAr(aw)) return NextResponse.json({ error: 'no match' }, { status: 404, headers: CACHED })
  return NextResponse.json({ id: aw.id, title: aw.title, arPath: arLandingPath(aw) }, { headers: CACHED })
}
