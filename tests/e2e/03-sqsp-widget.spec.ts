import { expect, test, type Locator, type Page } from '@playwright/test'

// Loader contract for public/embed/widget.js, exercised from a fake
// third-party origin the way a Squarespace Code Block would host it.

const HOST = 'http://fake-gallery.test'
const OWNER = '11111111-2222-4333-8444-555555555555'
const COLL_A = 'aaaaaaaa-0000-4000-8000-000000000001'
const COLL_B = 'aaaaaaaa-0000-4000-8000-000000000002'

// A public origin loading localhost is blocked by Chrome's private-network rules otherwise.
test.use({
  launchOptions: {
    args: [
      `--unsafely-treat-insecure-origin-as-secure=${HOST}`,
      '--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests',
    ],
  },
})

const STUB_EMBED = `<!doctype html><title>stub</title>
<button onclick="parent.postMessage({ type: 'artpiq:close' }, '*')">Close from embed</button>
<button onclick="parent.postMessage({ type: 'artpiq:own-close', value: true }, '*')">Announce own close</button>
<button onclick="parent.postMessage({ type: 'artpiq:own-close', value: false }, '*')">Withdraw own close</button>`

async function openHostPage(page: Page, app: string, body: string, opts: { htmlStyle?: string } = {}) {
  const script = `<script src="${app}/embed/widget.js" defer></script>`
  const html = `<!doctype html><html style="${opts.htmlStyle ?? ''}"><head><title>Gallery</title></head>
<body><main><div class="sqs-block code-block">${body.replaceAll('%SCRIPT%', script)}</div></main></body></html>`
  await page.route(`${HOST}/**`, r => r.fulfill({ contentType: 'text/html', body: html }))
  // The real embed page is integration-tested elsewhere; only the iframe target is stubbed.
  await page.route(new RegExp(`^${app.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}/embed/(?!widget\\.js)`), r =>
    r.fulfill({ contentType: 'text/html', body: STUB_EMBED }),
  )
  await page.goto(`${HOST}/`)
}

const appOrigin = (baseURL: string | undefined) => new URL(baseURL ?? 'http://localhost:3005').origin

// Resolves with the origin of the next top-window message, after the widget's listener ran.
async function armMessageProbe(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __probe: Promise<string> }
    w.__probe = new Promise(r => window.addEventListener('message', e => r(e.origin), { once: true }))
  })
}
const messageProbe = (page: Page) => page.evaluate(() => (window as unknown as { __probe: Promise<string> }).__probe)

async function iframeUrl(widget: Locator): Promise<URL> {
  const src = await widget.locator('iframe').getAttribute('src')
  expect(src, 'iframe src').toBeTruthy()
  return new URL(src as string)
}

// Asserting visibility first keeps a missing widget a failed expectation, not a click timeout.
async function openDialog(widget: Locator, name: string) {
  const button = widget.getByRole('button', { name, exact: true })
  await expect(button).toBeVisible()
  await button.click()
  await expect(widget.getByRole('dialog')).toBeVisible()
}

