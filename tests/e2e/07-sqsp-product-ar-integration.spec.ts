// Real loader, resolve, landing and model route behind a stand-in Squarespace product page.
import { devices, expect, test, type Page } from '@playwright/test'

const SITE = 'http://fake-gallery.test'
const OWNER = process.env.ARTPIQ_TEST_OWNER_ID
const SKU = process.env.ARTPIQ_TEST_SKU
const TITLE = process.env.ARTPIQ_TEST_SKU_TITLE ?? ''
// 2x2 grey PNG standing in for a photo of a wall.
const WALL_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGOcOXMmAxJgYkABOLkMDAwATwAB2y6nDQAAAABJRU5ErkJggg==', 'base64')

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

test('desktop: product button offers a phone hand-off or a photo of your wall, for this artwork only', async ({ page, baseURL }) => {
  test.setTimeout(90_000)
  await openProductPage(page, baseURL!)
  const button = page.getByRole('button', { name: 'View on your wall' })
  await expect(button).toBeVisible({ timeout: 20_000 })
  await button.click()
  const frame = page.frameLocator('artpiq-widget iframe')
  await expect(frame.getByText(/scan to view in ar/i)).toBeVisible({ timeout: 30_000 })
  const hostClose = page.locator('artpiq-widget').getByRole('button', { name: 'Close', exact: true })
  await expect(hostClose).toBeVisible()

  const photo = frame.getByRole('button', { name: 'Use a photo of your wall' })
  await expect(photo).toBeVisible()
  await photo.click()
  await expect(frame.getByText('Step one')).toBeVisible({ timeout: 20_000 })
  // My Wall's own close is on screen, so the host's overlapping one steps aside.
  await expect(hostClose).toBeHidden()
  await frame.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(frame.getByText(/scan to view in ar/i)).toBeVisible()
  await expect(hostClose).toBeVisible()
})

// iPhone viewport, touch and UA on Chromium; WebKit's own engine is not needed to check the hand-off.
const { defaultBrowserType: _engine, ...iPhone } = devices['iPhone 13']

test.describe('phone', () => {
  test.use(iPhone)

  test('product button lands on a camera-or-photo choice for this artwork', async ({ page, baseURL, request }) => {
    test.setTimeout(120_000)
    await openProductPage(page, baseURL!)
    const button = page.getByRole('button', { name: 'View on your wall' })
    await expect(button).toBeVisible({ timeout: 20_000 })
    await button.click()
    await expect(page).toHaveURL(new RegExp(`^${baseURL}/ar/`), { timeout: 20_000 })

    const camera = page.getByRole('link', { name: 'Use your camera' })
    await expect(camera).toBeVisible({ timeout: 20_000 })
    const href = await camera.getAttribute('href')
    expect(href).toMatch(/\.usdz$/)
    const model = await request.get(href!, { timeout: 90_000 })
    expect(model.status()).toBe(200)
    expect(model.headers()['content-type']).toBe('model/vnd.usdz+zip')
    expect((await model.body()).subarray(0, 2).toString('latin1')).toBe('PK')

    const photo = page.getByRole('button', { name: 'Use a photo of your wall' })
    await expect(photo).toBeVisible()
    await photo.click()
    await expect(page.getByText('Step one')).toBeVisible({ timeout: 20_000 })
    const chooser = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /Choose from library/ }).click()
    await (await chooser).setFiles({ name: 'wall.png', mimeType: 'image/png', buffer: WALL_PNG })
    // Only this artwork is placed and offered.
    await expect(page.getByRole('img', { name: TITLE }).first()).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: /Add artwork/ }).click()
    const picker = page.getByRole('heading', { name: 'Add a painting' })
    await expect(picker).toBeVisible()
    await expect(picker.locator('xpath=ancestor::div[contains(@class,"max-w-content")][1]').locator('.grid > button')).toHaveCount(1)
  })
})
