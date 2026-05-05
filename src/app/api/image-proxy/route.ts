import { NextResponse } from 'next/server'

/**
 * Proxy route: fetches an image server-side (no CORS issues) and returns
 * it as base64 so @react-pdf/renderer can embed it as a data URI.
 *
 * Usage: GET /api/image-proxy?url=https://...
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'url required' }, { status: 400 })
  }

  // Only allow http(s) URLs — block file:// data: etc.
  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 })
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 20_000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; artpiq-pdf-renderer/1.0)',
        'Accept': 'image/jpeg,image/png,image/webp,image/*,*/*;q=0.8',
        'Referer': 'https://artpiq-ar.vercel.app/',
      },
    })
    clearTimeout(timer)

    // Retry once on 429
    if (res.status === 429) {
      await new Promise(r => setTimeout(r, 1000))
      const res2 = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; artpiq-pdf-renderer/1.0)',
          'Accept': 'image/jpeg,image/png,image/webp,image/*,*/*;q=0.8',
        },
      })
      if (!res2.ok) {
        return NextResponse.json({ error: `upstream ${res2.status}` }, { status: 502 })
      }
      const ct2 = (res2.headers.get('content-type') ?? 'image/jpeg').split(';')[0].trim()
      const buf2 = await res2.arrayBuffer()
      return new NextResponse(buf2, {
        headers: { 'Content-Type': ct2, 'Cache-Control': 'public, max-age=86400', 'Access-Control-Allow-Origin': '*' },
      })
    }

    if (!res.ok) {
      console.error('[image-proxy] upstream status:', res.status)
      return NextResponse.json({ error: `upstream ${res.status}` }, { status: 502 })
    }

    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const mimeType = contentType.split(';')[0].trim().toLowerCase()
    const buffer = await res.arrayBuffer()

    // Validate: must be a real image (check magic bytes + content-type)
    const bytes = new Uint8Array(buffer.slice(0, 12))
    const isJpeg = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47
    const isWebp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    const isGif = bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46

    if (!isJpeg && !isPng && !isWebp && !isGif) {
      console.error('[image-proxy] not a valid image, ct=', mimeType, 'size=', buffer.byteLength)
      return NextResponse.json({
        error: 'upstream returned non-image content',
        contentType: mimeType,
        size: buffer.byteLength,
      }, { status: 415 })
    }

    // Override mime type from magic bytes (more reliable than upstream Content-Type)
    const realMime = isJpeg ? 'image/jpeg' : isPng ? 'image/png' : isWebp ? 'image/webp' : 'image/gif'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': realMime,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (e) {
    console.error('[image-proxy] fetch error:', e)
    return NextResponse.json({ error: String(e) }, { status: 502 })
  }
}
