import { expect, test } from '@playwright/test'
import { isUuid } from '@/lib/validation/uuid'

test('accepts canonical uuids in either case', () => {
  expect(isUuid('33207c8e-8a39-4831-a5cf-f0ebdf379a1b')).toBe(true)
  expect(isUuid('33207C8E-8A39-4831-A5CF-F0EBDF379A1B')).toBe(true)
})

test('rejects anything else', () => {
  for (const v of [
    '', 'not-a-uuid', '33207c8e-8a39-4831-a5cf-f0ebdf379a1', '33207c8e-8a39-4831-a5cf-f0ebdf379a1bb',
    'x33207c8e-8a39-4831-a5cf-f0ebdf379a1b', '33207c8e8a394831a5cff0ebdf379a1b', '33207c8g-8a39-4831-a5cf-f0ebdf379a1b',
    ' 33207c8e-8a39-4831-a5cf-f0ebdf379a1b', null, undefined, 42, {},
    ['33207c8e-8a39-4831-a5cf-f0ebdf379a1b'], { toString: () => '33207c8e-8a39-4831-a5cf-f0ebdf379a1b' },
  ]) expect(isUuid(v), String(v)).toBe(false)
})
