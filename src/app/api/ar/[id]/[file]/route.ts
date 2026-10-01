import { NextResponse } from 'next/server'
import { loadPublicArtwork } from '@/lib/db/publicArtwork'
import { arSourceKey } from '@/lib/ar/sourceKey'
import { canPlaceInAr, MODEL_MIME, type ModelFormat } from '@/lib/ar/urls'
import { buildPaintingModel } from '@/lib/ar/build'

export const runtime = 'nodejs'
export const maxDuration = 30

const FILE_RE = /^([0-9a-f]{8})\.(glb|usdz)$/

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; file: string }> },
) {
  const { id, file } = await params
  const match = FILE_RE.exec(file)
  if (!match) return new NextResponse('Unsupported format', { status: 400 })
  const key = match[1]
  const format = match[2] as ModelFormat

  const aw = await loadPublicArtwork(id)
  if (!aw || !canPlaceInAr(aw)) return new NextResponse('Not found', { status: 404 })
  // Stale key means the source changed; a fresh page render will link the new one.
  if (key !== arSourceKey(aw)) return new NextResponse('Not found', { status: 404 })

  let body: Uint8Array
  try {
    body = await buildPaintingModel(aw, format)
  } catch (err) {
    console.error('[ar/model] build failed', err)
    return new NextResponse('AR model generation failed', { status: 500 })
  }

  return new NextResponse(body as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': MODEL_MIME[format],
      'Content-Disposition': `inline; filename="${aw.id.replace(/[^\w.-]/g, '_')}.${format}"`,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
