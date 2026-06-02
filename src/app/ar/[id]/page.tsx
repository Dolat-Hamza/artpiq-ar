// QR-scan landing for a single artwork. The flow Thomas wants:
//   Scan QR → mobile lands here → tap → system camera AR
//     (iOS Quick Look from .usdz, Android Scene Viewer from .glb)
//
// Desktop visitors get a 3D model-viewer preview + a QR pointing back
// at this same page so they can carry on with their phone.
//
// Anon users can hit this route. Artworks are loaded via the public
// SELECT policy on `artworks` (privacy='public'), and the demo fallback
// `ARTWORKS` array covers the canonical Wikimedia pieces shipped with
// the app. Private artworks won't load — owners must flip privacy to
// public before generating a QR.

import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { supabase } from '@/lib/db/client'
import { rowToArtwork } from '@/lib/db/artworks'
import { ARTWORKS } from '@/lib/artworks'
import type { Artwork } from '@/types'
import ArQuickLaunch from '@/components/ArQuickLaunch'

interface SP {
  params: Promise<{ id: string }>
}

async function loadArtwork(id: string): Promise<Artwork | null> {
  // Demo IDs first — instantly available, no DB round-trip
  const demo = ARTWORKS.find(a => a.id === id)
  if (demo) return demo

  try {
    const { data, error } = await supabase()
      .from('artworks')
      .select('*')
      .eq('id', id)
      .eq('privacy', 'public')
      .maybeSingle()
    if (error) return null
    if (!data) return null
    return rowToArtwork(data)
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: SP) {
  const { id } = await params
  const aw = await loadArtwork(id)
  if (!aw) return { title: 'Artwork · ARTPIQ AR' }
  return {
    title: `${aw.title} — view in AR`,
    description: `Place ${aw.title} by ${aw.artist} on your wall using your phone camera.`,
    openGraph: {
      title: aw.title,
      description: `Place this on your wall in AR. ${aw.widthCm} × ${aw.heightCm} cm.`,
      images: aw.image ? [aw.image] : undefined,
    },
  }
}

export default async function Page({ params }: SP) {
  const { id } = await params
  const aw = await loadArtwork(id)
  if (!aw) notFound()
  // Build absolute origin for QR + Scene Viewer fallback URLs (they require
  // absolute https://). headers() gives us the public host the request came in
  // on — keeps preview deploys + custom domains working without env vars.
  const h = await headers()
  const proto = h.get('x-forwarded-proto') ?? 'https'
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'artpiq.ai'
  const origin = `${proto}://${host}`
  return <ArQuickLaunch artwork={aw} origin={origin} />
}
