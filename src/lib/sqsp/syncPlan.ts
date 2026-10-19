import type { Artwork } from '@/types'
import type { SqspProduct, SqspVariant } from './products'

export type SyncChanges = Partial<Pick<Artwork, 'price' | 'currency' | 'sold' | 'status'>>

export interface SyncPlan {
  create: Artwork[]
  update: { id: string; sku: string; title: string; changes: SyncChanges }[]
  unchanged: number
  skipped: { name: string; reason: string }[]
}

const CM_PER_UNIT: Record<string, number> = { CENTIMETER: 1, INCH: 2.54 }

function price(v: SqspVariant): number | undefined {
  const n = Number(v.pricing.basePrice.value)
  return n > 0 ? n : undefined
}

function isSold(v: SqspVariant): boolean {
  return !!v.stock && !v.stock.unlimited && v.stock.quantity === 0
}

// Shipping sizes, so only a starting point for new artworks; zero keeps AR off until set.
function sizeCm(v: SqspVariant): [number, number] {
  const d = v.shippingMeasurements?.dimensions
  const k = d ? CM_PER_UNIT[d.unit] : undefined
  if (!d || !k || !(d.width > 0 && d.height > 0)) return [0, 0]
  return [Math.round(d.width * k * 100) / 100, Math.round(d.height * k * 100) / 100]
}

function newArtwork(p: SqspProduct, v: SqspVariant, id: string): Artwork {
  const [widthCm, heightCm] = sizeCm(v)
  const image = p.images[0]?.url ?? null
  const sold = isSold(v)
  return {
    id, type: 'painting', title: p.name, artist: '', year: '', medium: '',
    widthCm, heightCm, image, thumb: image,
    price: price(v), currency: v.pricing.basePrice.currency, sold, status: sold ? 'sold' : 'for_sale',
    sqspSku: v.sku, purchaseUrl: p.url, privacy: p.isVisible ? 'public' : 'private',
  }
}

// Squarespace owns price and stock; ArtPiq owns everything else on existing artworks.
function changesFor(a: Artwork, v: SqspVariant): SyncChanges {
  const c: SyncChanges = {}
  const p = price(v)
  if (p !== undefined && p !== a.price) c.price = p
  if (v.pricing.basePrice.currency !== a.currency) c.currency = v.pricing.basePrice.currency
  const sold = isSold(v)
  if (sold !== !!a.sold) {
    c.sold = sold
    if (sold) c.status = 'sold'
    else if (a.status === 'sold') c.status = 'for_sale'
  }
  return c
}

export function planSquarespaceSync(products: SqspProduct[], artworks: Artwork[], newId: () => string): SyncPlan {
  const bySku = new Map(artworks.filter(a => a.sqspSku).map(a => [a.sqspSku as string, a]))
  const plan: SyncPlan = { create: [], update: [], unchanged: 0, skipped: [] }
  for (const p of products) {
    const first = p.variants[0]
    if (!first?.sku) { plan.skipped.push({ name: p.name, reason: 'no SKU' }); continue }
    const match = p.variants.map(v => [v, bySku.get(v.sku)] as const).find(([, a]) => a)
    if (!match) { plan.create.push(newArtwork(p, first, newId())); continue }
    const [v, a] = match as readonly [SqspVariant, Artwork]
    const changes = changesFor(a, v)
    if (Object.keys(changes).length) plan.update.push({ id: a.id, sku: v.sku, title: a.title, changes })
    else plan.unchanged++
  }
  return plan
}
