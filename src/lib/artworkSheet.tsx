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
  const blob = await pdf(<ArtworkSheet artwork={artwork} />).toBlob()
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
  const blob = await pdf(
    <CollectionPdf collection={collection} artworks={artworks} />,
  ).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${collection.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
