import { expect, test } from '@playwright/test'
import { fetchSquarespaceProducts, type SqspProduct } from '@/lib/sqsp/products'

const API = 'https://api.squarespace.com/v2/commerce/products'
const p = (id: string) => ({ id, name: id, url: '', isVisible: true, tags: [], images: [], variants: [] }) as SqspProduct

function fakeFetch(pages: Record<string, unknown>, status = 200) {
  const calls: { url: string; headers: Record<string, string> }[] = []
  const fetcher = async (url: string, init: RequestInit) => {
    calls.push({ url, headers: init.headers as Record<string, string> })
    return new Response(JSON.stringify(pages[url] ?? {}), { status })
  }
  return { calls, fetcher }
}

test('reads every page by cursor with the key and a user agent', async () => {
  const { calls, fetcher } = fakeFetch({
    [`${API}?type=PHYSICAL`]: { products: [p('a'), p('b')], pagination: { hasNextPage: true, nextPageCursor: 'c1' } },
    [`${API}?cursor=c1`]: { products: [p('c')], pagination: { hasNextPage: false, nextPageCursor: 'stale' } },
  })
  const products = await fetchSquarespaceProducts('k3y', fetcher)
  expect(products.map(x => x.id)).toEqual(['a', 'b', 'c'])
  expect(calls.map(c => c.url)).toEqual([`${API}?type=PHYSICAL`, `${API}?cursor=c1`])
  for (const c of calls) {
    expect(c.headers.Authorization).toBe('Bearer k3y')
    expect(c.headers['User-Agent']).toBe('ArtPiq catalogue sync')
  }
})

test('fails loudly on an API error instead of returning a partial catalogue', async () => {
  const { fetcher } = fakeFetch({}, 401)
  await expect(fetchSquarespaceProducts('bad', fetcher)).rejects.toThrow('Squarespace API 401')
})

test('stops when a page says there is more but gives no cursor', async () => {
  const { calls, fetcher } = fakeFetch({
    [`${API}?type=PHYSICAL`]: { products: [p('a')], pagination: { hasNextPage: true } },
  })
  expect((await fetchSquarespaceProducts('k', fetcher)).map(x => x.id)).toEqual(['a'])
  expect(calls).toHaveLength(1)
})