test.describe('Squarespace widget loader (embed/widget.js)', () => {
  test('renders a button with the text label and validated colours', async ({ page, baseURL }) => {
    await openHostPage(
      page,
      appOrigin(baseURL),
      `%SCRIPT%
      <artpiq-widget id="custom" owner="${OWNER}" text="Visualise In Your Home" bgcolor="#ed1c78" fontcolor="#000"></artpiq-widget>
      <artpiq-widget id="plain" owner="${OWNER}"></artpiq-widget>
      <artpiq-widget id="bad" owner="${OWNER}" bgcolor="red" fontcolor="url(x)"></artpiq-widget>`,
    )

    const custom = page.locator('#custom').getByRole('button')
    await expect(custom).toHaveText('Visualise In Your Home')
    await expect(custom).toHaveCSS('background-color', 'rgb(237, 28, 120)')
    await expect(custom).toHaveCSS('color', 'rgb(0, 0, 0)')

    for (const id of ['#plain', '#bad']) {
      const btn = page.locator(id).getByRole('button')
      await expect(btn).toHaveText('Visualise in your home')
      await expect(btn).toHaveCSS('background-color', 'rgb(20, 18, 16)')
      await expect(btn).toHaveCSS('color', 'rgb(255, 255, 255)')
    }
  })

  test('click opens a modal dialog with an iframe pointing at the embed mode', async ({ page, baseURL }) => {
    const app = appOrigin(baseURL)
    await openHostPage(
      page,
      app,
      `%SCRIPT%
      <artpiq-widget id="wall" owner="${OWNER}" collection="${COLL_A},${COLL_B}" artwork="" text="See it"></artpiq-widget>
      <artpiq-widget id="room" owner="${OWNER}" type="sample-room" artwork="art-1"></artpiq-widget>
      <artpiq-widget id="unknown" owner="${OWNER}" type="view"></artpiq-widget>`,
    )

    const wall = page.locator('#wall')
    await openDialog(wall, 'See it')
    const dialog = wall.getByRole('dialog')
    expect(await dialog.evaluate(d => d.matches(':modal'))).toBe(true)

    const iframe = wall.locator('iframe')
    await expect(iframe).toHaveAttribute('allow', 'camera; fullscreen; xr-spatial-tracking')
    await expect(iframe).toHaveAttribute('title', 'See it')
    expect(await iframe.getAttribute('loading')).not.toBe('lazy')

    const wallUrl = await iframeUrl(wall)
    expect(wallUrl.origin).toBe(app)
    expect(wallUrl.pathname).toBe('/embed/my-wall')
    expect([...wallUrl.searchParams.keys()]).toEqual(['owner', 'collection'])
    expect(wallUrl.searchParams.get('owner')).toBe(OWNER)
    expect(wallUrl.searchParams.get('collection')).toBe(`${COLL_A},${COLL_B}`)
    await wall.getByRole('button', { name: 'Close' }).click()
    await expect(dialog).toBeHidden()

    const room = page.locator('#room')
    await openDialog(room, 'Visualise in your home')
    const roomUrl = await iframeUrl(room)
    expect(roomUrl.pathname).toBe('/embed/sample-room')
    expect([...roomUrl.searchParams.keys()]).toEqual(['owner', 'artwork'])
    expect(roomUrl.searchParams.get('artwork')).toBe('art-1')
    await room.getByRole('button', { name: 'Close' }).click()

    const unknown = page.locator('#unknown')
    await openDialog(unknown, 'Visualise in your home')
    expect((await iframeUrl(unknown)).pathname).toBe('/embed/my-wall')
  })

  test('locks host page scroll while open and restores it on close', async ({ page, baseURL }) => {
    await openHostPage(page, appOrigin(baseURL), `%SCRIPT%<artpiq-widget owner="${OWNER}"></artpiq-widget>`, {
      htmlStyle: 'overflow: auto',
    })
    const htmlOverflow = () => page.evaluate(() => document.documentElement.style.overflow)
    const widget = page.locator('artpiq-widget')

    await openDialog(widget, 'Visualise in your home')
    await expect.poll(htmlOverflow).toBe('hidden')

    await widget.getByRole('button', { name: 'Close' }).click()
    await expect(widget.getByRole('dialog')).toBeHidden()
    await expect.poll(htmlOverflow).toBe('auto')
  })

  test('closes via button, Escape and embed postMessage, but not foreign messages', async ({ page, baseURL }) => {
    await openHostPage(page, appOrigin(baseURL), `%SCRIPT%<artpiq-widget owner="${OWNER}"></artpiq-widget>`)
    const widget = page.locator('artpiq-widget')
    const dialog = widget.getByRole('dialog')
    const open = () => openDialog(widget, 'Visualise in your home')
    const embed = widget.locator('iframe').contentFrame()

    await open()
    await widget.getByRole('button', { name: 'Close' }).click()
    await expect(dialog).toBeHidden()

    await open()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()

    await open()
    // Resolves after the widget's own listener has seen the same message.
    await page.evaluate(
      () =>
        new Promise<void>(resolve => {
          window.addEventListener('message', () => resolve(), { once: true })
          window.postMessage({ type: 'artpiq:close' }, '*')
        }),
    )
    await expect(dialog).toBeVisible()

    await embed.getByRole('button', { name: 'Close from embed' }).click()
    await expect(dialog).toBeHidden()

    // Iframe survives close: a marker set in its window is still there on reopen.
    await embed.locator('body').evaluate(() => ((window as unknown as { __kept: boolean }).__kept = true))
    await open()
    await expect(widget.locator('iframe')).toHaveCount(1)
    expect(await embed.locator('body').evaluate(() => (window as unknown as { __kept?: boolean }).__kept)).toBe(true)

    // Same iframe window, foreign origin after navigation: must not close.
    await page.route('http://evil.test/**', r => r.fulfill({ contentType: 'text/html', body: STUB_EMBED }))
    await embed.locator('body').evaluate(() => (location.href = 'http://evil.test/'))
    await armMessageProbe(page)
    await embed.getByRole('button', { name: 'Close from embed' }).click()
    expect(await messageProbe(page)).toBe('http://evil.test')
    await expect(dialog).toBeVisible()
  })

  test('snippet pasted twice defines the element once and both widgets work', async ({ page, baseURL }) => {
    const app = appOrigin(baseURL)
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await openHostPage(
      page,
      app,
      `%SCRIPT%<artpiq-widget id="one" owner="${OWNER}" text="One"></artpiq-widget>
      <p>Some copy between blocks</p>
      %SCRIPT%<artpiq-widget id="two" owner="${OWNER}" text="Two"></artpiq-widget>`,
    )

    await expect(page.locator('artpiq-widget').getByRole('button', { name: /^(One|Two)$/ })).toHaveCount(2)
    for (const [id, label] of [['#one', 'One'], ['#two', 'Two']]) {
      const widget = page.locator(id)
      await openDialog(widget, label)
      await widget.getByRole('button', { name: 'Close' }).click()
      await expect(widget.getByRole('dialog')).toBeHidden()
    }

    // A close request from the other widget's iframe must not close this one.
    await openDialog(page.locator('#one'), 'One')
    await armMessageProbe(page)
    await page
      .locator('#two iframe')
      .contentFrame()
      .locator('body')
      .evaluate(() => parent.postMessage({ type: 'artpiq:close' }, '*'))
    expect(await messageProbe(page)).toBe(app)
    await expect(page.locator('#one').getByRole('dialog')).toBeVisible()
    expect(errors).toEqual([])
  })

  test('element inserted after load (AJAX navigation) renders its button', async ({ page, baseURL }) => {
    await openHostPage(page, appOrigin(baseURL), `%SCRIPT%<artpiq-widget owner="${OWNER}" text="First"></artpiq-widget>`)
    await expect(page.getByRole('button', { name: 'First' })).toBeVisible()

    await page.evaluate(owner => {
      document.body.insertAdjacentHTML('beforeend', `<artpiq-widget owner="${owner}" text="Later"></artpiq-widget>`)
    }, OWNER)
    await expect(page.getByRole('button', { name: 'Later' })).toBeVisible()
  })

  test('missing owner renders nothing and warns', async ({ page, baseURL }) => {
    const warnings: string[] = []
    page.on('console', m => {
      if (m.type() === 'warning') warnings.push(m.text())
    })
    await openHostPage(
      page,
      appOrigin(baseURL),
      `%SCRIPT%<artpiq-widget id="ownerless" text="Nope"></artpiq-widget>
      <artpiq-widget id="ok" owner="${OWNER}" text="Yes"></artpiq-widget>`,
    )

    // The sibling proves the script ran before asserting absence.
    await expect(page.locator('#ok').getByRole('button', { name: 'Yes' })).toBeVisible()
    await expect(page.locator('#ownerless').getByRole('button')).toHaveCount(0)
    await expect.poll(() => warnings).toContain('[artpiq-widget] missing owner')
  })

  test('shows its own close button only while the embed has none', async ({ page, baseURL }) => {
    await openHostPage(page, appOrigin(baseURL), `%SCRIPT%<artpiq-widget owner="${OWNER}"></artpiq-widget>`)
    const widget = page.locator('artpiq-widget')
    await openDialog(widget, 'Visualise in your home')
    const hostClose = widget.getByRole('button', { name: 'Close', exact: true })
    await expect(hostClose).toBeVisible()

    // Same origin but sent by the top page, not the iframe: must be ignored.
    await page.evaluate(() => window.postMessage({ type: 'artpiq:own-close', value: true }, '*'))
    await expect(hostClose).toBeVisible()

    const embed = page.frameLocator('artpiq-widget iframe')
    await embed.getByRole('button', { name: 'Announce own close' }).click()
    await expect(hostClose).toBeHidden()
    await embed.getByRole('button', { name: 'Withdraw own close' }).click()
    await expect(hostClose).toBeVisible()
  })
})
