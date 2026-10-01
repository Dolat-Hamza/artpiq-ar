import { expect, test } from '@playwright/test'
import { parseWidgetMode, parseWidgetParams } from '@/lib/embed/widgetParams'

const OWNER = '33207c8e-8a39-4831-a5cf-f0ebdf379a1b'
const C1 = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const C2 = '11111111-2222-4333-8444-555555555555'
const qs = (s: string) => parseWidgetParams(new URLSearchParams(s))

test.describe('parseWidgetMode', () => {
  test('accepts every supported mode', () => {
    expect(parseWidgetMode('view')).toBe('view')
    expect(parseWidgetMode('sample-room')).toBe('sample-room')
    expect(parseWidgetMode('my-wall')).toBe('my-wall')
  })

  test('falls back to view for anything else', () => {
    expect(parseWidgetMode('admin')).toBe('view')
    expect(parseWidgetMode('')).toBe('view')
  })
})

test.describe('parseWidgetParams', () => {
  test('reads a valid owner', () => {
    expect(qs(`owner=${OWNER}`).owner).toBe(OWNER)
    expect(qs(`owner=%20${OWNER}%20`).owner).toBe(OWNER)
  })

  test('rejects a missing or malformed owner', () => {
    expect(qs('').owner).toBeNull()
    expect(qs('owner=not-a-uuid').owner).toBeNull()
    expect(qs(`owner=${OWNER}x`).owner).toBeNull()
    expect(qs(`owner=x${OWNER}`).owner).toBeNull()
  })

  test('splits, trims and dedupes collection ids', () => {
    expect(qs(`collection=${C1},%20${C2}%20,${C1}`).collections).toEqual([C1, C2])
  })

  test('drops collection entries that are not uuids', () => {
    expect(qs(`collection=${C1},daniel-roibal-mirror,,${C2}x`).collections).toEqual([C1])
    expect(qs('').collections).toEqual([])
  })

  test('caps collections at twenty', () => {
    const ids = Array.from({ length: 25 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`)
    const parsed = qs(`collection=${ids.join(',')}`).collections
    expect(parsed).toEqual(ids.slice(0, 20))
  })

  test('reads a trimmed artwork id', () => {
    expect(qs('artwork=%20aw_123%20').artwork).toBe('aw_123')
  })

  test('rejects an empty or oversized artwork id', () => {
    expect(qs('').artwork).toBeNull()
    expect(qs('artwork=%20%20').artwork).toBeNull()
    expect(qs(`artwork=${'a'.repeat(128)}`).artwork).toBe('a'.repeat(128))
    expect(qs(`artwork=${'a'.repeat(129)}`).artwork).toBeNull()
  })
})
