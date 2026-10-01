import { expect, test } from '@playwright/test'
import { newsletterSnippet, widgetSnippet } from '@/lib/embed/snippets'

const ORIGIN = 'https://app.artpiq.com'
const OWNER = '33207c8e-8a39-4831-a5cf-f0ebdf379a1b'

test.describe('widgetSnippet', () => {
  test('emits the loader script and a minimal widget tag', () => {
    expect(widgetSnippet(ORIGIN, { owner: OWNER, type: 'my-wall' })).toBe(
      `<script src="${ORIGIN}/embed/widget.js" defer></script>\n`
      + `<artpiq-widget owner="${OWNER}" type="my-wall"></artpiq-widget>`,
    )
  })

  test('includes every optional attribute in a stable order', () => {
    const out = widgetSnippet(ORIGIN, {
      owner: OWNER,
      type: 'sample-room',
      collections: ['a', 'b'],
      artwork: 'aw_1',
      text: 'Visualise in your home',
      bgcolor: '#ed1c78',
      fontcolor: '#fff',
    })
    expect(out.split('\n')[1]).toBe(
      `<artpiq-widget owner="${OWNER}" type="sample-room" collection="a,b" artwork="aw_1"`
      + ' text="Visualise in your home" bgcolor="#ed1c78" fontcolor="#fff"></artpiq-widget>',
    )
  })

  test('omits empty optional attributes', () => {
    const tag = widgetSnippet(ORIGIN, {
      owner: OWNER, type: 'my-wall', collections: [], artwork: '', text: '', bgcolor: '', fontcolor: '',
    }).split('\n')[1]
    expect(tag).toBe(`<artpiq-widget owner="${OWNER}" type="my-wall"></artpiq-widget>`)
  })

  test('escapes attribute values', () => {
    const tag = widgetSnippet(ORIGIN, { owner: OWNER, type: 'my-wall', text: `"Mum's" <b>&</b>` }).split('\n')[1]
    expect(tag).toContain('text="&quot;Mum&#39;s&quot; &lt;b&gt;&amp;&lt;/b&gt;"')
  })

  test('drops colours that are not hex', () => {
    const tag = widgetSnippet(ORIGIN, { owner: OWNER, type: 'my-wall', bgcolor: 'red#abc', fontcolor: '#12345' }).split('\n')[1]
    expect(tag).not.toContain('bgcolor')
    expect(tag).not.toContain('fontcolor')
    for (const ok of ['#abc', '#a1B2c3', '#a1b2c3d4']) {
      expect(widgetSnippet(ORIGIN, { owner: OWNER, type: 'my-wall', bgcolor: ok })).toContain(`bgcolor="${ok}"`)
    }
  })
})

test.describe('newsletterSnippet', () => {
  test('matches the existing newsletter embed', () => {
    expect(newsletterSnippet(ORIGIN, OWNER)).toBe(
      `<script src="${ORIGIN}/embed/newsletter.js" data-owner="${OWNER}"></script>`,
    )
  })

  test('escapes the owner attribute', () => {
    expect(newsletterSnippet(ORIGIN, '"x')).toContain('data-owner="&quot;x"')
  })
})
