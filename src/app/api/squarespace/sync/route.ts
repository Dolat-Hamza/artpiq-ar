import { NextResponse } from 'next/server'
import { requireAuth } from '../../_auth'
import { artworkToRow, listAllOwnerArtworks } from '@/lib/db/artworks'
import { newArtwork } from '@/lib/artworkStore'
import { fetchSquarespaceProducts } from '@/lib/sqsp/products'
import { planSquarespaceSync } from '@/lib/sqsp/syncPlan'

export const runtime = 'nodejs'
export const maxDuration = 60

const INSERT_BATCH = 200

// Previews (default) or applies a Squarespace -> ArtPiq catalogue sync for the store owner.
export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  // Comma-separated ArtPiq accounts allowed to sync this store into their own catalogue.
  const owners = (process.env.SQUARESPACE_SYNC_OWNER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean)
  const apiKey = process.env.SQUARESPACE_API_KEY
  if (!owners.length || !apiKey) return NextResponse.json({ error: 'Squarespace sync is not configured' }, { status: 503 })
  if (!owners.includes(auth.user.id)) return NextResponse.json({ error: 'Not allowed for this owner' }, { status: 403 })
  const owner = auth.user.id

  const apply = (await req.json().catch(() => ({}))).apply === true

  let products
  try {
    products = await fetchSquarespaceProducts(apiKey)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Squarespace request failed' }, { status: 502 })
  }
  const plan = planSquarespaceSync(products, await listAllOwnerArtworks(auth.client, owner), () => newArtwork().id)

  if (apply) {
    for (let i = 0; i < plan.create.length; i += INSERT_BATCH) {
      const rows = plan.create.slice(i, i + INSERT_BATCH).map(a => artworkToRow(a, owner))
      const { error } = await auth.client.from('artworks').insert(rows)
      if (error) return NextResponse.json({ error: error.message, createdBefore: i }, { status: 500 })
    }
    for (const u of plan.update) {
      // SyncChanges keys are the artworks column names (price, currency, sold, status).
      const { error } = await auth.client.from('artworks').update(u.changes).eq('id', u.id)
      if (error) return NextResponse.json({ error: error.message, failedAt: u.sku }, { status: 500 })
    }
  }

  return NextResponse.json({
    applied: apply,
    counts: { create: plan.create.length, update: plan.update.length, unchanged: plan.unchanged, skipped: plan.skipped.length },
    create: plan.create.map(a => ({ title: a.title, sku: a.sqspSku, widthCm: a.widthCm, heightCm: a.heightCm, privacy: a.privacy, price: a.price })),
    update: plan.update.map(({ title, sku, changes }) => ({ title, sku, changes })),
    skipped: plan.skipped,
  })
}
