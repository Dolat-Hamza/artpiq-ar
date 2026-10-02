export type WidgetType = 'my-wall' | 'sample-room' | 'ar'

export interface WidgetSnippetOptions {
  owner: string
  type: WidgetType
  collections?: string[]
  artwork?: string
  text?: string
  bgcolor?: string
  fontcolor?: string
}

const HEX_COLOUR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

function esc(v: string): string {
  return v.replace(/[&<>"']/g, c => ESCAPES[c])
}

function attrs(pairs: [string, string | undefined][]): string {
  return pairs
    .filter((p): p is [string, string] => !!p[1])
    .map(([k, v]) => ` ${k}="${esc(v)}"`)
    .join('')
}

const colour = (c?: string) => (c && HEX_COLOUR.test(c) ? c : undefined)

export function widgetSnippet(origin: string, o: WidgetSnippetOptions): string {
  const tag = attrs([
    ['owner', o.owner],
    ['type', o.type],
    ['collection', o.collections?.join(',')],
    ['artwork', o.artwork],
    ['text', o.text],
    ['bgcolor', colour(o.bgcolor)],
    ['fontcolor', colour(o.fontcolor)],
  ])
  return `<script src="${esc(origin)}/embed/widget.js" defer></script>\n<artpiq-widget${tag}></artpiq-widget>`
}

export function newsletterSnippet(origin: string, owner: string): string {
  return `<script src="${esc(origin)}/embed/newsletter.js"${attrs([['data-owner', owner]])}></script>`
}

export interface ProductArSnippetOptions {
  owner: string
  tag?: string
  text?: string
  bgcolor?: string
  fontcolor?: string
}

export function productArSnippet(origin: string, o: ProductArSnippetOptions): string {
  const options = attrs([
    ['data-ar-tag', o.tag],
    ['data-text', o.text],
    ['data-bgcolor', colour(o.bgcolor)],
    ['data-fontcolor', colour(o.fontcolor)],
  ])
  return `<script src="${esc(origin)}/embed/widget.js"${attrs([['data-owner', o.owner]])} data-product-ar${options} defer></script>`
}
