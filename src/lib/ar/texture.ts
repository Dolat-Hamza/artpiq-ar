import 'server-only'
import sharp from 'sharp'
import { fetchWithValidatedRedirects, readResponseBodyLimited } from '@/lib/network/safeFetch'
import { isUpstreamSafe } from '@/lib/network/ssrf'

const MAX_SOURCE_BYTES = 25 * 1024 * 1024
const FETCH_TIMEOUT_MS = 15_000
const MAX_TEXTURE_PX = 2048

// Image URLs are owner-supplied, so the fetch needs the SSRF guard, timeout and byte cap.
async function fetchImageBytes(url: string): Promise<Uint8Array> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('Invalid image URL')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetchWithValidatedRedirects(
      parsed,
      async candidate => {
        const safety = await isUpstreamSafe(candidate)
        if (!safety.ok) console.warn('[ar/texture] blocked image URL:', candidate.hostname, safety.reason)
        return safety.ok
      },
      candidate => fetch(candidate.toString(), {
        signal: controller.signal,
        redirect: 'manual',
        headers: { 'User-Agent': 'artpiq-ar/1.0 (https://artpiq.art)' },
      }),
    )
    if (!res.ok) throw new Error(`Image fetch failed: ${res.status} ${url}`)
    return new Uint8Array(await readResponseBodyLimited(res, MAX_SOURCE_BYTES))
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchTexture(url: string): Promise<Uint8Array> {
  const src = await fetchImageBytes(url)
  const jpeg = await sharp(src)
    .rotate()
    .resize({ width: MAX_TEXTURE_PX, height: MAX_TEXTURE_PX, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer()
  return new Uint8Array(jpeg)
}
