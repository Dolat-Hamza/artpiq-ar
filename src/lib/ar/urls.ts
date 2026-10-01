import type { Artwork } from '@/types'
import { arSourceKey } from './sourceKey'

export type ModelFormat = 'glb' | 'usdz'

export const MODEL_MIME: Record<ModelFormat, string> = {
  glb: 'model/gltf-binary',
  usdz: 'model/vnd.usdz+zip',
}

// AR is a textured quad at true size; it needs an image and real dimensions.
export function canPlaceInAr(aw: Artwork): boolean {
  return aw.type === 'painting'
    && !!(aw.image || aw.thumb)
    && Number.isFinite(aw.widthCm) && aw.widthCm > 0
    && Number.isFinite(aw.heightCm) && aw.heightCm > 0
}

// Content-addressed so the route can send immutable cache headers.
export function arModelPath(aw: Artwork, format: ModelFormat): string {
  return `/api/ar/${encodeURIComponent(aw.id)}/${arSourceKey(aw)}.${format}`
}

export function arLandingPath(aw: Pick<Artwork, 'id'>): string {
  return `/ar/${encodeURIComponent(aw.id)}`
}

// Scene Viewer intent, same shape and package as <model-viewer> uses.
// https://developers.google.com/ar/develop/scene-viewer
export function sceneViewerIntent(opts: { glbUrl: string; fallbackUrl: string; title: string }): string {
  const params = new URLSearchParams({
    file: opts.glbUrl,
    mode: 'ar_preferred',
    enable_vertical_placement: 'true',
    resizable: 'false',
    title: opts.title.slice(0, 60),
  })
  return `intent://arvr.google.com/scene-viewer/1.0?${params}`
    + '#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;'
    + `S.browser_fallback_url=${encodeURIComponent(opts.fallbackUrl)};end;`
}
