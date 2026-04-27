import { NextResponse } from 'next/server'
import { ARTWORKS } from '@/lib/artworks'
import { buildGalleryGLB, buildGalleryUSDZ } from '@/lib/ar/server'

export const runtime = 'nodejs'
export const revalidate = 3600
export const maxDuration = 60

export async function GET(req: Request) {
  const url = new URL(req.url)
  const idsParam = url.searchParams.get('ids') || ''
  const format = (url.searchParams.get('format') || 'glb').toLowerCase()

  const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean)
  if (ids.length === 0) return new NextResponse('Missing ids', { status: 400 })
  if (ids.length > 6)  return new NextResponse('Max 6 artworks', { status: 400 })

  const artworks = ids
    .map(id => ARTWORKS.find(a => a.id === id && a.type === 'painting'))
    .filter((a): a is NonNullable<typeof a> => !!a)

  if (artworks.length === 0) return new NextResponse('No valid paintings', { status: 404 })

  try {
    if (format === 'usdz') {
      const buf = await buildGalleryUSDZ(artworks)
      return new NextResponse(buf, {
        status: 200,
        headers: {
          'Content-Type': 'model/vnd.usdz+zip',
          'Content-Disposition': 'inline; filename="gallery.usdz"',
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
      })
    }
    const buf = await buildGalleryGLB(artworks)
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'model/gltf-binary',
        'Content-Disposition': 'inline; filename="gallery.glb"',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    })
  } catch (err) {
    console.error('[ar/gallery] build failed', err)
    return new NextResponse(
      `AR build failed: ${err instanceof Error ? err.message : 'unknown'}`,
      { status: 500 },
    )
  }
}
