import { NextResponse } from 'next/server'
import { ARTWORKS } from '@/lib/artworks'
import { buildGalleryGLBServer, buildGalleryUSDZServer } from '@/lib/ar/server'

export const runtime = 'nodejs'
export const revalidate = 3600

export async function GET(req: Request) {
  const url = new URL(req.url)
  const idsParam = url.searchParams.get('ids') || ''
  const format = (url.searchParams.get('format') || 'glb').toLowerCase()

  const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean)
  if (!ids.length) return new NextResponse('Missing ids', { status: 400 })

  const artworks = ids
    .map(id => ARTWORKS.find(a => a.id === id))
    .filter((a): a is (typeof ARTWORKS)[number] => !!a)

  if (!artworks.length) return new NextResponse('No matching artworks', { status: 404 })

  const filename = `gallery-${ids.join('-')}`.slice(0, 80)

  try {
    if (format === 'usdz') {
      const buf = await buildGalleryUSDZServer(artworks)
      return new NextResponse(buf, {
        status: 200,
        headers: {
          'Content-Type': 'model/vnd.usdz+zip',
          'Content-Disposition': `inline; filename="${filename}.usdz"`,
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
      })
    }
    const buf = await buildGalleryGLBServer(artworks)
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'model/gltf-binary',
        'Content-Disposition': `inline; filename="${filename}.glb"`,
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
