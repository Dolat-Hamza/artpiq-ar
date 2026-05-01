'use client'
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  getDiscoverProfileBySlug,
  listPublicArtworksByOwner,
} from '@/lib/db/discover'
import { rowToArtwork } from '@/lib/db/artworks'
import NewsletterForm from '@/components/NewsletterForm'
import { Artwork, DiscoverProfile } from '@/types'

export default function DiscoverPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [profile, setProfile] = useState<DiscoverProfile | null>(null)
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const p = await getDiscoverProfileBySlug(slug)
        if (cancelled) return
        if (!p) {
          setNotFound(true)
          return
        }
        setProfile(p)
        const rows = await listPublicArtworksByOwner(p.ownerId)
        if (!cancelled)
          setArtworks(rows.map(r => rowToArtwork(r as Parameters<typeof rowToArtwork>[0])))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <p className="text-[12px] tracking-[0.2em] uppercase text-ink-muted">Loading…</p>
      </div>
    )
  }
  if (notFound || !profile) {
    return (
      <div className="min-h-dvh grid place-items-center p-6 text-center">
        <div>
          <p className="font-display text-[24px]">Profile not available</p>
          <Link
            href="/"
            className="mt-6 inline-block px-3 py-2 text-[11px] tracking-[0.18em] uppercase border border-line"
          >
            Back to artpiq
          </Link>
        </div>
      </div>
    )
  }

  const accent = profile.theme?.accent || '#0a0a0a'
  const bg = profile.theme?.bg || '#ffffff'

  return (
    <div className="min-h-dvh" style={{ background: bg, color: accent }}>
      {profile.heroImageUrl && (
        <div className="w-full aspect-[3/1] overflow-hidden">
          <img
            src={profile.heroImageUrl}
            alt={profile.displayName}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <header className="max-w-content mx-auto px-6 md:px-12 py-10">
        <p
          className="text-[11px] tracking-[0.22em] uppercase opacity-60"
          style={{ color: accent }}
        >
          Artist · artpiq
        </p>
        <h1 className="font-display text-[40px] md:text-[56px] tracking-tight leading-[1.05]">
          {profile.displayName}
        </h1>
        {profile.bio && (
          <p className="mt-4 text-[15px] max-w-[640px] opacity-80 whitespace-pre-line">
            {profile.bio}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-4 text-[12px] tracking-[0.14em] uppercase opacity-70">
          {profile.contactEmail && (
            <a href={`mailto:${profile.contactEmail}`} className="underline">
              {profile.contactEmail}
            </a>
          )}
          {profile.social?.instagram && (
            <a href={profile.social.instagram} target="_blank" rel="noopener" className="underline">
              Instagram
            </a>
          )}
          {profile.social?.twitter && (
            <a href={profile.social.twitter} target="_blank" rel="noopener" className="underline">
              Twitter
            </a>
          )}
          {profile.social?.website && (
            <a href={profile.social.website} target="_blank" rel="noopener" className="underline">
              Website
            </a>
          )}
        </div>
      </header>

      <main className="max-w-content mx-auto px-6 md:px-12 pb-12">
        <p className="text-[11px] tracking-[0.18em] uppercase opacity-60 mb-3">
          Works ({artworks.length})
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {artworks.map(a => (
            <article key={a.id} className="border" style={{ borderColor: accent + '20' }}>
              <div className="aspect-[3/4] overflow-hidden bg-black/5">
                {a.image && (
                  <img src={a.image} alt={a.title} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="p-3 text-[12px]">
                <p className="font-display truncate">{a.title}</p>
                <p className="opacity-60 text-[10px] uppercase tracking-[0.14em] mt-0.5">
                  {a.widthCm} × {a.heightCm} cm
                  {a.price != null && ` · ${a.currency || ''} ${a.price.toLocaleString()}`}
                </p>
              </div>
            </article>
          ))}
        </div>
      </main>

      <section className="border-t" style={{ borderColor: accent + '20' }}>
        <div className="max-w-content mx-auto px-6 md:px-12 py-10">
          <NewsletterForm
            ownerId={profile.ownerId}
            source={`Discover:${profile.slug}`}
            label="Stay in the loop"
          />
        </div>
      </section>

      <footer className="border-t py-6" style={{ borderColor: accent + '20' }}>
        <div className="max-w-content mx-auto px-6 md:px-12 flex justify-between items-center text-[11px] tracking-[0.16em] uppercase opacity-60">
          <span>artpiq · discover</span>
          <Link href="/" className="hover:opacity-100">
            Back to artpiq
          </Link>
        </div>
      </footer>
    </div>
  )
}
