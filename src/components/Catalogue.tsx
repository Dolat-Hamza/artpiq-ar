'use client'
import { useStore } from '@/store'
import ArtworkCard from './ArtworkCard'

export default function Catalogue() {
  const { artworks, activeFilter } = useStore()

  const filtered = artworks.filter(a => activeFilter === 'all' || a.type === activeFilter)

  if (!artworks.length) {
    return (
      <div className="p-3.5 grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-[--s1] rounded-xl overflow-hidden">
            <div className="w-full aspect-[4/3] skel-shimmer" />
            <div className="p-2.5">
              <div className="h-2.5 rounded skel-shimmer mb-1.5" />
              <div className="h-2.5 w-3/5 rounded skel-shimmer" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className="p-3.5 pb-20 grid gap-2.5"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}
    >
      {filtered.map(aw => <ArtworkCard key={aw.id} aw={aw} />)}
    </div>
  )
}
