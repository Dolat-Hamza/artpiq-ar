import { expect, test } from '@playwright/test'
import { fetchWithValidatedRedirects, readResponseBodyLimited } from '@/lib/network/safeFetch'

const redirect = (location?: string, status = 302) =>
  new Response(null, { status, headers: location ? { location } : {} })

function fakeFetcher(responses: Record<string, Response>) {
  const calls: string[] = []
  const fetcher = async (u: URL) => {
    calls.push(u.href)
    return responses[u.href] ?? new Response('missing', { status: 404 })
  }
  return { calls, fetcher }
}

const allowAll = async () => true

test.describe('fetchWithValidatedRedirects', () => {
  test('returns a non-redirect response after checking the url', async () => {
    const checked: string[] = []
    const { calls, fetcher } = fakeFetcher({ 'https://a.test/x': new Response('ok') })
    const res = await fetchWithValidatedRedirects(new URL('https://a.test/x'), async u => { checked.push(u.href); return true }, fetcher)
    expect(await res.text()).toBe('ok')
    expect(checked).toEqual(['https://a.test/x'])
    expect(calls).toEqual(['https://a.test/x'])
  })

  test('follows relative redirects and validates every hop', async () => {
    const checked: string[] = []
    const { calls, fetcher } = fakeFetcher({
      'https://a.test/x': redirect('/y', 301),
      'https://a.test/y': redirect('https://b.test/z', 307),
      'https://b.test/z': new Response('done'),
    })
    const res = await fetchWithValidatedRedirects(new URL('https://a.test/x'), async u => { checked.push(u.href); return true }, fetcher)
    expect(await res.text()).toBe('done')
    expect(checked).toEqual(['https://a.test/x', 'https://a.test/y', 'https://b.test/z'])
    expect(calls).toEqual(checked)
  })

  test('treats exactly 300-399 as redirects', async () => {
    const { fetcher } = fakeFetcher({
      'https://a.test/300': redirect('/ok', 300),
      'https://a.test/399': redirect('/ok', 399),
      'https://a.test/400': new Response('bad', { status: 400, headers: { location: '/ok' } }),
      'https://a.test/404': new Response('gone', { status: 404, headers: { location: '/ok' } }),
      'https://a.test/ok': new Response('followed'),
    })
    const get = async (p: string) => (await fetchWithValidatedRedirects(new URL(`https://a.test/${p}`), allowAll, fetcher)).status
    expect(await get('300')).toBe(200)
    expect(await get('399')).toBe(200)
    expect(await get('400')).toBe(400)
    expect(await get('404')).toBe(404)
  })

  test('refuses a blocked hop before fetching it', async () => {
    const { calls, fetcher } = fakeFetcher({ 'https://a.test/x': redirect('http://169.254.169.254/') })
    await expect(fetchWithValidatedRedirects(new URL('https://a.test/x'), async u => u.hostname === 'a.test', fetcher))
      .rejects.toThrow('Upstream URL is not allowed')
    expect(calls).toEqual(['https://a.test/x'])
  })

  test('refuses a redirect without a location', async () => {
    const { fetcher } = fakeFetcher({ 'https://a.test/x': redirect() })
    await expect(fetchWithValidatedRedirects(new URL('https://a.test/x'), allowAll, fetcher))
      .rejects.toThrow('Upstream redirect has no location')
  })

  test('stops after the redirect limit', async () => {
    const { calls, fetcher } = fakeFetcher({
      'https://a.test/0': redirect('/1'), 'https://a.test/1': redirect('/2'), 'https://a.test/2': redirect('/3'),
      'https://a.test/3': new Response('three'),
    })
    expect(await (await fetchWithValidatedRedirects(new URL('https://a.test/0'), allowAll, fetcher, 3)).text()).toBe('three')
    await expect(fetchWithValidatedRedirects(new URL('https://a.test/0'), allowAll, fetcher, 2)).rejects.toThrow('Too many redirects')
    expect(calls.slice(-3)).toEqual(['https://a.test/0', 'https://a.test/1', 'https://a.test/2'])
  })
})

test.describe('readResponseBodyLimited', () => {
  test('returns the full body within the limit', async () => {
    const body = new Uint8Array([1, 2, 3, 4])
    expect(new Uint8Array(await readResponseBodyLimited(new Response(body), 4))).toEqual(body)
  })

  test('accepts a body exactly at the limit, across chunks', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(c) { c.enqueue(new Uint8Array([1, 2])); c.enqueue(new Uint8Array([3, 4])); c.close() },
    })
    const res = new Response(stream, { headers: { 'content-length': '4' } })
    expect(new Uint8Array(await readResponseBodyLimited(res, 4))).toEqual(new Uint8Array([1, 2, 3, 4]))
    expect(res.body?.locked).toBe(false)
  })

  test('rejects on a declared length over the limit without reading', async () => {
    const res = new Response(new Uint8Array(2), { headers: { 'content-length': '5' } })
    await expect(readResponseBodyLimited(res, 4)).rejects.toThrow('Upstream image is too large')
    expect(res.bodyUsed).toBe(false)
  })

  test('rejects when the streamed body exceeds the limit', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(c) { c.enqueue(new Uint8Array(3)); c.enqueue(new Uint8Array(2)); c.close() },
    })
    const res = new Response(stream)
    await expect(readResponseBodyLimited(res, 4)).rejects.toThrow('Upstream image is too large')
    expect(res.body?.locked).toBe(false)
  })

  test('returns an empty buffer for a bodiless response', async () => {
    expect((await readResponseBodyLimited(new Response(null, { status: 204 }), 4)).byteLength).toBe(0)
  })
})
