import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import sharp from 'sharp'
import ts from 'typescript'

const APP = 'http://app.test/'
const IMG = 'http://img.test'

// Run the real module in the browser: transpile with tsc and import it as a data: module.
const moduleSource = ts.transpileModule(
  readFileSync(path.join(__dirname, '../../src/lib/image/loadImage.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.ES2020, target: ts.ScriptTarget.ES2020 } },
).outputText

let png: Buffer
let wide: Buffer

test.beforeAll(async () => {
  png = await sharp({ create: { width: 3, height: 2, channels: 3, background: '#f00' } }).png().toBuffer()
  wide = await sharp({ create: { width: 5, height: 2, channels: 3, background: '#00f' } }).png().toBuffer()
})

async function open(page: Page) {
  const cors = { 'Access-Control-Allow-Origin': '*' }
  await page.route(`${APP}**`, r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>t</title>' }))
  await page.route(`${IMG}/ok.png`, r => r.fulfill({ contentType: 'image/png', headers: cors, body: png }))
  await page.route(`${IMG}/missing.png`, r => r.fulfill({ status: 404, headers: cors, body: '' }))
  await page.route(`${IMG}/placeholder-404.png`, r => r.request().resourceType() === 'image'
    ? r.fulfill({ contentType: 'image/png', headers: cors, body: wide })
    : r.fulfill({ status: 404, contentType: 'image/png', headers: cors, body: png }))
  await page.route(`${IMG}/img-only.png`, r => r.request().resourceType() === 'image'
    ? r.fulfill({ contentType: 'image/png', headers: cors, body: png })
    : r.fulfill({ status: 500, headers: cors, body: '' }))
  await page.goto(APP)
  // Stryker activates mutants through this global; the page has no process.env.
  await page.evaluate(m => { (window as unknown as { __stryker__: object }).__stryker__ = { activeMutant: m } }, process.env.__STRYKER_ACTIVE_MUTANT__)
  await page.evaluate(async src => {
    const mod = await import(`data:text/javascript,${encodeURIComponent(src)}`)
    ;(window as unknown as { m: typeof mod }).m = mod
  }, moduleSource)
}

type Probe = { ok: boolean; w?: number; src?: string; crossOrigin?: string | null; referrer?: string; error?: string }

function probe(page: Page, call: string): Promise<Probe> {
  return page.evaluate(async c => {
    const m = (window as unknown as { m: Record<string, (...a: unknown[]) => Promise<HTMLImageElement>> }).m
    try {
      const img = await (new Function('m', `return ${c}`))(m) as HTMLImageElement
      return { ok: true, w: img.naturalWidth, src: img.src, crossOrigin: img.getAttribute('crossorigin'), referrer: img.referrerPolicy }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  }, call)
}

test.describe('loadImage', () => {
  test('resolves a decoded image without CORS by default', async ({ page }) => {
    await open(page)
    const r = await probe(page, `m.loadImage('${IMG}/ok.png')`)
    expect(r).toMatchObject({ ok: true, w: 3, src: `${IMG}/ok.png`, crossOrigin: null, referrer: 'no-referrer' })
  })

  test('requests anonymous CORS when asked', async ({ page }) => {
    await open(page)
    const r = await probe(page, `m.loadImage('${IMG}/ok.png', { cors: true })`)
    expect(r).toMatchObject({ ok: true, w: 3, crossOrigin: 'anonymous' })
  })

  test('rejects with the failing url', async ({ page }) => {
    await open(page)
    const r = await probe(page, `m.loadImage('${IMG}/missing.png')`)
    expect(r.ok).toBe(false)
    expect(r.error).toBe(`load failed: ${IMG}/missing.png`)
  })
})

test.describe('loadImageForCanvas', () => {
  test('prefers a same-origin blob so canvas export is untainted', async ({ page }) => {
    await open(page)
    const r = await probe(page, `m.loadImageForCanvas('${IMG}/ok.png')`)
    expect(r.ok).toBe(true)
    expect(r.w).toBe(3)
    expect(r.src).toMatch(/^blob:/)
  })

  test('falls back to a CORS image when fetch fails', async ({ page }) => {
    await open(page)
    const r = await probe(page, `m.loadImageForCanvas('${IMG}/img-only.png')`)
    expect(r).toMatchObject({ ok: true, w: 3, src: `${IMG}/img-only.png`, crossOrigin: 'anonymous' })
  })

  test('ignores an error response even when its body is an image', async ({ page }) => {
    await open(page)
    const r = await probe(page, `m.loadImageForCanvas('${IMG}/placeholder-404.png')`)
    expect(r).toMatchObject({ ok: true, w: 5, src: `${IMG}/placeholder-404.png` })
  })

  test('rejects when both paths fail', async ({ page }) => {
    await open(page)
    const r = await probe(page, `m.loadImageForCanvas('${IMG}/missing.png')`)
    expect(r).toMatchObject({ ok: false, error: `load failed: ${IMG}/missing.png` })
  })
})
