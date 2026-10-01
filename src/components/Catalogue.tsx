'use client'
import CatalogueGrid from './CatalogueGrid'

function Hero() {
  return (
    <section className="border-b border-line bg-paper">
      <div className="max-w-content mx-auto px-6 md:px-10 py-20 md:py-28 text-center">
        <p className="text-meta tracking-[0.22em] uppercase text-ink-muted mb-6 inline-flex items-center gap-2">
          <span className="w-2 h-2 bg-accent rounded-[2px] inline-block" />
          Augmented reality · Curated catalogue
        </p>
        <h1 className="font-display text-[44px] sm:text-[64px] md:text-[88px] leading-[0.98] tracking-[-0.01em] text-ink mx-auto max-w-[14ch]">
          Live with{' '}
          <span className="text-accent" style={{ fontStyle: 'italic' }}>great</span>{' '}
          paintings.
        </h1>
        <p className="mt-6 mx-auto max-w-[560px] text-[15px] leading-relaxed text-ink-muted">
          Place masterworks on your wall at true scale, or compose a private gallery on a photo of your room. No app to install.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <a href="#catalogue" className="btn-primary">
            Browse catalogue
          </a>
          <a href="/sample-room" className="btn-outline">
            Open sample room
          </a>
        </div>
      </div>
    </section>
  )
}

export default function Catalogue() {
  return (
    <>
      <Hero />
      <CatalogueGrid />
      <footer className="border-t border-line bg-paper">
        <div className="max-w-content mx-auto px-6 md:px-10 py-10 flex flex-col md:flex-row items-start md:items-center gap-3 text-body text-ink-muted">
          <span className="font-display text-ink text-[14px] tracking-[0.04em] inline-flex items-center gap-2">
            artpiq <span className="w-2 h-2 bg-accent rounded-[2px] inline-block" />
          </span>
          <span>Technology demo for placing artworks in real space.</span>
          <span className="md:ml-auto">Images via Wikimedia Commons.</span>
        </div>
      </footer>
    </>
  )
}
