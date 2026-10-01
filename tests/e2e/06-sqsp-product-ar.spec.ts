import { expect, test, type Page } from '@playwright/test'
import { productArSnippet } from '@/lib/embed/snippets'

// Footer-injected "View on your wall" button on Squarespace product pages,
// plus the SKU resolve route it calls.

const HOST = 'http://fake-gallery.test'
const OWNER = '33207c8e-8a39-4831-a5cf-f0ebdf379a1b'

test.use({
  launchOptions: {
    args: [
      `--unsafely-treat-insecure-origin-as-secure=${HOST}`,
      '--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests',
    ],
  },
})

interface Product {
  id: string
  slug: string
  tags: string[]
  sku: string
  artwork: string | null
}

const PRODUCTS: Record<string, Product> = {
  ar: { id: 'item-ar', slug: 'pink-floyd', tags: ['AR', 'Daniel Roibal'], sku: 'SQ6225487', artwork: 'art-42' },
  lower: { id: 'item-lower', slug: 'lower', tags: ['ar'], sku: 'SQ-LOWER', artwork: 'art-lower' },
  custom: { id: 'item-custom', slug: 'custom', tags: ['Daniel Roibal', 'view-ar'], sku: 'SQ-CUSTOM', artwork: 'art-custom' },
  untagged: { id: 'item-untagged', slug: 'untagged', tags: ['Daniel Roibal'], sku: 'SQ-UNTAGGED', artwork: 'art-untagged' },
  addon: { id: 'item-addon', slug: 'frame', tags: ['AR', 'Add-On'], sku: 'SQ-ADDON', artwork: 'art-addon' },
  unknown: { id: 'item-unknown', slug: 'unknown', tags: ['AR'], sku: 'SQ-UNKNOWN', artwork: null },
}

const fullUrl = (p: Product) => `/shop/p/${p.slug}`
const context = (p: Product) => ({ item: { id: p.id, fullUrl: fullUrl(p), title: p.slug.toUpperCase() }, product: {} })

// Shape of a live `?format=json` product response, trimmed to what matters.
const productJson = (p: Product) => ({
  website: { id: 'site' },
  item: {
    id: p.id,
    title: p.slug.toUpperCase(),
    fullUrl: fullUrl(p),
    tags: p.tags,
    structuredContent: {
      productType: 1,
      variants: [{ id: `${p.id}-v`, sku: p.sku, width: 80, height: 100, len: 3, weight: 1, stock: { quantity: 1 } }],
    },
  },
})

const PRODUCT_MARKUP = `<div class="ProductItem"><div class="ProductItem-details">
  <h1>Title</h1>
  <div class="sqs-add-to-cart-button-wrapper"><div class="sqs-add-to-cart-button">Add To Cart</div></div>
  <p class="ProductItem-description">Description</p>
</div></div>`

const appOrigin = (baseURL: string | undefined) => new URL(baseURL ?? 'http://localhost:3005').origin
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')

interface Setup {
  product?: Product
  markup?: string
  footer?: { tag?: string; text?: string; bgcolor?: string; fontcolor?: string }
  codeBlockCopy?: boolean
  path?: string
}

