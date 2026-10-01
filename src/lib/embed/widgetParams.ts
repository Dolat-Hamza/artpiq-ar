export const WIDGET_MODES = ['view', 'sample-room', 'my-wall'] as const
export type WidgetMode = typeof WIDGET_MODES[number]

export interface WidgetParams {
  owner: string | null
  collections: string[]
  artwork: string | null
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_COLLECTIONS = 20
const MAX_ARTWORK_ID = 128

export function parseWidgetMode(raw: string): WidgetMode {
  return (WIDGET_MODES as readonly string[]).includes(raw) ? raw as WidgetMode : 'view'
}

export function parseWidgetParams(search: URLSearchParams): WidgetParams {
  // Stryker disable next-line StringLiteral: any non-uuid default is rejected below
  const owner = (search.get('owner') ?? '').trim()
  // Stryker disable next-line StringLiteral: any non-uuid default is rejected below
  const collections = (search.get('collection') ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(s => UUID.test(s))
  const artwork = (search.get('artwork') ?? '').trim()
  return {
    owner: UUID.test(owner) ? owner : null,
    collections: [...new Set(collections)].slice(0, MAX_COLLECTIONS),
    artwork: artwork && artwork.length <= MAX_ARTWORK_ID ? artwork : null,
  }
}
