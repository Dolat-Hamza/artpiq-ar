import { Artwork, ArtworkType, Orientation, Privacy } from '@/types'

const KEY = 'artpiq:artworks:v1'

export function loadLocal(): Artwork[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Artwork[]) : []
  } catch {
    return []
  }
}

export function saveLocal(list: Artwork[]) {
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function newArtwork(): Artwork {
  return {
    id: `aw_${Math.random().toString(36).slice(2, 10)}`,
    type: 'painting',
    title: '',
    artist: '',
    year: '',
    medium: '',
    widthCm: 50,
    heightCm: 70,
    image: null,
    thumb: null,
    privacy: 'public',
    currency: 'EUR',
  }
}

export function duplicateArtwork(a: Artwork): Artwork {
  return {
    ...a,
    id: `aw_${Math.random().toString(36).slice(2, 10)}`,
    title: a.title ? `${a.title} (copy)` : '',
    sqspSku: undefined,
  }
}

// Minimal CSV parser — handles quoted fields and commas. No streaming.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let cur: string[] = []
  let field = ''
  let q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') q = false
      else field += c
    } else if (c === '"') q = true
    else if (c === ',') {
      cur.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (field !== '' || cur.length) {
        cur.push(field)
        rows.push(cur)
        cur = []
        field = ''
      }
      if (c === '\r' && text[i + 1] === '\n') i++
    } else field += c
  }
  if (field !== '' || cur.length) {
    cur.push(field)
    rows.push(cur)
  }
  return rows
}

const TYPE_VALUES: ArtworkType[] = ['painting', 'sculpture', 'video', 'digital']
const ORIENT_VALUES: Orientation[] = ['portrait', 'landscape', 'square', 'panoramic']
const PRIVACY_VALUES: Privacy[] = ['public', 'private']

export function rowsToArtworks(rows: string[][]): Artwork[] {
  if (!rows.length) return []
  const header = rows[0].map(h => h.trim().toLowerCase())
  const idx = (k: string) => header.indexOf(k)
  const body = rows.slice(1).filter(r => r.some(c => c.trim() !== ''))
  return body.map((r, i) => {
    const get = (k: string) => (idx(k) >= 0 ? (r[idx(k)] ?? '').trim() : '')
    const num = (k: string) => {
      const v = parseFloat(get(k))
      return Number.isFinite(v) ? v : 0
    }
    const type = get('type') as ArtworkType
    const orient = get('orientation') as Orientation
    const privacy = get('privacy') as Privacy
    return {
      id: get('id') || `imp_${Date.now()}_${i}`,
      type: TYPE_VALUES.includes(type) ? type : 'painting',
      title: get('title'),
      artist: get('artist'),
      year: get('year'),
      medium: get('medium'),
      widthCm: num('widthcm') || num('width_cm') || num('width'),
      heightCm: num('heightcm') || num('height_cm') || num('height'),
      depthCm: num('depthcm') || undefined,
      description: get('description') || undefined,
      image: get('image') || null,
      thumb: get('thumb') || get('image') || null,
      material: get('material') || undefined,
      price: num('price') || undefined,
      currency: get('currency') || 'EUR',
      purchaseUrl: get('purchaseurl') || get('purchase_url') || undefined,
      viewMoreUrl: get('viewmoreurl') || get('view_more_url') || undefined,
      nftUrl: get('nfturl') || get('nft_url') || undefined,
      collection: get('collection') || undefined,
      orientation: ORIENT_VALUES.includes(orient) ? orient : undefined,
      privacy: PRIVACY_VALUES.includes(privacy) ? privacy : 'public',
      sold: get('sold').toLowerCase() === 'true',
      transparent: get('transparent').toLowerCase() === 'true',
    }
  })
}

export function artworksToCsv(list: Artwork[]): string {
  const cols = [
    'id', 'type', 'title', 'artist', 'year', 'medium', 'widthCm', 'heightCm', 'depthCm',
    'description', 'image', 'thumb', 'material', 'price', 'currency',
    'purchaseUrl', 'viewMoreUrl', 'nftUrl', 'collection', 'orientation', 'privacy',
    'sold', 'transparent',
  ]
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const head = cols.join(',')
  const body = list
    .map(a => cols.map(c => esc((a as unknown as Record<string, unknown>)[c])).join(','))
    .join('\n')
  return `${head}\n${body}`
}
