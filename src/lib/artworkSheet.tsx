'use client'
import { Artwork } from '@/types'
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
