import { expect, test } from '@playwright/test'
import type { SqspProduct } from '@/lib/sqsp/products'
import { planSquarespaceSync } from '@/lib/sqsp/syncPlan'
import type { Artwork } from '@/types'

function product(sku: string, o: Partial<SqspProduct> & { price?: string; currency?: string; qty?: number; unlimited?: boolean; dims?: { width: number; height: number; unit: string } | null } = {}): SqspProduct {
  const { price = '1600.00', currency = 'EUR', qty = 1, unlimited = false, dims = { width: 75, height: 55, unit: 'CENTIMETER' }, ...rest } = o
  return {
    id: `p_${sku}`, name: `Work ${sku}`, url: `https://artpiq.net/shop/p/${sku}`, isVisible: true, tags: ['AR'],
    images: [{ url: `https://images.squarespace-cdn.com/${sku}.jpg` }],
    variants: [{
      sku,
      pricing: { basePrice: { currency, value: price } },
      stock: { quantity: qty, unlimited },
      ...(dims ? { shippingMeasurements: { dimensions: { ...dims, length: 5 } } } : {}),
    }],
    ...rest,
  }
}

function artwork(id: string, sku: string, o: Partial<Artwork> = {}): Artwork {
  return {
    id, type: 'painting', title: `Catalogue ${id}`, artist: 'Ed Broner', year: '2022', medium: 'Oil',
    widthCm: 160, heightCm: 130, image: 'https://cat.test/i.jpg', thumb: null, privacy: 'public',
    sqspSku: sku, price: 1600, currency: 'EUR', sold: false, status: 'for_sale', ...o,
  }
}

let n = 0
const ids = () => { n = 0; return () => `aw_new${++n}` }

test('creates a catalogue artwork for a product ArtPiq does not have', () => {
  const plan = planSquarespaceSync([product('SQ1')], [], ids())
  expect(plan.create).toEqual([{
    id: 'aw_new1', type: 'painting', title: 'Work SQ1', artist: '', year: '', medium: '',
    widthCm: 75, heightCm: 55,
    image: 'https://images.squarespace-cdn.com/SQ1.jpg', thumb: 'https://images.squarespace-cdn.com/SQ1.jpg',
    price: 1600, currency: 'EUR', sold: false, status: 'for_sale', sqspSku: 'SQ1',
    purchaseUrl: 'https://artpiq.net/shop/p/SQ1', privacy: 'public',
  }])
  expect(plan.update).toEqual([])
})

test('hidden products are created private', () => {
  expect(planSquarespaceSync([product('SQ1', { isVisible: false })], [], ids()).create).toMatchObject([{ privacy: 'private' }])
})

test('converts inch shipping sizes and leaves unknown sizes at zero', () => {
  const plan = planSquarespaceSync([
    product('IN', { dims: { width: 10, height: 20, unit: 'INCH' } }),
    product('NONE', { dims: null }),
    product('ZERO', { dims: { width: 0, height: 0, unit: 'CENTIMETER' } }),
  ], [], ids())
  expect(plan.create.map(a => [a.widthCm, a.heightCm])).toEqual([[25.4, 50.8], [0, 0], [0, 0]])
  const partial = planSquarespaceSync([
    product('UNIT', { dims: { width: 10, height: 20, unit: 'FOOT' } }),
    product('W0', { dims: { width: 0, height: 20, unit: 'CENTIMETER' } }),
    product('H0', { dims: { width: 10, height: 0, unit: 'CENTIMETER' } }),
  ], [], ids())
  expect(partial.create.map(a => [a.widthCm, a.heightCm])).toEqual([[0, 0], [0, 0], [0, 0]])
})

test('out of stock means sold, unlimited stock never does', () => {
  const plan = planSquarespaceSync([product('A', { qty: 0 }), product('B', { qty: 0, unlimited: true })], [], ids())
  expect(plan.create.map(a => [a.sold, a.status])).toEqual([[true, 'sold'], [false, 'for_sale']])
})

test('existing artworks only get price, currency and sold status from Squarespace', () => {
  const plan = planSquarespaceSync(
    [product('SQ1', { price: '1700.00', currency: 'GBP', name: 'Renamed', dims: { width: 1, height: 1, unit: 'CENTIMETER' } })],
    [artwork('aw_1', 'SQ1')],
    ids(),
  )
  expect(plan.create).toEqual([])
  expect(plan.update).toEqual([{ id: 'aw_1', sku: 'SQ1', title: 'Catalogue aw_1', changes: { price: 1700, currency: 'GBP' } }])
  expect(plan.unchanged).toBe(0)
})

test('matching artworks with nothing to change are counted, not updated', () => {
  const plan = planSquarespaceSync([product('SQ1')], [artwork('aw_1', 'SQ1')], ids())
  expect(plan.update).toEqual([])
  expect(plan.unchanged).toBe(1)
})

test('a sale marks the artwork sold; restock only reopens artworks marked sold', () => {
  const plan = planSquarespaceSync(
    [product('S', { qty: 0 }), product('R', { qty: 2 }), product('K', { qty: 2 })],
    [artwork('aw_s', 'S'), artwork('aw_r', 'R', { sold: true, status: 'sold' }), artwork('aw_k', 'K', { sold: true, status: 'reserved' })],
    ids(),
  )
  expect(plan.update.map(u => [u.id, u.changes])).toEqual([
    ['aw_s', { sold: true, status: 'sold' }],
    ['aw_r', { sold: false, status: 'for_sale' }],
    ['aw_k', { sold: false }],
  ])
})

test('matches on any variant SKU of a multi-variant product', () => {
  const p = product('V1')
  p.variants.push({ ...p.variants[0], sku: 'V2' })
  const plan = planSquarespaceSync([p], [artwork('aw_v', 'V2')], ids())
  expect(plan.create).toEqual([])
  expect(plan.unchanged).toBe(1)
})

test('skips products without a SKU and never proposes a missing price', () => {
  const noSku = product('')
  const plan = planSquarespaceSync([noSku, product('P', { price: '' }), product('Z', { price: '0.00' })], [artwork('aw_p', 'P'), artwork('aw_z', 'Z')], ids())
  expect(plan.skipped).toEqual([{ name: 'Work ', reason: 'no SKU' }])
  expect(plan.update).toEqual([])
  expect(plan.unchanged).toBe(2)
})

test('catalogue artworks missing from Squarespace are left alone', () => {
  const plan = planSquarespaceSync([], [artwork('aw_only', 'GONE', { sold: true })], ids())
  expect(plan).toEqual({ create: [], update: [], unchanged: 0, skipped: [] })
})

test('products without images or variants are handled, not crashed on', () => {
  const plan = planSquarespaceSync([product('NI', { images: [] }), product('NV', { variants: [] })], [], ids())
  expect(plan.create).toMatchObject([{ sqspSku: 'NI', image: null, thumb: null }])
  expect(plan.skipped).toEqual([{ name: 'Work NV', reason: 'no SKU' }])
})

test('artworks without a SKU never match a blank variant SKU', () => {
  const p = product('REAL')
  p.variants.push({ ...p.variants[0], sku: '' })
  const plan = planSquarespaceSync([p], [artwork('aw_blank', '', { sqspSku: '' })], ids())
  expect(plan.create).toMatchObject([{ sqspSku: 'REAL' }])
  expect(plan.unchanged).toBe(0)
})
