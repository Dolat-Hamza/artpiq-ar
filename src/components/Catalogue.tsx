'use client'
import { useStore } from '@/store'
import ArtworkCard from './ArtworkCard'

function Hero() {
  return (
    <section className="border-b border-line">
      <div className="max-w-content mx-auto px-6 md:px-12 lg:px-20 py-14 md:py-24 grid grid-cols-1 md:grid-cols-12 gap-10 items-end">
        <div className="md:col-span-7">
          <p className="text-[11px] tracking-[0.18em] uppercase text-ink-muted mb-6">
            Augmented reality · Curated catalogue
          </p>
          <h1 className="font-display text-[44px] sm:text-[64px] md:text-[88px] leading-[0.95] tracking-tight text-ink">
            Live with <em className="italic text-accent">great</em> paintings.
          </h1>
          <p className="mt-6 max-w-[520px] text-[15px] leading-relaxed text-ink-muted">
            Place masterworks on your wall at true scale, or compose a private gallery on a photo of your room. No app to install.
          </p>
        </div>
        <div className="md:col-span-5 md:pl-10">
          <div className="aspect-[3/4] bg-surface border border-line overflow-hidden">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/600px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg"
              alt="Mona Lisa"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Catalogue() {
  const { artworks, activeFilter } = useStore()
  const filtered = artworks.filter(a => activeFilter === 'all' || a.type === activeFilter)

  return (
    <>
      <Hero />
      <section className="max-w-content mx-auto px-6 md:px-12 lg:px-20 py-12 md:py-16">
        <div className="flex items-baseline justify-between mb-8 border-b border-line pb-4">
          <h2 className="font-display text-[28px] md:text-[36px] tracking-tight">
            The catalogue
          </h2>
          <p className="text-[11px] tracking-[0.18em] uppercase text-ink-muted">
            {filtered.length} works
          </p>
        </div>

        {!artworks.length ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-[3/4] skel-shimmer" />
                <div className="h-4 mt-3 w-2/3 skel-shimmer" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
            {filtered.map(aw => <ArtworkCard key={aw.id} aw={aw} />)}
          </div>
        )}
      </section>

      <footer className="border-t border-line mt-10">
        <div className="max-w-content mx-auto px-6 md:px-12 lg:px-20 py-10 flex flex-col md:flex-row items-start md:items-center gap-3 text-[12px] text-ink-muted">
          <span className="font-display text-ink text-[16px]">artpiq.</span>
          <span>A technology demo for placing artworks in real space.</span>
          <span className="md:ml-auto">Images via Wikimedia Commons.</span>
        </div>
      </footer>
    </>
  )
}