async function openSite(page: Page, app: string, s: Setup) {
  const jsonRequests: string[] = []
  const resolveRequests: URL[] = []
  const ctx = s.product ? context(s.product) : { website: { id: 'site' } }
  const footer = productArSnippet(app, { owner: OWNER, ...s.footer })
  const codeBlock = s.codeBlockCopy ? `<div class="code-block"><script src="${app}/embed/widget.js" defer></script></div>` : ''
  const html = `<!doctype html><html><head><title>Shop</title>
<script>window.Static = { SQUARESPACE_CONTEXT: ${JSON.stringify(ctx)} }</script></head>
<body><main>${codeBlock}${s.markup ?? PRODUCT_MARKUP}</main>${footer}</body></html>`

  await page.addInitScript(() => {
    const w = window as unknown as { __inserted: string[] }
    w.__inserted = []
    new MutationObserver(records => {
      for (const r of records) {
        r.addedNodes.forEach(n => {
          if (n instanceof Element && n.matches('artpiq-widget[data-artpiq-product]')) {
            w.__inserted.push(n.getAttribute('data-artpiq-product') as string)
          }
        })
      }
    }).observe(document, { childList: true, subtree: true })
  })

  await page.route(`${HOST}/**`, route => {
    const url = new URL(route.request().url())
    if (url.searchParams.get('format') === 'json') {
      jsonRequests.push(url.pathname)
      const p = Object.values(PRODUCTS).find(x => fullUrl(x) === url.pathname)
      return p ? route.fulfill({ json: productJson(p) }) : route.fulfill({ status: 404, body: 'not found' })
    }
    return route.fulfill({ contentType: 'text/html', body: html })
  })

  // Real resolve route is covered below; here it is stubbed for determinism.
  await page.route(new RegExp(`^${escapeRe(app)}/api/ar/resolve\\?`), route => {
    const url = new URL(route.request().url())
    resolveRequests.push(url)
    const p = Object.values(PRODUCTS).find(x => x.sku === url.searchParams.get('sku'))
    const headers = { 'access-control-allow-origin': '*' }
    if (url.searchParams.get('owner') !== OWNER || !p?.artwork) {
      return route.fulfill({ status: 404, headers, json: { error: 'no match' } })
    }
    return route.fulfill({ headers, json: { id: p.artwork, title: p.slug, arPath: `/ar/${p.artwork}` } })
  })

  await page.route(new RegExp(`^${escapeRe(app)}/ar/`), r =>
    r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>AR landing</title><h1>AR landing</h1>' }),
  )

  await page.goto(`${HOST}${s.path ?? (s.product ? fullUrl(s.product) : '/about')}`)
  return { jsonRequests, resolveRequests }
}

// Stubbed routes answer instantly; this only lets a wrongly re-run loader show itself.
const settle = (page: Page) => page.waitForTimeout(500)
const inserted = (page: Page) => page.evaluate(() => (window as unknown as { __inserted: string[] }).__inserted)
const productWidgets = (page: Page) => page.locator('artpiq-widget[data-artpiq-product]')

// Squarespace 7.0 AJAX navigation: context swaps, then mercury:load fires.
async function navigate(page: Page, p: Product, markup?: string) {
  await page.evaluate(
    ([ctx, html]) => {
      const w = window as unknown as { Static: { SQUARESPACE_CONTEXT: unknown } }
      w.Static.SQUARESPACE_CONTEXT = ctx
      if (html) document.querySelector('main')!.innerHTML = html
      window.dispatchEvent(new Event('mercury:load'))
    },
    [context(p), markup ?? ''] as const,
  )
}

async function expectProductButton(page: Page, p: Product, label = 'View on your wall') {
  const widget = page.locator(`artpiq-widget[data-artpiq-product="${p.id}"]`)
  await expect(widget.getByRole('button', { name: label, exact: true })).toBeVisible()
  return widget
}

test.describe('AR resolve route (/api/ar/resolve)', () => {
  test('answers CORS preflight', async ({ request }) => {
    const res = await request.fetch(`/api/ar/resolve?owner=${OWNER}&sku=X`, { method: 'OPTIONS' })
    expect(res.status()).toBe(204)
    expect(res.headers()['access-control-allow-origin']).toBe('*')
    expect(res.headers()['access-control-allow-methods']).toBe('GET, OPTIONS')
  })

  test('rejects a malformed owner or sku', async ({ request }) => {
    for (const query of [
      'owner=not-a-uuid&sku=SQ1',
      `owner=${OWNER}`,
      `owner=${OWNER}&sku=%20%20`,
      `owner=${OWNER}&sku=${'S'.repeat(65)}`,
    ]) {
      const res = await request.get(`/api/ar/resolve?${query}`)
      expect(res.status(), query).toBe(400)
      expect(typeof (await res.json()).error, query).toBe('string')
      expect(res.headers()['access-control-allow-origin'], query).toBe('*')
    }
  })

  test('unknown sku is a cacheable CORS 404', async ({ request }) => {
    const res = await request.get(`/api/ar/resolve?owner=00000000-0000-4000-8000-000000000000&sku=ZZ-NO-SUCH-SKU`)
    expect(res.status()).toBe(404)
    expect(res.headers()['access-control-allow-origin']).toBe('*')
    expect(res.headers()['cache-control']).toBe('public, s-maxage=300, stale-while-revalidate=86400')
    expect(await res.json()).toEqual({ error: 'no match' })
  })
})

