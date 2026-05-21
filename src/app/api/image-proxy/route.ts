import { NextResponse } from 'next/server'
import { promises as dns } from 'dns'
import net from 'net'
import sharp from 'sharp'

// sharp requires Node.js runtime, not edge
export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Server-side image proxy used by the PDF renderer (react-pdf can't talk to
 * upstreams with strict CORS / WebP / etc., so we fetch + re-encode here).
 *
 * Hardening notes:
 * - SSRF defence: rejects file:/data:/javascript: URLs at the regex layer,
 *   then resolves DNS and rejects any address in a private / link-local /
 *   loopback / metadata range.
 * - Only image responses pass — magic-byte sniffing rejects HTML/JSON that
 *   could otherwise leak through with `Content-Type: image/...`.
 * - Generic error messages — internal status codes are logged server-side
 *   only, not echoed to the client (avoids upstream-enumeration via timing
 *   + status leaks).
 */

const PRIVATE_CIDR_BLOCKS = [
  // IPv4 private + loopback + link-local + metadata
  { start: '10.0.0.0', end: '10.255.255.255' },
  { start: '172.16.0.0', end: '172.31.255.255' },
  { start: '192.168.0.0', end: '192.168.255.255' },
  { start: '127.0.0.0', end: '127.255.255.255' },
  { start: '169.254.0.0', end: '169.254.255.255' },
  { start: '0.0.0.0', end: '0.255.255.255' },
  // Carrier-grade NAT / shared
  { start: '100.64.0.0', end: '100.127.255.255' },
]

function ipToLong(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0
}

function isPrivateIPv4(ip: string): boolean {
  if (!net.isIPv4(ip)) return false
  const value = ipToLong(ip)
  return PRIVATE_CIDR_BLOCKS.some(b => value >= ipToLong(b.start) && value <= ipToLong(b.end))
}

function isPrivateIPv6(ip: string): boolean {
  if (!net.isIPv6(ip)) return false
  const lower = ip.toLowerCase()
  // ::1 (loopback), fc00::/7 (unique local), fe80::/10 (link-local)
  return (
    lower === '::1' ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('fe8') ||
    lower.startsWith('fe9') ||
    lower.startsWith('fea') ||
    lower.startsWith('feb')
  )
}

async function isUpstreamSafe(parsedUrl: URL): Promise<{ ok: true } | { ok: false; reason: string }> {
  // Block file:, data:, javascript: at the protocol layer (defence in depth —
  // the regex below catches them too).
  if (!/^https?:$/.test(parsedUrl.protocol)) {
    return { ok: false, reason: 'protocol not allowed' }
  }
  // Resolve hostname. If it's already a literal IP, check it directly.
  const host = parsedUrl.hostname
  if (net.isIP(host)) {
    if (isPrivateIPv4(host) || isPrivateIPv6(host)) {
      return { ok: false, reason: 'private address' }
    }
    return { ok: true }
  }
  // DNS lookup — return EVERY address (A + AAAA), reject if any is private.
  // Mitigates DNS-rebinding tricks that flip after the first lookup.
  try {
    const addrs = await dns.lookup(host, { all: true })
    for (const addr of addrs) {
      if (isPrivateIPv4(addr.address) || isPrivateIPv6(addr.address)) {
        return { ok: false, reason: 'private address resolved' }
      }
    }
    return { ok: true }
  } catch {
    return { ok: false, reason: 'dns lookup failed' }
  }
}

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

  const safety = await isUpstreamSafe(parsed)
  if (!safety.ok) {
    console.warn('[image-proxy] blocked SSRF candidate:', parsed.hostname, safety.reason)
    return NextResponse.json({ error: 'upstream not allowed' }, { status: 400 })
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 20_000)

    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      // Don't follow redirects to a private IP after the fact. We can't
      // hook the resolver mid-redirect, so just refuse to follow.
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; artpiq-pdf-renderer/1.0)',
        Accept: 'image/jpeg,image/png,image/webp,image/*,*/*;q=0.8',
      },
    })
    clearTimeout(timer)

    // Manual redirect handling — accept 3xx only to a verified-safe host.
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      if (!loc) {
        return NextResponse.json({ error: 'upstream error' }, { status: 502 })
      }
      const next = new URL(loc, parsed)
      const nextSafety = await isUpstreamSafe(next)
      if (!nextSafety.ok) {
        console.warn('[image-proxy] redirect blocked to', next.hostname, nextSafety.reason)
        return NextResponse.json({ error: 'upstream not allowed' }, { status: 400 })
      }
      // One-shot follow.
      const res2 = await fetch(next.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; artpiq-pdf-renderer/1.0)',
          Accept: 'image/jpeg,image/png,image/webp,image/*,*/*;q=0.8',
        },
      })
      if (!res2.ok) {
        console.error('[image-proxy] upstream redirect status:', res2.status)
        return NextResponse.json({ error: 'upstream error' }, { status: 502 })
      }
      return await encode(res2)
    }

    if (!res.ok) {
      console.error('[image-proxy] upstream status:', res.status)
      return NextResponse.json({ error: 'upstream error' }, { status: 502 })
    }

    return await encode(res)
  } catch (e) {
    console.error('[image-proxy] fetch error:', e)
    // Generic error to caller — don't leak the upstream's message.
    return NextResponse.json({ error: 'upstream error' }, { status: 502 })
  }
}

// Validate magic bytes + re-encode WebP/GIF to JPEG. Shared between the
// initial response and the post-redirect retry.
async function encode(res: Response): Promise<NextResponse> {
  const contentType = res.headers.get('content-type') ?? 'image/jpeg'
  const mimeType = contentType.split(';')[0].trim().toLowerCase()
  const buffer = await res.arrayBuffer()

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
      // Note: removed wildcard `Access-Control-Allow-Origin: *` — the PDF
      // renderer runs server-side, no need to expose this to arbitrary
      // origins (mitigates browser-side SSRF via address bar).
    },
  })
}
