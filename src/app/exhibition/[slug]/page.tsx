'use client'
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { getExhibitionBySlug } from '@/lib/db/exhibitions'
import { rowToArtwork } from '@/lib/db/artworks'
import { supabase } from '@/lib/db/client'
import { Artwork, VirtualExhibition } from '@/types'

// Three runs client-only — avoid SSR
const GalleryScene = dynamic(() => import('@/components/three/GalleryScene'), { ssr: false })

export default function PublicExhibitionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [ve, setVe] = useState<VirtualExhibition | null>(null)
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const x = await getExhibitionBySlug(slug)
      if (cancelled) return
      if (!x) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setVe(x)
      const ids = x.wallArtworks.map(w => w.artworkId)
      if (ids.length) {
        const { data } = await supabase().from('artworks').select('*').in('id', ids)
        if (!cancelled && data) {
          setArtworks(
            data.map(r => rowToArtwork(r as Parameters<typeof rowToArtwork>[0])),
          )
        }
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-dvh grid place-items-center bg-black text-white">
        <p className="text-[12px] tracking-[0.2em] uppercase opacity-60">Loading exhibition…</p>
      </div>
    )
  }
  if (notFound || !ve) {
    return (
      <div className="min-h-dvh grid place-items-center bg-black text-white p-6 text-center">
        <div>
          <p className="font-display text-[24px]">Exhibition not available</p>
          <Link href="/" className="mt-6 inline-block px-3 py-2 text-[11px] tracking-[0.18em] uppercase border border-white/40">
            Back to artpiq
          </Link>
        </div>
      </div>
    )
  }

  if (!entered) {
    return (
      <div className="min-h-dvh grid place-items-center bg-black text-white p-6 text-center">
        <div className="max-w-md">
          <p className="text-[11px] tracking-[0.22em] uppercase opacity-60">Virtual exhibition</p>
          <h1 className="font-display text-[36px] tracking-tight mt-2">{ve.name}</h1>
          <p className="mt-4 text-[13px] opacity-70">
            Click Enter to lock the cursor. Use <strong>WASD</strong> or arrow keys to walk, mouse to look.
            Press <strong>Esc</strong> to release.
          </p>
          <button
            onClick={() => setEntered(true)}
            className="mt-6 px-6 py-3 bg-white text-black text-[13px] tracking-[0.18em] uppercase"
          >
            Enter exhibition
          </button>
          <Link
            href="/"
            className="block mt-3 text-[11px] tracking-[0.16em] uppercase opacity-60 hover:opacity-100"
          >
            Back
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black">
      <GalleryScene exhibition={ve} artworks={artworks} />
      <div className="absolute top-3 left-3 text-white/80 text-[11px] tracking-[0.16em] uppercase pointer-events-none">
        {ve.name} — WASD + mouse · Esc to release
      </div>
      <button
        onClick={() => setEntered(false)}
        className="absolute top-3 right-3 px-3 py-1.5 bg-white/10 text-white border border-white/30 text-[11px] tracking-[0.16em] uppercase"
      >
        Exit
      </button>
    </div>
  )
}
