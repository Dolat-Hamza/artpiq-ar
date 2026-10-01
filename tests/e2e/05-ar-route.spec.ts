import { expect, test } from '@playwright/test'
import { ARTWORKS } from '@/lib/artworks'
import { arModelPath, MODEL_MIME } from '@/lib/ar/urls'

const starry = ARTWORKS.find(a => a.id === 'starry-night')!
const IMMUTABLE = 'public, max-age=31536000, immutable'

test.describe('AR model route', () => {
  // Cold builds fetch and re-encode the source image.
  test.setTimeout(120_000)

  test('serves GLB with immutable caching', async ({ request }) => {
    const res = await request.get(arModelPath(starry, 'glb'))
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toBe(MODEL_MIME.glb)
    expect(res.headers()['cache-control']).toBe(IMMUTABLE)
    expect(Buffer.from(await res.body()).toString('ascii', 0, 4)).toBe('glTF')
  })

  test('serves USDZ with immutable caching', async ({ request }) => {
    const res = await request.get(arModelPath(starry, 'usdz'))
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toBe(MODEL_MIME.usdz)
    expect(res.headers()['cache-control']).toBe(IMMUTABLE)
    expect(Buffer.from(await res.body()).toString('ascii', 0, 2)).toBe('PK')
  })

  test('stale key is 404', async ({ request }) => {
    const res = await request.get(arModelPath({ ...starry, widthCm: starry.widthCm + 1 }, 'glb'))
    expect(res.status()).toBe(404)
    // Route body, not the framework's HTML not-found page.
    expect(await res.text()).toBe('Not found')
  })

  test('unsupported extension is 400', async ({ request }) => {
    const res = await request.get('/api/ar/starry-night/foo.obj')
    expect(res.status()).toBe(400)
  })

  test('sculpture is not placeable', async ({ request }) => {
    const bronze = ARTWORKS.find(a => a.id === 'bronze-helix')!
    const res = await request.get(arModelPath(bronze, 'glb'))
    expect(res.status()).toBe(404)
    expect(await res.text()).toBe('Not found')
  })
})
