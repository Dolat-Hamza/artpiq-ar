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

// ----- Import preview (extended CSV w/ ownership) -----
// Schema rows produced by the bulk-import preview. Errors are surfaced per-row
// so the user can fix and re-upload, rather than silently dropping bad rows.
export type ImportRowResult = {
  rowNumber: number              // 1-indexed, matches the spreadsheet
  artwork?: Artwork               // present if the row is importable
  ownerContactEmail?: string      // raw email from CSV, if supplied
  warnings: string[]              // non-fatal (e.g. "ownershipStatus defaulted to 'dealer'")
  errors: string[]                // fatal — row will NOT be imported
}

export type ImportPreview = {
  rows: ImportRowResult[]
  validCount: number
  errorCount: number
  totalRows: number
}

const OWNERSHIP_VALUES: Array<NonNullable<Artwork['ownershipStatus']>> = ['dealer', 'artist', 'collector']

// Build a validated preview. `resolveContactId(email)` is called once per unique
// non-empty email to map ownerContactEmail → contacts.id within the current owner.
export async function rowsToImportPreview(
  rows: string[][],
  resolveContactId: (email: string) => Promise<string | null>,
): Promise<ImportPreview> {
  if (rows.length < 2) {
    return { rows: [], validCount: 0, errorCount: 0, totalRows: 0 }
  }
  const header = rows[0].map(h => h.trim().toLowerCase())
  const idx = (k: string) => header.indexOf(k)
  const has = (k: string) => idx(k) >= 0

  // Cache email→contactId lookups so we don't hit the DB twice for the same email.
  const emailCache = new Map<string, string | null>()
  async function resolveCached(email: string): Promise<string | null> {
    const key = email.trim().toLowerCase()
    if (!key) return null
    if (emailCache.has(key)) return emailCache.get(key)!
    const id = await resolveContactId(key)
    emailCache.set(key, id)
    return id
  }

  const results: ImportRowResult[] = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    // Empty row — skip silently
    if (!r.some(c => c.trim() !== '')) continue
    const rowNumber = i + 1 // 1-indexed including header
    const get = (k: string) => (has(k) ? (r[idx(k)] ?? '').trim() : '')
    const num = (k: string): number => {
      const raw = get(k)
      if (raw === '') return 0
      const v = parseFloat(raw)
      return Number.isFinite(v) ? v : 0
    }
    const warnings: string[] = []
    const errors: string[] = []

    const title = get('title')
    if (!title) errors.push('Missing required column "title".')
    const width = num('widthcm') || num('width_cm') || num('width')
    const height = num('heightcm') || num('height_cm') || num('height')
    if (!width) errors.push('Missing or invalid "widthCm".')
    if (!height) errors.push('Missing or invalid "heightCm".')

    const type = get('type') as ArtworkType
    if (get('type') && !TYPE_VALUES.includes(type)) {
      warnings.push(`Unknown type "${get('type')}" — defaulted to "painting".`)
    }
    const orient = get('orientation') as Orientation
    if (get('orientation') && !ORIENT_VALUES.includes(orient)) {
      warnings.push(`Unknown orientation "${get('orientation')}" — left blank.`)
    }
    const privacy = get('privacy') as Privacy
    if (get('privacy') && !PRIVACY_VALUES.includes(privacy)) {
      warnings.push(`Unknown privacy "${get('privacy')}" — defaulted to "public".`)
    }

    // Ownership: optional fields. If ownerContactEmail is given, resolve it.
    const ownerContactEmailRaw = get('ownercontactemail') || get('owner_contact_email')
    let ownerContactId: string | null = null
    if (ownerContactEmailRaw) {
      ownerContactId = await resolveCached(ownerContactEmailRaw)
      if (!ownerContactId) {
        errors.push(`Contact with email "${ownerContactEmailRaw}" not found — create the contact first, or remove the column.`)
      }
    }
    const ownershipRaw = get('ownershipstatus') || get('ownership_status')
    let ownershipStatus: Artwork['ownershipStatus'] | undefined
    if (ownershipRaw) {
      const lower = ownershipRaw.toLowerCase() as NonNullable<Artwork['ownershipStatus']>
      if (OWNERSHIP_VALUES.includes(lower)) {
        ownershipStatus = lower
      } else {
        errors.push(`Invalid "ownershipStatus" value "${ownershipRaw}" — must be dealer | artist | collector.`)
      }
    } else if (ownerContactId) {
      ownershipStatus = 'collector'
      warnings.push('ownershipStatus not given — defaulted to "collector" since ownerContactEmail was set.')
    }
    const costBasisRaw = get('costbasis') || get('cost_basis')
    const costBasis = costBasisRaw ? parseFloat(costBasisRaw) : undefined
    if (costBasisRaw && !Number.isFinite(costBasis)) {
      errors.push(`Invalid "costBasis" — must be a number.`)
    }
    const purchaseDateRaw = get('purchasedate') || get('purchase_date')
    const purchaseDate = purchaseDateRaw || undefined
    if (purchaseDateRaw && Number.isNaN(Date.parse(purchaseDateRaw))) {
      warnings.push(`Could not parse "purchaseDate" — kept the raw string.`)
    }

    if (errors.length) {
      results.push({ rowNumber, ownerContactEmail: ownerContactEmailRaw || undefined, warnings, errors })
      continue
    }

    const artwork: Artwork = {
      id: get('id') || `imp_${Date.now()}_${i}`,
      type: TYPE_VALUES.includes(type) ? type : 'painting',
      title,
      artist: get('artist'),
      year: get('year'),
      medium: get('medium'),
      widthCm: width,
      heightCm: height,
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
      ownerContactId: ownerContactId ?? undefined,
      ownershipStatus,
      costBasis: Number.isFinite(costBasis) ? costBasis : undefined,
      purchaseDate,
    }

    results.push({ rowNumber, artwork, ownerContactEmail: ownerContactEmailRaw || undefined, warnings, errors: [] })
  }
  const validCount = results.filter(r => r.artwork && !r.errors.length).length
  const errorCount = results.length - validCount
  return { rows: results, validCount, errorCount, totalRows: results.length }
}

