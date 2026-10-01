import { expect, test } from '@playwright/test'
import { arSourceKey } from '@/lib/ar/sourceKey'
import { MODEL_MIME, arLandingPath, arModelPath, canPlaceInAr, sceneViewerIntent } from '@/lib/ar/urls'
import type { Artwork } from '@/types'

const AW: Artwork = {
  id: 'aw 1/x', type: 'painting', title: 'T', artist: 'A', year: '2026', medium: 'Oil',
  widthCm: 92, heightCm: 73, image: 'https://x.test/a.jpg', thumb: 'https://x.test/t.jpg',
}

test.describe('arSourceKey', () => {
  test('is FNV-1a over image, width and height', () => {
    expect(arSourceKey(AW)).toBe('f855c11e')
    expect(arSourceKey({ ...AW, image: null })).toBe('483c946d')
    expect(arSourceKey({ ...AW, image: null, thumb: null })).toBe('10de0d52')
    expect(arSourceKey({ ...AW, image: 'https://x.test/15.jpg' })).toBe('0aef7f55')
  })

  test('changes with every input that changes the model', () => {
    const k = arSourceKey(AW)
    expect(arSourceKey({ ...AW, widthCm: 93 })).not.toBe(k)
    expect(arSourceKey({ ...AW, heightCm: 74 })).not.toBe(k)
    expect(arSourceKey({ ...AW, image: 'https://x.test/b.jpg' })).not.toBe(k)
  })
})

test.describe('AR urls', () => {
  test('uses the registered model MIME types', () => {
    expect(MODEL_MIME).toEqual({ glb: 'model/gltf-binary', usdz: 'model/vnd.usdz+zip' })
  })

  test('only paintings with an image and real dimensions are placeable', () => {
    expect(canPlaceInAr(AW)).toBe(true)
    expect(canPlaceInAr({ ...AW, image: null })).toBe(true)
    expect(canPlaceInAr({ ...AW, type: 'sculpture' })).toBe(false)
    expect(canPlaceInAr({ ...AW, image: null, thumb: null })).toBe(false)
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(canPlaceInAr({ ...AW, widthCm: bad })).toBe(false)
      expect(canPlaceInAr({ ...AW, heightCm: bad })).toBe(false)
    }
  })

  test('model and landing paths are content-addressed and encoded', () => {
    expect(arModelPath(AW, 'glb')).toBe('/api/ar/aw%201%2Fx/f855c11e.glb')
    expect(arModelPath(AW, 'usdz')).toBe('/api/ar/aw%201%2Fx/f855c11e.usdz')
    expect(arLandingPath(AW)).toBe('/ar/aw%201%2Fx')
  })

  test('builds the documented Scene Viewer intent', () => {
    const url = sceneViewerIntent({ glbUrl: 'https://a.test/m.glb', fallbackUrl: 'https://a.test/ar/x?noar=1', title: 'x'.repeat(70) })
    expect(url).toBe(
      'intent://arvr.google.com/scene-viewer/1.0?file=https%3A%2F%2Fa.test%2Fm.glb&mode=ar_preferred'
      + `&enable_vertical_placement=true&resizable=false&title=${'x'.repeat(60)}`
      + '#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;'
      + 'S.browser_fallback_url=https%3A%2F%2Fa.test%2Far%2Fx%3Fnoar%3D1;end;',
    )
  })
})