test.describe('Product-page AR loader (data-product-ar)', () => {
  test('AR-tagged product gets one button right after add-to-cart, with label and colours', async ({ page, baseURL }) => {
    const app = appOrigin(baseURL)
    const p = PRODUCTS.ar
    const { jsonRequests, resolveRequests } = await openSite(page, app, {
      product: p,
      footer: { text: 'View on your Wall', bgcolor: '#ed1c78', fontcolor: '#000' },
    })

    const widget = await expectProductButton(page, p, 'View on your Wall')
    await expect(productWidgets(page)).toHaveCount(1)
    await expect(widget).toHaveAttribute('type', 'ar')
    await expect(widget).toHaveAttribute('artwork', 'art-42')
    await expect(widget).toHaveAttribute('owner', OWNER)
    const button = widget.getByRole('button')
    await expect(button).toHaveCSS('background-color', 'rgb(237, 28, 120)')
    await expect(button).toHaveCSS('color', 'rgb(0, 0, 0)')

    const follows = await page.evaluate(() => {
      const el = document.querySelector('artpiq-widget[data-artpiq-product]')
      return el?.previousElementSibling?.classList.contains('sqs-add-to-cart-button-wrapper') ?? false
    })
    expect(follows).toBe(true)
    expect(jsonRequests).toEqual([fullUrl(p)])
    expect(resolveRequests.map(u => [u.searchParams.get('owner'), u.searchParams.get('sku')])).toEqual([[OWNER, p.sku]])
  })

  test('falls back to the product details block without an add-to-cart wrapper', async ({ page, baseURL }) => {
    const p = PRODUCTS.ar
    await openSite(page, appOrigin(baseURL), {
      product: p,
      markup: '<div class="ProductItem"><div class="ProductItem-details"><h1>Title</h1></div></div>',
    })
    await expectProductButton(page, p)
    const parent = await productWidgets(page).evaluate(el => el.parentElement?.className)
    expect(parent).toBe('ProductItem-details')
  })

  test('tag match is exact but case-insensitive', async ({ page, baseURL }) => {
    const { jsonRequests, resolveRequests } = await openSite(page, appOrigin(baseURL), { product: PRODUCTS.custom })
    await expect.poll(() => jsonRequests.length).toBe(1)
    // "view-ar" must not match "AR"; "ar" must.
    await navigate(page, PRODUCTS.lower)
    await expectProductButton(page, PRODUCTS.lower)
    expect(await inserted(page)).toEqual([PRODUCTS.lower.id])
    expect(resolveRequests.map(u => u.searchParams.get('sku'))).toEqual([PRODUCTS.lower.sku])
  })

  test('honours a custom data-ar-tag', async ({ page, baseURL }) => {
    await openSite(page, appOrigin(baseURL), { product: PRODUCTS.custom, footer: { tag: 'VIEW-AR' } })
    await expectProductButton(page, PRODUCTS.custom)
  })

  for (const [name, product] of [
    ['untagged product', PRODUCTS.untagged],
    ['add-on product', PRODUCTS.addon],
  ] as const) {
    test(`${name} gets no button and is never resolved`, async ({ page, baseURL }) => {
      const { jsonRequests, resolveRequests } = await openSite(page, appOrigin(baseURL), { product })
      await expect.poll(() => jsonRequests.length).toBe(1)
      // A later AR product proves the loader ran and acts as a sync point.
      await navigate(page, PRODUCTS.ar)
      await expectProductButton(page, PRODUCTS.ar)
      expect(await inserted(page)).toEqual([PRODUCTS.ar.id])
      expect(resolveRequests.map(u => u.searchParams.get('sku'))).toEqual([PRODUCTS.ar.sku])
    })
  }

  test('resolve 404 renders no button', async ({ page, baseURL }) => {
    const { resolveRequests } = await openSite(page, appOrigin(baseURL), { product: PRODUCTS.unknown })
    await expect.poll(() => resolveRequests.length).toBe(1)
    await settle(page)
    await navigate(page, PRODUCTS.ar)
    await expectProductButton(page, PRODUCTS.ar)
    expect(await inserted(page)).toEqual([PRODUCTS.ar.id])
  })

  test('non-product page renders nothing and never fetches ?format=json', async ({ page, baseURL }) => {
    const { jsonRequests } = await openSite(page, appOrigin(baseURL), { markup: '<h1>About</h1>' })
    expect(jsonRequests).toEqual([])
    await navigate(page, PRODUCTS.ar, PRODUCT_MARKUP)
    await expectProductButton(page, PRODUCTS.ar)
    expect(jsonRequests).toEqual([fullUrl(PRODUCTS.ar)])
    expect(await inserted(page)).toEqual([PRODUCTS.ar.id])
  })

  test('a Code Block copy of widget.js loading first still yields exactly one product button', async ({ page, baseURL }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await openSite(page, appOrigin(baseURL), { product: PRODUCTS.ar, codeBlockCopy: true })
    await expectProductButton(page, PRODUCTS.ar)
    await settle(page)
    await expect(productWidgets(page)).toHaveCount(1)
    expect(await inserted(page)).toEqual([PRODUCTS.ar.id])
    expect(errors).toEqual([])
  })

  test('mercury:load re-runs without duplicating and replaces a stale product button', async ({ page, baseURL }) => {
    await openSite(page, appOrigin(baseURL), { product: PRODUCTS.ar })
    await expectProductButton(page, PRODUCTS.ar)

    await page.evaluate(() => {
      window.dispatchEvent(new Event('mercury:load'))
      window.dispatchEvent(new Event('mercury:load'))
    })
    await settle(page)
    await expect(productWidgets(page)).toHaveCount(1)
    expect(await inserted(page)).toEqual([PRODUCTS.ar.id])

    await navigate(page, PRODUCTS.lower)
    await expectProductButton(page, PRODUCTS.lower)
    await expect(productWidgets(page)).toHaveCount(1)
    await expect(productWidgets(page)).toHaveAttribute('artwork', 'art-lower')
  })

  test('desktop click opens the AR landing in the dialog', async ({ page, baseURL }) => {
    const app = appOrigin(baseURL)
    await openSite(page, app, { product: PRODUCTS.ar })
    const widget = await expectProductButton(page, PRODUCTS.ar)
    await widget.getByRole('button', { name: 'View on your wall' }).click()
    await expect(widget.getByRole('dialog')).toBeVisible()
    await expect(widget.locator('iframe')).toHaveAttribute('src', `${app}/ar/art-42`)
    await expect(widget.locator('iframe').contentFrame().getByRole('heading', { name: 'AR landing' })).toBeVisible()
  })
})

