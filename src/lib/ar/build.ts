import 'server-only'
import type { Artwork } from '@/types'
import type { ModelFormat } from './urls'
import { fetchTexture } from './texture'
import { buildPaintingUsdz } from './usdz'
import { buildPaintingGlb } from './glb'

async function loadJpeg(aw: Artwork): Promise<Uint8Array> {
  const primary = aw.image ?? aw.thumb
  if (!primary) throw new Error(`Artwork ${aw.id} has no image`)
  try {
    return await fetchTexture(primary)
  } catch (err) {
    if (!aw.thumb || aw.thumb === primary) throw err
    console.warn('[ar/build] image fetch failed, using thumb', err)
    return fetchTexture(aw.thumb)
  }
}

export async function buildPaintingModel(aw: Artwork, format: ModelFormat): Promise<Uint8Array> {
  const jpeg = await loadJpeg(aw)
  const input = { widthM: aw.widthCm / 100, heightM: aw.heightCm / 100, jpeg }
  return format === 'usdz' ? buildPaintingUsdz(input) : buildPaintingGlb(input)
}
