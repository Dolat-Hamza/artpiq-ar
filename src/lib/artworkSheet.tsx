'use client'
import { Artwork, Collection } from '@/types'
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer'

/**
 * Fetch image via our proxy and convert blob → data URI.
 * react-pdf can embed data URIs directly into the PDF.
 */
async function fetchAsDataUri(url: string | null | undefined): Promise<string | null> {
  if (!url) return null
  if (url.startsWith('data:')) return url
  try {
    const res = await fetch(`/api/image-proxy?url=${encodeURIComponent(url)}`)
    if (!res.ok) {
      console.warn('[hydrate] proxy non-ok', res.status)
      return null
    }
    const blob = await res.blob()
    return await new Promise(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch (e) {
    console.warn('[hydrate] fetch error', e)
    return null
  }
}

/**
 * Pre-fetch all artwork images as base64 data URIs (sequentially, batched).
 * Returns artworks with image/thumb replaced by data URIs.
 * react-pdf embeds data URIs directly — no further fetching at render time.
 */
export async function hydrateImages(
  artworks: Artwork[],
  opts: { preferThumb?: boolean; concurrency?: number } = {},
): Promise<(Artwork & { _dataUrl: string | null })[]> {
  const { preferThumb = true, concurrency = 3 } = opts
  const results: (Artwork & { _dataUrl: string | null })[] = []

  for (let i = 0; i < artworks.length; i += concurrency) {
    const batch = artworks.slice(i, i + concurrency)
    const hydrated = await Promise.all(
      batch.map(async a => {
        const src = preferThumb ? (a.thumb ?? a.image) : (a.image ?? a.thumb)
        const dataUri = await fetchAsDataUri(src)
        return {
          ...a,
          _dataUrl: dataUri,
          image: dataUri ?? a.image,
          thumb: dataUri ?? a.thumb,
        }
      }),
    )
    results.push(...hydrated)
  }
  return results
}

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: 'Helvetica' },
  hero: { marginBottom: 24 },
  image: {
    width: '100%',
    maxHeight: 360,
    objectFit: 'contain',
    marginBottom: 16,
  },
  title: { fontSize: 22, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  artist: { fontSize: 12, color: '#555', marginBottom: 12 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 0, marginBottom: 16 },
  metaCell: { width: '50%', marginBottom: 8 },
  label: {
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#888',
    marginBottom: 2,
  },
  value: { fontSize: 11 },
  description: { marginTop: 16, lineHeight: 1.5 },
  divider: { borderBottomWidth: 1, borderColor: '#ddd', marginVertical: 12 },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    fontSize: 9,
    color: '#888',
    textAlign: 'center',
  },
})

function ArtworkSheet({ artwork }: { artwork: Artwork }) {
  const meta: Array<[string, string]> = [
    ['Year', artwork.year || '—'],
    ['Medium', artwork.medium || '—'],
    [
      'Dimensions',
      `${artwork.widthCm} × ${artwork.heightCm}${
        artwork.depthCm ? ` × ${artwork.depthCm}` : ''
      } cm`,
    ],
    ['Type', artwork.type],
    ['Material', artwork.material || '—'],
    ['Collection', artwork.collection || '—'],
    [
      'Price',
      artwork.price != null
        ? `${artwork.currency || ''} ${artwork.price.toLocaleString()}`.trim()
        : '—',
    ],
    ['SKU', artwork.sqspSku || artwork.id],
  ]

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.hero}>
          <Text style={styles.label}>Artpiq · Artwork sheet</Text>
        </View>
        {artwork.image && <Image src={artwork.image} style={styles.image} />}
        <Text style={styles.title}>{artwork.title}</Text>
        <Text style={styles.artist}>{artwork.artist || 'Unknown artist'}</Text>
        <View style={styles.divider} />
        <View style={styles.metaGrid}>
          {meta.map(([k, v]) => (
            <View key={k} style={styles.metaCell}>
              <Text style={styles.label}>{k}</Text>
              <Text style={styles.value}>{v}</Text>
            </View>
          ))}
        </View>
        {artwork.description && (
          <>
            <View style={styles.divider} />
            <Text style={styles.label}>Description</Text>
            <Text style={styles.description}>{artwork.description}</Text>
          </>
        )}
        <Text style={styles.footer}>
          artpiq.com · {artwork.purchaseUrl || artwork.viewMoreUrl || ''}
        </Text>
      </Page>
    </Document>
  )
}

