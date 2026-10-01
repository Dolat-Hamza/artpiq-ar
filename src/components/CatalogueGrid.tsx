'use client'
import { useStore } from '@/store'
import ArtworkCard from './ArtworkCard'

export default function CatalogueGrid() {
  const { artworks, activeFilter } = useStore()
  const filtered = artworks.filter(a => activeFilter === 'all' || a.type === activeFilter)

  return (
    <section id="catalogue" className="bg-bg">
      <div className="max-w-content mx-auto px-6 md:px-10 py-12 md:py-16">
        <div className="flex items-baseline justify-between mb-6 pb-3 border-b border-line">
          <h2 className="font-display text-h2">
            The catalogue
          </h2>
          <p className="text-meta tracking-[0.18em] uppercase text-ink-muted">
            {filtered.length} works
          </p>
        </div>

        {!artworks.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-[4/5] skel-shimmer" />
                <div className="h-4 mt-3 w-2/3 skel-shimmer mx-auto" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
            {filtered.map(aw => <ArtworkCard key={aw.id} aw={aw} />)}
          </div>
        )}
      </div>
    </section>
  )
}
