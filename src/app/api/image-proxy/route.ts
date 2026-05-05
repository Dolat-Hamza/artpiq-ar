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
    const mimeType = contentType.split(';')[0].trim()
    const buffer = await res.arrayBuffer()

    // Return raw binary — @react-pdf/renderer fetches this URL and expects image bytes
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (e) {
    console.error('[image-proxy] fetch error:', e)
    return NextResponse.json({ error: String(e) }, { status: 502 })
  }
}