export async function exportArtworkPdf(artwork: Artwork): Promise<void> {
  const [hw] = await hydrateImages([artwork], { preferThumb: false })
  const blob = await pdf(<ArtworkSheet artwork={hw} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${artwork.id}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

function CollectionPdf({
  collection,
  artworks,
}: {
  collection: Collection
  artworks: Artwork[]
}) {
  return (
    <Document>
      {/* Cover: title + grid of all works */}
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.label}>Artpiq · Collection</Text>
        <Text style={{ fontSize: 26, fontFamily: 'Helvetica-Bold', marginTop: 8 }}>
          {collection.name}
        </Text>
        {collection.description && (
          <Text style={{ marginTop: 6, fontSize: 10, color: '#555', lineHeight: 1.4 }}>
            {collection.description}
          </Text>
        )}
        <View style={{ marginTop: 10, marginBottom: 14 }}>
          <Text style={{ fontSize: 9, color: '#666' }}>
            {artworks.length} works
          </Text>
        </View>
        <View style={styles.divider} />
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 0,
            marginTop: 8,
          }}
        >
          {artworks.map(a => (
            <View
              key={a.id}
              style={{
                width: '33.33%',
                paddingRight: 6,
                paddingBottom: 12,
              }}
            >
              {a.image && (
                <Image
                  src={a.image}
                  style={{
                    width: '100%',
                    height: 120,
                    objectFit: 'contain',
                    backgroundColor: '#f5f5f5',
                  }}
                />
              )}
              <Text
                style={{
                  fontSize: 9,
                  fontFamily: 'Helvetica-Bold',
                  marginTop: 4,
                }}
              >
                {a.title}
              </Text>
              <Text style={{ fontSize: 8, color: '#666' }}>
                {a.artist || ''}
                {a.year ? `  ·  ${a.year}` : ''}
              </Text>
              <Text style={{ fontSize: 8, color: '#666' }}>
                {a.widthCm} × {a.heightCm} cm
              </Text>
              {a.price != null && (
                <Text
                  style={{
                    fontSize: 9,
                    fontFamily: 'Helvetica-Bold',
                    marginTop: 2,
                  }}
                >
                  {a.currency || ''} {a.price.toLocaleString()}
                </Text>
              )}
            </View>
          ))}
        </View>
        <Text style={styles.footer}>
          artpiq.com · {new Date().toISOString().slice(0, 10)}
        </Text>
      </Page>
      {/* One page per artwork */}
      {artworks.map(a => (
        <Page key={a.id} size="A4" style={styles.page}>
          <View style={styles.hero}>
            <Text style={styles.label}>{collection.name}</Text>
          </View>
          {a.image && <Image src={a.image} style={styles.image} />}
          <Text style={styles.title}>{a.title}</Text>
          <Text style={styles.artist}>{a.artist || 'Unknown artist'}</Text>
          <View style={styles.divider} />
          <View style={styles.metaGrid}>
            {[
              ['Year', a.year || '—'],
              ['Medium', a.medium || '—'],
              [
                'Dimensions',
                `${a.widthCm} × ${a.heightCm}${a.depthCm ? ` × ${a.depthCm}` : ''} cm`,
              ],
              ['Status', a.status || (a.sold ? 'sold' : 'for_sale')],
              [
                'Price',
                a.price != null
                  ? `${a.currency || ''} ${a.price.toLocaleString()}`.trim()
                  : '—',
              ],
              ['SKU', a.sqspSku || a.id],
            ].map(([k, v]) => (
              <View key={k} style={styles.metaCell}>
                <Text style={styles.label}>{k}</Text>
                <Text style={styles.value}>{v}</Text>
              </View>
            ))}
          </View>
          {a.description && (
            <>
              <View style={styles.divider} />
              <Text style={styles.label}>Description</Text>
              <Text style={styles.description}>{a.description}</Text>
            </>
          )}
          <Text style={styles.footer}>{collection.name} · artpiq.com</Text>
        </Page>
      ))}
    </Document>
  )
}