// CSV template emitted by the "Download template" button. Documents every
// column we accept on import, with example rows.
export function importTemplateCsv(): string {
  const head = [
    'id', 'type', 'title', 'artist', 'year', 'medium',
    'widthCm', 'heightCm', 'depthCm',
    'description', 'image', 'thumb', 'material',
    'price', 'currency', 'purchaseUrl', 'viewMoreUrl', 'nftUrl',
    'collection', 'orientation', 'privacy', 'sold', 'transparent',
    // Ownership (optional — leave blank for plain dealer-stock imports)
    'ownerContactEmail', 'ownershipStatus', 'costBasis', 'purchaseDate',
  ].join(',')
  const example1 = [
    '', 'painting', 'Untitled #4', 'Jane Doe', '2025', 'Acrylic on canvas',
    '120', '180', '4',
    'A red field with a single line of gold.', 'https://…/image.jpg', '',
    'canvas', '4500', 'EUR', '', '', '',
    'Spring Show', 'portrait', 'public', 'false', 'false',
    '', 'dealer', '2000', '2024-09-12',
  ].join(',')
  const example2 = [
    '', 'sculpture', 'Bronze 12', 'John Smith', '2024', 'Bronze',
    '40', '60', '40',
    '', '', '', 'bronze', '8000', 'EUR', '', '', '',
    '', 'square', 'private', 'false', 'false',
    'collector@example.com', 'collector', '', '2025-01-08',
  ].join(',')
  return [head, example1, example2].join('\n')
}

export function downloadImportTemplate() {
  const blob = new Blob([importTemplateCsv()], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'artpiq-artwork-import-template.csv'
  a.click()
  URL.revokeObjectURL(url)
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
