import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type Frame, type Page } from '@playwright/test'
import ts from 'typescript'

const HOST = 'http://host.test/'
const FRAME = 'http://app.test/frame'

const moduleSource = ts.transpileModule(
  readFileSync(path.join(__dirname, '../../src/lib/embed/hostMessages.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.ES2020, target: ts.ScriptTarget.ES2020 } },
).outputText

// Same harness as loadImage.spec: real module, imported as a data: URL, mutants activated via __stryker__.
async function load(target: Page | Frame) {
  await target.evaluate(m => { (window as unknown as { __stryker__: object }).__stryker__ = { activeMutant: m } }, process.env.__STRYKER_ACTIVE_MUTANT__)
  await target.evaluate(async src => {
    ;(window as unknown as { m: unknown }).m = await import(`data:text/javascript,${encodeURIComponent(src)}`)
  }, moduleSource)
}

async function framed(page: Page) {
  await page.route(HOST, r => r.fulfill({ contentType: 'text/html', body: `<!doctype html><iframe src="${FRAME}"></iframe>` }))
  await page.route(FRAME, r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>f</title>' }))
  await page.goto(HOST)
  await page.evaluate(() => {
    const w = window as unknown as { got: unknown[] }
    w.got = []
    window.addEventListener('message', e => w.got.push({ data: e.data, origin: e.origin }))
  })
  const frame = page.frame({ url: FRAME })!
  await load(frame)
  return frame
}

const received = (page: Page) => page.evaluate(() => (window as unknown as { got: unknown[] }).got)
const call = (target: Page | Frame, js: string) =>
  target.evaluate(c => (new Function('m', c))((window as unknown as { m: unknown }).m), js)

test('a framed page tells its host to close', async ({ page }) => {
  const frame = await framed(page)
  await call(frame, 'm.tellHostClose()')
  await expect.poll(() => received(page)).toEqual([{ data: { type: 'artpiq:close' }, origin: 'http://app.test' }])
})

test('a framed page tells its host whether it shows its own close', async ({ page }) => {
  const frame = await framed(page)
  await call(frame, 'm.tellHostOwnClose(true); m.tellHostOwnClose(false)')
  await expect.poll(() => received(page)).toEqual([
    { data: { type: 'artpiq:own-close', value: true }, origin: 'http://app.test' },
    { data: { type: 'artpiq:own-close', value: false }, origin: 'http://app.test' },
  ])
})

test('a top-level page sends nothing', async ({ page }) => {
  await page.route(HOST, r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>t</title>' }))
  await page.goto(HOST)
  await load(page)
  await page.evaluate(() => {
    const w = window as unknown as { got: unknown[] }
    w.got = []
    window.addEventListener('message', e => w.got.push(e.data))
  })
  await call(page, 'm.tellHostClose(); m.tellHostOwnClose(true); window.postMessage("sentinel", "*")')
  // The sentinel proves the listener ran after anything the module could have posted.
  await expect.poll(() => received(page)).toEqual(['sentinel'])
})
