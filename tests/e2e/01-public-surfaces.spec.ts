import { expect, test } from '@playwright/test'

// These tests target public surfaces only — no login required. They run on
// every preview / production deploy and catch the most embarrassing kinds of
// regressions: landing-page 500s, broken sign-in screen, embed script
// missing from /public, /api/subscribe contract drift.

test.describe('public surfaces', () => {
  test('landing page renders', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status(), 'landing page status').toBeLessThan(400)
    // The marketing landing has the ArtPiq wordmark / hero — check the
    // <title> attribute as the loosest stable signal.
    await expect(page).toHaveTitle(/artpiq/i)
  })

  test('admin route redirects unauth users to the sign-in surface', async ({ page }) => {
    const response = await page.goto('/admin')
    expect(response?.status(), 'admin page status').toBeLessThan(500)
    // Either client-redirects to /login, or renders the LoginForm in-page.
    // Either is acceptable — both code paths show the magic-link email field.
    await expect(page.getByPlaceholder(/email/i).or(page.getByText(/sign in/i))).toBeVisible()
  })

  test('newsletter embed script is served with the right shape', async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/embed/newsletter.js`)
    expect(res.status()).toBe(200)
    const contentType = res.headers()['content-type'] || ''
    expect(contentType).toMatch(/javascript|application\/javascript/)
    const body = await res.text()
    // Smoke checks — make sure the script is the embed (not an error page)
    // and still posts to /api/subscribe.
    expect(body).toContain('artpiq-newsletter-embed')
    expect(body).toContain('/api/subscribe')
    expect(body).toContain('data-owner')
  })

  test('subscribe endpoint rejects missing owner', async ({ request, baseURL }) => {
    const res = await request.post(`${baseURL}/api/subscribe`, {
      data: { email: 'test@example.com' },
    })
    expect(res.status()).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/owner/i)
  })

  test('subscribe endpoint preflight returns 204 with CORS headers', async ({ request, baseURL }) => {
    const res = await request.fetch(`${baseURL}/api/subscribe`, { method: 'OPTIONS' })
    expect(res.status()).toBe(204)
    expect(res.headers()['access-control-allow-origin']).toBe('*')
    expect((res.headers()['access-control-allow-methods'] || '').toUpperCase()).toContain('POST')
  })

  test('newsletter send endpoint is callable + returns a sensible error without contentId', async ({ request, baseURL }) => {
    const res = await request.post(`${baseURL}/api/newsletter/send`, {
      data: { dryRun: true },
    })
    // Either 400 (validation) or 503 (resend not configured + dry run path);
    // both are acceptable for a smoke test.
    expect([400, 503]).toContain(res.status())
  })
})
