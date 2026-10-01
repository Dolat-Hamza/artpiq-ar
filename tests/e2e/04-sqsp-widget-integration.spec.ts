// Real loader + real embed page + real catalogue, on a stand-in Squarespace origin.
import { expect, test } from '@playwright/test'

const SITE = 'http://fake-gallery.test'
const OWNER = process.env.ARTPIQ_TEST_OWNER_ID

test.use({
  launchOptions: {
    args: [
      `--unsafely-treat-insecure-origin-as-secure=${SITE}`,
      '--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests',
    ],
  },
})

test.skip(!OWNER, 'needs ARTPIQ_TEST_OWNER_ID with public paintings')

test('Visualise in your home opens the gallery catalogue in My Wall and closes back to the shop', async ({ page, baseURL }) => {
  test.setTimeout(90_000)
  await page.route(`${SITE}/**`, r => r.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><html><body style="height:3000px">
      <script src="${baseURL}/embed/widget.js" defer></script>
      <artpiq-widget owner="${OWNER}" type="my-wall" text="Visualise In Your Home"></artpiq-widget>
    </body></html>`,
  }))
  await page.goto(`${SITE}/events-collaborations/mirror`)

  const button = page.getByRole('button', { name: 'Visualise In Your Home' })
  await expect(button).toBeVisible({ timeout: 15_000 })
  await button.click()
  const frame = page.frameLocator('artpiq-widget iframe')
  await expect(frame.getByText('Step one')).toBeVisible({ timeout: 30_000 })
  // My Wall has its own close, so the host's overlapping one goes away.
  await expect(page.locator('artpiq-widget').getByRole('button', { name: 'Close', exact: true })).toBeHidden()

  await frame.getByRole('button', { name: 'Close' }).first().click()
  await expect(page.locator('artpiq-widget dialog')).not.toHaveAttribute('open', /.*/)

  // Reopening lands back in My Wall, not on a grid without a way out.
  await button.click()
  await expect(frame.getByText('Step one')).toBeVisible()
  await expect(page.locator('artpiq-widget').getByRole('button', { name: 'Close', exact: true })).toBeHidden()
})

test('Escape inside the widget closes it back to the shop', async ({ page, baseURL }) => {
  test.setTimeout(90_000)
  await page.route(`${SITE}/**`, r => r.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><html><body>
      <script src="${baseURL}/embed/widget.js" defer></script>
      <artpiq-widget owner="${OWNER}" type="my-wall"></artpiq-widget>
    </body></html>`,
  }))
  await page.goto(`${SITE}/`)
  const button = page.getByRole('button', { name: 'Visualise in your home' })
  await expect(button).toBeVisible({ timeout: 15_000 })
  await button.click()
  const frame = page.frameLocator('artpiq-widget iframe')
  await expect(frame.getByText('Step one')).toBeVisible({ timeout: 30_000 })

  // Focus is inside the cross-origin frame, so the host dialog never sees this key.
  await frame.getByText('Step one').click()
  await page.keyboard.press('Escape')
  await expect(page.locator('artpiq-widget dialog')).not.toHaveAttribute('open', /.*/)
})