export async function exportCollectionPdf(
  collection: Collection,
  artworks: Artwork[],
): Promise<void> {
  const hw = await hydrateImages(artworks)
  const blob = await pdf(
    <CollectionPdf collection={collection} artworks={hw} />,
  ).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${collection.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

// ============================================================
// Presentation layouts (Thomas's request)
// ============================================================

export type PresentationLayout =
  | 'portfolio'    // Large image, minimal text, no price — artist/gallery focus
  | 'price-list'   // Compact table with price, dims, medium — sales tool
  | 'press-kit'    // Full description + details, no price — press release
  | 'catalogue'    // Grid cover + per-artwork pages with optional price

export interface PresentationOptions {
  title: string
  showPrice: boolean
  layout: PresentationLayout
  artworks: Artwork[]
}

// Portfolio — full-page image, title/artist/dims only, clean white
function PortfolioPdf({ title, artworks, showPrice }: { title: string; artworks: Artwork[]; showPrice: boolean }) {
  return (
    <Document>
      {artworks.map(a => (
        <Page key={a.id} size="A4" orientation="landscape" style={{ padding: 0, backgroundColor: '#FFFFFF' }}>
          <View style={{ flexDirection: 'row', height: '100%' }}>
            {/* Image — left 60% */}
            <View style={{ width: '60%', backgroundColor: '#F5F5F3', justifyContent: 'center', alignItems: 'center' }}>
              {a.image && (
                <Image src={a.image} style={{ maxWidth: '90%', maxHeight: '85%', objectFit: 'contain' }} />
              )}
            </View>
            {/* Info — right 40% */}
            <View style={{ width: '40%', padding: 48, justifyContent: 'center' }}>
              <Text style={{ fontSize: 8, letterSpacing: 2, color: '#999', textTransform: 'uppercase', marginBottom: 20 }}>
                {title}
              </Text>
              <Text style={{ fontSize: 28, fontFamily: 'Helvetica-Bold', lineHeight: 1.1, marginBottom: 8 }}>
                {a.title}
              </Text>
              <Text style={{ fontSize: 13, color: '#666', marginBottom: 24 }}>{a.artist || ''}</Text>
              <View style={{ borderTopWidth: 1, borderColor: '#E5E5E5', paddingTop: 20 }}>
                <Text style={{ fontSize: 10, color: '#999', marginBottom: 4 }}>{a.year || ''}</Text>
                <Text style={{ fontSize: 10, color: '#999', marginBottom: 4 }}>{a.medium || ''}</Text>
                <Text style={{ fontSize: 10, color: '#999' }}>{a.widthCm} × {a.heightCm}{a.depthCm ? ` × ${a.depthCm}` : ''} cm</Text>
                {showPrice && a.price != null && (
                  <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', marginTop: 16 }}>
                    {a.currency || 'EUR'} {a.price.toLocaleString()}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </Page>
      ))}
    </Document>
  )
}

// Price list — compact table, small thumbnails, price prominent
function PriceListPdf({ title, artworks }: { title: string; artworks: Artwork[] }) {
  return (
    <Document>
      <Page size="A4" style={{ ...styles.page, padding: 40 }}>
        <Text style={{ fontSize: 8, letterSpacing: 2, color: '#999', textTransform: 'uppercase', marginBottom: 4 }}>{title}</Text>
        <Text style={{ fontSize: 22, fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>Price List</Text>
        <Text style={{ fontSize: 8, color: '#999', marginBottom: 20 }}>{new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</Text>
        <View style={{ borderBottomWidth: 1, borderColor: '#E5E5E5', marginBottom: 12 }} />
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          <Text style={{ width: 60, fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', color: '#999' }}>Image</Text>
          <Text style={{ flex: 1, fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', color: '#999' }}>Title / Artist</Text>
          <Text style={{ width: 110, fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', color: '#999' }}>Medium / Dims</Text>
          <Text style={{ width: 70, fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', color: '#999', textAlign: 'right' }}>Price</Text>
        </View>
        {artworks.map(a => (
          <View key={a.id} style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#F0F0F0', paddingVertical: 8, alignItems: 'center' }}>
            <View style={{ width: 60 }}>
              {a.image && <Image src={a.image} style={{ width: 44, height: 44, objectFit: 'contain', backgroundColor: '#F5F5F5' }} />}
            </View>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold' }}>{a.title}</Text>
              <Text style={{ fontSize: 9, color: '#666' }}>{a.artist || '—'}{a.year ? `  ·  ${a.year}` : ''}</Text>
            </View>
            <View style={{ width: 110 }}>
              <Text style={{ fontSize: 8, color: '#666' }}>{a.medium || '—'}</Text>
              <Text style={{ fontSize: 8, color: '#666' }}>{a.widthCm} × {a.heightCm} cm</Text>
            </View>
            <Text style={{ width: 70, fontSize: 10, fontFamily: 'Helvetica-Bold', textAlign: 'right' }}>
              {a.price != null ? `${a.currency || 'EUR'} ${a.price.toLocaleString()}` : 'POA'}
            </Text>
          </View>
        ))}
        <Text style={{ ...styles.footer, bottom: 24 }}>artpiq.com</Text>
      </Page>
    </Document>
  )
}

// Press kit — full description + details, NO price
function PressKitPdf({ title, artworks }: { title: string; artworks: Artwork[] }) {
  return (
    <Document>
      {artworks.map(a => (
        <Page key={a.id} size="A4" style={styles.page}>
          <Text style={{ fontSize: 8, letterSpacing: 2, color: '#999', textTransform: 'uppercase', marginBottom: 16 }}>{title} · Press</Text>
          {a.image && <Image src={a.image} style={{ width: '100%', height: 300, objectFit: 'contain', backgroundColor: '#F5F5F5', marginBottom: 20 }} />}
          <Text style={{ fontSize: 24, fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>{a.title}</Text>
          <Text style={{ fontSize: 13, color: '#555', marginBottom: 16 }}>{a.artist || 'Unknown artist'}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
            {[
              ['Year', a.year],
              ['Medium', a.medium],
              ['Dimensions', `${a.widthCm} × ${a.heightCm}${a.depthCm ? ` × ${a.depthCm}` : ''} cm`],
              ['Material', a.material],
            ].filter(([, v]) => v).map(([k, v]) => (
              <View key={k as string} style={{ width: '50%', marginBottom: 8 }}>
                <Text style={{ fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', color: '#999', marginBottom: 2 }}>{k}</Text>
                <Text style={{ fontSize: 10 }}>{v}</Text>
              </View>
            ))}
          </View>
          {a.description && (
            <>
              <View style={{ borderTopWidth: 1, borderColor: '#E5E5E5', marginBottom: 12 }} />
              <Text style={{ fontSize: 10, lineHeight: 1.6, color: '#333' }}>{a.description}</Text>
            </>
          )}
          <Text style={styles.footer}>artpiq.com · Press enquiries: {a.contactEmail || ''}</Text>
        </Page>
      ))}
    </Document>
  )
}

export async function exportPresentation(options: PresentationOptions): Promise<void> {
  const { title, artworks, showPrice, layout } = options
  const preferThumb = layout !== 'portfolio' && layout !== 'press-kit'
  const hw = await hydrateImages(artworks, { preferThumb })
  let doc: React.ReactElement<Record<string, unknown>>
  if (layout === 'portfolio') {
    doc = <PortfolioPdf title={title} artworks={hw} showPrice={showPrice} />
  } else if (layout === 'price-list') {
    doc = <PriceListPdf title={title} artworks={hw} />
  } else if (layout === 'press-kit') {
    doc = <PressKitPdf title={title} artworks={hw} />
  } else {
    doc = <CollectionPdf
      collection={{ id: '', ownerId: '', name: title, description: '', privacy: 'private' } as Collection}
      artworks={hw}
    />
  }
  const blob = await pdf(doc).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${layout}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
