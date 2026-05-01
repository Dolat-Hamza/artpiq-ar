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
  page: { padding: 36, fontSize: 10, fontFamily: 'Helvetica' },
  cover: { padding: 48 },
  label: {
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#888',
    marginBottom: 4,
  },
  title: { fontSize: 28, fontFamily: 'Helvetica-Bold' },
  groupHeader: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginTop: 16,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 0 },
  cell: { width: '25%', paddingRight: 6, paddingBottom: 12 },
  thumb: {
    width: '100%',
    height: 90,
    objectFit: 'contain',
    backgroundColor: '#f5f5f5',
  },
  cellTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', marginTop: 3 },
  cellMeta: { fontSize: 7, color: '#666' },
  cellPrice: { fontSize: 8, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 36,
    right: 36,
    fontSize: 8,
    color: '#888',
    textAlign: 'center',
  },
  totals: {
    marginTop: 24,
    borderTopWidth: 1,
    borderColor: '#ddd',
    paddingTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
  },
  statCell: { width: '33%', paddingRight: 8, paddingBottom: 8 },
  statValue: { fontSize: 18, fontFamily: 'Helvetica-Bold' },
})

type GroupBy = 'artist' | 'collection' | 'none'

function groupArtworks(list: Artwork[], by: GroupBy): Record<string, Artwork[]> {
  if (by === 'none') return { Inventory: list }
  const groups: Record<string, Artwork[]> = {}
  for (const a of list) {
    const key =
      by === 'artist' ? (a.artist || 'Unknown artist') : (a.collection || 'Uncategorised')
    if (!groups[key]) groups[key] = []
    groups[key].push(a)
  }
  return groups
}

function InventoryReport({
  artworks,
  groupBy,
  ownerEmail,
}: {
  artworks: Artwork[]
  groupBy: GroupBy
  ownerEmail?: string
}) {
  const groups = groupArtworks(artworks, groupBy)
  const groupKeys = Object.keys(groups).sort()
  const totalValue = artworks.reduce((s, a) => s + (a.price ?? 0), 0)
  const currency = artworks.find(a => a.currency)?.currency || ''
  const counts = {
    forSale: artworks.filter(a => (a.status ?? 'for_sale') === 'for_sale').length,
    sold: artworks.filter(a => a.status === 'sold').length,
    rented: artworks.filter(a => a.status === 'rented').length,
    reserved: artworks.filter(a => a.status === 'reserved').length,
  }
  return (
    <Document>
      {/* Cover */}
      <Page size="A4" style={styles.cover}>
        <Text style={styles.label}>Artpiq · Inventory Report</Text>
        <Text style={[styles.title, { marginTop: 8 }]}>Full inventory</Text>
        <Text style={{ marginTop: 6, fontSize: 11, color: '#555' }}>
          {artworks.length} works · grouped by {groupBy === 'none' ? 'none' : groupBy} ·{' '}
          {new Date().toISOString().slice(0, 10)}
          {ownerEmail ? ` · ${ownerEmail}` : ''}
        </Text>
        <View style={styles.totals}>
          <View style={styles.statCell}>
            <Text style={styles.label}>Total works</Text>
            <Text style={styles.statValue}>{artworks.length}</Text>
          </View>
          {totalValue > 0 && (
            <View style={styles.statCell}>
              <Text style={styles.label}>Total list value</Text>
              <Text style={styles.statValue}>
                {currency} {totalValue.toLocaleString()}
              </Text>
            </View>
          )}
          <View style={styles.statCell}>
            <Text style={styles.label}>Groups</Text>
            <Text style={styles.statValue}>{groupKeys.length}</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.label}>For sale</Text>
            <Text style={styles.statValue}>{counts.forSale}</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.label}>Sold</Text>
            <Text style={styles.statValue}>{counts.sold}</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.label}>Reserved / rented</Text>
            <Text style={styles.statValue}>{counts.reserved + counts.rented}</Text>
          </View>
        </View>
        <Text style={styles.footer}>artpiq.com · Inventory Report</Text>
      </Page>

      {/* Groups */}
      {groupKeys.map(key => {
        const items = groups[key]
        const sub = items.reduce((s, a) => s + (a.price ?? 0), 0)
        return (
          <Page key={key} size="A4" style={styles.page} wrap>
            <Text style={styles.label}>Group</Text>
            <Text style={styles.groupHeader}>
              {key} ({items.length})
              {sub > 0 ? `  ·  ${currency} ${sub.toLocaleString()}` : ''}
            </Text>
            <View style={styles.grid}>
              {items.map(a => (
                <View key={a.id} style={styles.cell} wrap={false}>
                  {a.image && <Image src={a.image} style={styles.thumb} />}
                  <Text style={styles.cellTitle}>{a.title}</Text>
                  <Text style={styles.cellMeta}>
                    {a.artist || ''}
                    {a.year ? `  ·  ${a.year}` : ''}
                  </Text>
                  <Text style={styles.cellMeta}>
                    {a.widthCm} × {a.heightCm}{a.depthCm ? ` × ${a.depthCm}` : ''} cm
                  </Text>
                  <Text style={styles.cellMeta}>{a.status ?? 'for_sale'}</Text>
                  {a.price != null && (
                    <Text style={styles.cellPrice}>
                      {a.currency || ''} {a.price.toLocaleString()}
                    </Text>
                  )}
                </View>
              ))}
            </View>
            <Text style={styles.footer}>{key} · artpiq.com</Text>
          </Page>
        )
      })}
    </Document>
  )
}

export async function exportInventoryPdf(
  artworks: Artwork[],
  opts: { groupBy?: GroupBy; ownerEmail?: string } = {},
): Promise<void> {
  const blob = await pdf(
    <InventoryReport
      artworks={artworks}
      groupBy={opts.groupBy ?? 'artist'}
      ownerEmail={opts.ownerEmail}
    />,
  ).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `inventory-${new Date().toISOString().slice(0, 10)}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
