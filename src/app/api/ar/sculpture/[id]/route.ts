import { NextResponse } from 'next/server'
import { ARTWORKS } from '@/lib/artworks'
import { buildSculptureGLB, buildSculptureUSDZ } from '@/lib/ar/server'

export const runtime = 'nodejs'
export const revalidate = 3600

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params
  const aw = ARTWORKS.find(a => a.id === id && a.type === 'sculpture')
  if (!aw) return new NextResponse('Not found', { status: 404 })

  const format = (new URL(req.url).searchParams.get('format') || 'glb').toLowerCase()

  try {
    if (format === 'usdz') {
      const buf = await buildSculptureUSDZ(aw)
      return new NextResponse(buf, {
        status: 200,
        headers: {
          'Content-Type': 'model/vnd.usdz+zip',
          'Content-Disposition': `inline; filename="${aw.id}.usdz"`,
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
      })
    }
    const buf = await buildSculptureGLB(aw)
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'model/gltf-binary',
        'Content-Disposition': `inline; filename="${aw.id}.glb"`,
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    })
  } catch (err) {
    console.error('[ar/sculpture] build failed', err)
    return new NextResponse(
      `AR build failed: ${err instanceof Error ? err.message : 'unknown'}`,
      { status: 500 },
    )
  }
}
