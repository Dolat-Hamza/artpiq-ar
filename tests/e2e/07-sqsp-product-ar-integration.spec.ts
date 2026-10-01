// Real loader, resolve, landing and model route behind a stand-in Squarespace product page.
import { devices, expect, test, type Page } from '@playwright/test'

const SITE = 'http://fake-gallery.test'
const OWNER = process.env.ARTPIQ_TEST_OWNER_ID
const SKU = process.env.ARTPIQ_TEST_SKU
const TITLE = process.env.ARTPIQ_TEST_SKU_TITLE ?? ''

test.use({
  launchOptions: {
    args: [
      `--unsafely-treat-insecure-origin-as-secure=${SITE}`,
      '--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests',
    ],
  },
})

test.skip(!OWNER || !SKU, 'needs ARTPIQ_TEST_OWNER_ID and ARTPIQ_TEST_SKU of a public catalogue painting')

async function openProductPage(page: Page, app: string) {
  const item = { id: 'live-item-1', title: TITLE, fullUrl: '/shop/p/artist/work' }
  await page.route(`${SITE}/shop/p/artist/work?format=json`, r => r.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ item: { ...item, tags: ['AR', 'Artist'], structuredContent: { variants: [{ sku: SKU }] } } }),
  }))
  await page.route(`${SITE}/shop/p/artist/work`, r => r.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><html><head><meta name=viewport content="width=device-width">
      <script>window.Static = { SQUARESPACE_CONTEXT: { item: ${JSON.stringify(item)}, product: {} } }</script></head>
      <body><div class="ProductItem-details"><h1>${TITLE}</h1>
      <div class="sqs-add-to-cart-button-wrapper"><button>Add to cart</button></div></div>
      <script src="${app}/embed/widget.js" data-owner="${OWNER}" data-product-ar defer></script></body></html>`,
  }))
  await page.goto(`${SITE}/shop/p/artist/work`)
}

test('desktop: product button opens the AR preview with a phone hand-off', async ({ page, baseURL }) => {
  test.setTimeout(90_000)
  await openProductPage(page, baseURL!)
  const button = page.getByRole('button', { name: 'View on your wall' })
  await expect(button).toBeVisible({ timeout: 20_000 })
  await button.click()
  const frame = page.frameLocator('artpiq-widget iframe')
  await expect(frame.getByText(/scan to view in ar/i)).toBeVisible({ timeout: 30_000 })
})

// iPhone viewport, touch and UA on Chromium; WebKit's own engine is not needed to check the hand-off.
const { defaultBrowserType: _engine, ...iPhone } = devices['iPhone 13']

test.describe('phone', () => {
  test.use(iPhone)

  test('product button lands on the AR page whose Quick Look model downloads', async ({ page, baseURL, request }) => {
    test.setTimeout(120_000)
    await openProductPage(page, baseURL!)
    const button = page.getByRole('button', { name: 'View on your wall' })
    await expect(button).toBeVisible({ timeout: 20_000 })
    await button.click()
    await expect(page).toHaveURL(new RegExp(`^${baseURL}/ar/`), { timeout: 20_000 })

    const launch = page.getByRole('link', { name: 'Place on your wall' })
    await expect(launch).toBeVisible({ timeout: 20_000 })
    const href = await launch.getAttribute('href')
    expect(href).toMatch(/\.usdz$/)
    const model = await request.get(href!, { timeout: 90_000 })
    expect(model.status()).toBe(200)
    expect(model.headers()['content-type']).toBe('model/vnd.usdz+zip')
    expect((await model.body()).subarray(0, 2).toString('latin1')).toBe('PK')
  })
})
