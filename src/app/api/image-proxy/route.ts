import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { fetchWithValidatedRedirects, readResponseBodyLimited } from '@/lib/network/safeFetch'
import { isUpstreamSafe } from '@/lib/network/ssrf'

// sharp requires Node.js runtime, not edge
export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_IMAGE_BYTES = 15 * 1024 * 1024
const FETCH_TIMEOUT_MS = 20_000

// Fetch + re-encode for the PDF renderer. Errors stay generic so upstream
// status codes are only logged, never echoed.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'url required' }, { status: 400 })
  }

  // Only allow http(s) URLs — block file:// data: javascript: etc.
  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 })
  }

  let blocked = false
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetchWithValidatedRedirects(
      parsed,
      async candidate => {
        const safety = await isUpstreamSafe(candidate)
        if (!safety.ok) {
          blocked = true
          console.warn('[image-proxy] blocked SSRF candidate:', candidate.hostname, safety.reason)
        }
        return safety.ok
      },
      candidate => fetch(candidate.toString(), {
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; artpiq-pdf-renderer/1.0)',
          Accept: 'image/jpeg,image/png,image/webp,image/*,*/*;q=0.8',
        },
      }),
      1,
    )
    clearTimeout(timer)

    if (!res.ok) {
      console.error('[image-proxy] upstream status:', res.status)
      return NextResponse.json({ error: 'upstream error' }, { status: 502 })
    }

    return await encode(res)
  } catch (e) {
    if (blocked) return NextResponse.json({ error: 'upstream not allowed' }, { status: 400 })
    console.error('[image-proxy] fetch error:', e)
    return NextResponse.json({ error: 'upstream error' }, { status: 502 })
  } finally {
    clearTimeout(timer)
  }
}

// Validate magic bytes + re-encode WebP/GIF to JPEG.
async function encode(res: Response): Promise<NextResponse> {
  const contentType = res.headers.get('content-type') ?? 'image/jpeg'
  const mimeType = contentType.split(';')[0].trim().toLowerCase()
  let buffer: ArrayBuffer
  try {
    buffer = await readResponseBodyLimited(res, MAX_IMAGE_BYTES)
  } catch (error) {
    console.warn('[image-proxy] rejected oversized image', error)
    return NextResponse.json({ error: 'upstream image too large' }, { status: 413 })
  }

  const bytes = new Uint8Array(buffer.slice(0, 12))
  const isJpeg = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47
  const isWebp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  const isGif = bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46

  if (!isJpeg && !isPng && !isWebp && !isGif) {
    console.error('[image-proxy] not a valid image, ct=', mimeType, 'size=', buffer.byteLength)
    return NextResponse.json({ error: 'upstream returned non-image content' }, { status: 415 })
  }

  let outputBuffer: Buffer
  let outputMime: string
  if (isJpeg) {
    outputBuffer = Buffer.from(buffer)
    outputMime = 'image/jpeg'
  } else if (isPng) {
    outputBuffer = Buffer.from(buffer)
    outputMime = 'image/png'
  } else {
    try {
      outputBuffer = await sharp(Buffer.from(buffer))
        .jpeg({ quality: 85 })
        .toBuffer()
      outputMime = 'image/jpeg'
    } catch (e) {
      console.error('[image-proxy] sharp conversion failed:', e)
      return NextResponse.json({ error: 'image conversion failed' }, { status: 500 })
    }
  }

  return new NextResponse(new Uint8Array(outputBuffer), {
    headers: {
      'Content-Type': outputMime,
      'Cache-Control': 'public, max-age=86400',
      // No wildcard CORS: the PDF renderer runs server-side.
    },
  })
}
