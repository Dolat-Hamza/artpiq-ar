import { expect, test } from '@playwright/test'

// Contract only: the sync reads a private store key and writes the owner's catalogue.
test('sync refuses callers without a signed-in session', async ({ request }) => {
  const res = await request.post('/api/squarespace/sync', { data: { apply: true } })
  expect(res.status()).toBe(401)
  expect(await res.json()).toEqual({ error: 'Authentication required' })
})

test('sync refuses an invalid session', async ({ request }) => {
  const res = await request.post('/api/squarespace/sync', { data: {}, headers: { Authorization: 'Bearer not-a-token' } })
  expect(res.status()).toBe(401)
})