test.describe('Product-page AR loader on a touch phone', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } })

  test('click navigates the top window to the AR landing', async ({ page, baseURL }) => {
    const app = appOrigin(baseURL)
    await openSite(page, app, { product: PRODUCTS.ar })
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true)
    const widget = await expectProductButton(page, PRODUCTS.ar)
    await widget.getByRole('button', { name: 'View on your wall' }).click()
    await expect(page).toHaveURL(`${app}/ar/art-42`)
  })
})

test('<artpiq-widget type="ar"> without artwork renders nothing and warns', async ({ page, baseURL }) => {
  const app = appOrigin(baseURL)
  const warnings: string[] = []
  page.on('console', m => {
    if (m.type() === 'warning') warnings.push(m.text())
  })
  await page.route(`${HOST}/**`, r =>
    r.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><body><script src="${app}/embed/widget.js" defer></script>
      <artpiq-widget id="bare" owner="${OWNER}" type="ar"></artpiq-widget>
      <artpiq-widget id="ok" owner="${OWNER}" type="ar" artwork="art-1"></artpiq-widget></body>`,
    }),
  )
  await page.goto(`${HOST}/`)
  await expect(page.locator('#ok').getByRole('button', { name: 'View on your wall', exact: true })).toBeVisible()
  await expect(page.locator('#bare').getByRole('button')).toHaveCount(0)
  await expect.poll(() => warnings).toContain('[artpiq-widget] missing artwork')
})
