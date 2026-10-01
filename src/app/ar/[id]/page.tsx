// Public AR landing for one artwork: phones get a one-tap launch into
// Quick Look / Scene Viewer, desktops a 3D preview plus a QR hand-off.
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { loadPublicArtwork } from '@/lib/db/publicArtwork'
import ArLanding from '@/components/organisms/ArLanding'

interface SP {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ params }: Pick<SP, 'params'>) {
  const { id } = await params
  const aw = await loadPublicArtwork(id)
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

export default async function Page({ params, searchParams }: SP) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const aw = await loadPublicArtwork(id)
  if (!aw) notFound()
  const h = await headers()
  const proto = h.get('x-forwarded-proto') ?? 'https'
  const host = h.get('host') ?? 'artpiq.ai'
  return <ArLanding artwork={aw} origin={`${proto}://${host}`} noAr={sp.noar === '1'} />
}
