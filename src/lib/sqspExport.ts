import { Artwork } from '@/types'

// Squarespace Commerce CSV import format.
// Reference: https://support.squarespace.com/hc/en-us/articles/206543167
// Required columns: Product ID, Variant ID, Product Type, Product Page,
// Product URL, Title, Description, SKU, Option Name 1, Option Value 1,
// Price, Sale Price, On Sale, Stock, Categories, Tags, Weight, Length,
// Width, Height, Visible, Hosted Image URLs.
const HEADERS = [
  'Product ID',
  'Variant ID',
  'Product Type',
  'Product Page',
  'Product URL',
  'Title',
  'Description',
  'SKU',
  'Option Name 1',
  'Option Value 1',
  'Price',
  'Sale Price',
  'On Sale',
  'Stock',
  'Categories',
  'Tags',
  'Weight',
  'Length',
  'Width',
  'Height',
  'Visible',
  'Hosted Image URLs',
]

function esc(v: unknown): string {
  if (v == null) return ''
  const s = String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function artworksToSqspCsv(list: Artwork[]): string {
  const rows = list.map(a => {
    const sku = a.sqspSku || a.id
    const slug = (a.title || a.id)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    return [
      sku,
      sku,
      'PHYSICAL',
      'Artworks', // Product Page (the page where products live)
      slug,
      a.title,
      [
        a.description || '',
        a.artist ? `\nBy ${a.artist}.` : '',
        a.year ? ` ${a.year}.` : '',
        a.medium ? ` ${a.medium}.` : '',
        ` Dimensions: ${a.widthCm}×${a.heightCm}${a.depthCm ? `×${a.depthCm}` : ''} cm.`,
      ]
        .join('')
        .trim(),
      sku,
      'Title',
      a.title,
      a.price ?? '',
      '', // sale price
      'No',
      a.sold ? 0 : 1,
      a.collection || a.type,
      [a.type, a.material, a.orientation].filter(Boolean).join(','),
      '', // weight
      a.depthCm ?? '',
      a.widthCm,
      a.heightCm,
      a.privacy === 'private' ? 'No' : 'Yes',
      a.image ?? '',
    ].map(esc).join(',')
  })
  return [HEADERS.join(','), ...rows].join('\n')
}

export function downloadSqspCsv(list: Artwork[]): void {
  const csv = artworksToSqspCsv(list)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `artpiq-sqsp-commerce-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
