import { expect, test } from '@playwright/test'

// Viewing-room is the most-customer-facing page in the app. If it 500s the
// gallery has no way to share a collection. These tests use a known-public
// viewing room slug supplied via env; skipped if not set.

const slug = process.env.ARTPIQ_TEST_VIEWING_ROOM_SLUG

test.describe('viewing room (public)', () => {
  test.skip(!slug, 'Set ARTPIQ_TEST_VIEWING_ROOM_SLUG to a public viewing-room slug to enable.')

  test('public viewing room renders', async ({ page }) => {
    const res = await page.goto(`/v/${slug}`)
    expect(res?.status()).toBeLessThan(400)
    // Either renders an artwork grid or a "no artworks" empty state — both
    // are valid responses for a public link. What we don't want is a 500.
    await expect(page.locator('body')).not.toContainText('Application error')
    await expect(page.locator('body')).not.toContainText('500')
  })
})

test.describe('embed routes (Squarespace-pasteable)', () => {
  test('viewing-room embed has permissive frame headers', async ({ request, baseURL }) => {
    // Hit any /embed/* route — we just need the headers, not a real slug.
    const res = await request.get(`${baseURL}/embed/view`)
    const xfo = (res.headers()['x-frame-options'] || '').toUpperCase()
    const csp = res.headers()['content-security-policy'] || ''
    // Either ALLOWALL or no XFO at all (CSP overrides), with frame-ancestors
    // *. The next.config.ts entry sets both.
    const allowsAnyFrame = xfo === 'ALLOWALL' || xfo === '' || csp.includes('frame-ancestors *')
    expect(allowsAnyFrame, `frame headers should allow embedding (X-Frame: "${xfo}", CSP: "${csp}")`).toBe(true)
  })
})
