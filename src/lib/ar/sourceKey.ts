import type { Artwork } from '@/types'

export type ArSource = Pick<Artwork, 'image' | 'thumb' | 'widthCm' | 'heightCm'>

// Cache-busting key over the inputs that change the generated model.
// FNV-1a 32-bit: sync, isomorphic, not security-relevant.
export function arSourceKey(aw: ArSource): string {
  const s = `${aw.image ?? aw.thumb ?? ''}|${aw.widthCm}|${aw.heightCm}`
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}
