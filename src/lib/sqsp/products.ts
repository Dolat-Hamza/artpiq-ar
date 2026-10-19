// Squarespace Commerce Products API (v2) shapes we read.
export interface SqspVariant {
  sku: string
  pricing: { basePrice: { currency: string; value: string } }
  stock?: { quantity: number; unlimited: boolean }
  shippingMeasurements?: { dimensions?: { width: number; height: number; length?: number; unit: string } }
}

export interface SqspProduct {
  id: string
  name: string
  url: string
  isVisible: boolean
  tags: string[]
  images: { url: string }[]
  variants: SqspVariant[]
}

export type Fetcher = (url: string, init: RequestInit) => Promise<Response>

const API = 'https://api.squarespace.com/v2/commerce/products'

// The API returns 50 products per page; a cursor carries the original filters.
export async function fetchSquarespaceProducts(apiKey: string, fetcher: Fetcher = fetch): Promise<SqspProduct[]> {
  const headers = { Authorization: `Bearer ${apiKey}`, 'User-Agent': 'ArtPiq catalogue sync' }
  const products: SqspProduct[] = []
  let url: string | null = `${API}?type=PHYSICAL`
  while (url) {
    const res = await fetcher(url, { headers })
    if (!res.ok) throw new Error(`Squarespace API ${res.status}`)
    const page = await res.json() as { products: SqspProduct[]; pagination: { hasNextPage: boolean; nextPageCursor?: string } }
    products.push(...page.products)
    const cursor = page.pagination.hasNextPage && page.pagination.nextPageCursor
    url = cursor ? `${API}?cursor=${encodeURIComponent(cursor)}` : null
  }
  return products
}
