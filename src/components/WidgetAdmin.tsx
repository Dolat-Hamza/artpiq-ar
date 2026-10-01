'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/db/auth'
import { listMyCollections } from '@/lib/db/collections'
import { productArSnippet, widgetSnippet, type WidgetType } from '@/lib/embed/snippets'
import type { Collection } from '@/types'
import LoginForm from './LoginForm'
import AdminPageHeader from './ui/AdminPageHeader'
import SnippetBox from './SnippetBox'

const FIELD_LABEL = 'block text-[11px] uppercase tracking-wider text-ink-muted font-semibold mb-1.5'

const TYPES: { value: WidgetType; label: string }[] = [
  { value: 'my-wall', label: 'My Wall — "Visualise in your home"' },
  { value: 'sample-room', label: 'Sample Room' },
]

export default function WidgetAdmin() {
  const { user, loading } = useAuth()
  const [collections, setCollections] = useState<Collection[]>([])
  const [loadError, setLoadError] = useState(false)
  const [type, setType] = useState<WidgetType>('my-wall')
  const [picked, setPicked] = useState<string[]>([])
  const [artwork, setArtwork] = useState('')
  const [text, setText] = useState('')
  const [bgcolor, setBgcolor] = useState('#141210')
  const [fontcolor, setFontcolor] = useState('#ffffff')
  const [arTag, setArTag] = useState('AR')
  const [arText, setArText] = useState('View on your wall')
  const [arBg, setArBg] = useState('#141210')
  const [arFg, setArFg] = useState('#ffffff')

  useEffect(() => {
    if (!user) return
    listMyCollections(user.id).then(setCollections).catch(() => setLoadError(true))
  }, [user])

  if (loading) return <div className="p-8 text-body text-ink-muted">Loading…</div>
  if (!user) return <div className="min-h-dvh flex items-center justify-center p-6"><LoginForm /></div>

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const snippet = widgetSnippet(origin, {
    owner: user.id,
    type,
    collections: picked,
    artwork: artwork.trim() || undefined,
    text: text.trim() || undefined,
    bgcolor,
    fontcolor,
  })

  function toggle(id: string) {
    setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]))
  }

  const productSnippet = productArSnippet(origin, {
    owner: user.id,
    tag: arTag.trim() || undefined,
    text: arText.trim() || undefined,
    bgcolor: arBg,
    fontcolor: arFg,
  })

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <AdminPageHeader title="Website Widget" />
      <main className="px-6 md:px-10 py-6 grid gap-8 lg:grid-cols-2 max-w-content">
        <section className="space-y-5">
          <label className="block">
            <span className={FIELD_LABEL}>Type</span>
            <select className="input w-full" value={type} onChange={e => setType(e.target.value as WidgetType)}>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>

          <fieldset>
            <legend className="text-[11px] uppercase tracking-wider text-ink-muted font-semibold mb-1.5">
              Collections <span className="normal-case tracking-normal font-normal">(none selected = all public artworks)</span>
            </legend>
            {loadError ? (
              <p className="text-[12px] text-ink-muted">Could not load your collections.</p>
            ) : !collections.length ? (
              <p className="text-[12px] text-ink-muted">No collections yet.</p>
            ) : (
              <ul className="border border-line divide-y divide-line bg-paper max-h-[280px] overflow-y-auto">
                {collections.map(c => {
                  const isPrivate = c.privacy === 'private'
                  return (
                    <li key={c.id}>
                      <label className={`flex items-center gap-3 px-3 py-2 text-[13px] ${isPrivate ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          disabled={isPrivate}
                          checked={picked.includes(c.id)}
                          onChange={() => toggle(c.id)}
                        />
                        <span className="flex-1 truncate">{c.name}</span>
                        <span className="text-[10px] uppercase tracking-[0.14em] text-ink-muted">{c.privacy}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
            <p className="text-[11px] text-ink-muted mt-1.5">Only public collections appear in the widget.</p>
          </fieldset>

          <label className="block">
            <span className={FIELD_LABEL}>Artwork id (optional)</span>
            <input className="input w-full" value={artwork} onChange={e => setArtwork(e.target.value)} placeholder="Pre-select one artwork" />
          </label>

          <label className="block">
            <span className={FIELD_LABEL}>Button text</span>
            <input
              className="input w-full"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={type === 'my-wall' ? 'Visualise in your home' : 'View in a room'}
            />
          </label>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-[12px]">
              <input type="color" value={bgcolor} onChange={e => setBgcolor(e.target.value)} className="w-10 h-9 border border-line rounded" />
              Background
            </label>
            <label className="flex items-center gap-2 text-[12px]">
              <input type="color" value={fontcolor} onChange={e => setFontcolor(e.target.value)} className="w-10 h-9 border border-line rounded" />
              Text
            </label>
          </div>
        </section>

        <section>
          <SnippetBox snippet={snippet}>
            Squarespace: add a Code Block (HTML) where the button should appear and paste this. Requires a Core plan or higher.
          </SnippetBox>
        </section>

        <section aria-labelledby="product-ar" className="lg:col-span-2 grid gap-8 lg:grid-cols-2 border-t border-line pt-8">
          <div className="space-y-5">
            <h2 id="product-ar" className="text-[13px] font-semibold">Product pages (AR)</h2>
            <label className="block">
              <span className={FIELD_LABEL}>Product tag</span>
              <input className="input w-full" value={arTag} onChange={e => setArTag(e.target.value)} placeholder="AR" />
            </label>
            <label className="block">
              <span className={FIELD_LABEL}>Button text</span>
              <input className="input w-full" value={arText} onChange={e => setArText(e.target.value)} placeholder="View on your wall" />
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-[12px]">
                <input type="color" value={arBg} onChange={e => setArBg(e.target.value)} className="w-10 h-9 border border-line rounded" />
                Background
              </label>
              <label className="flex items-center gap-2 text-[12px]">
                <input type="color" value={arFg} onChange={e => setArFg(e.target.value)} className="w-10 h-9 border border-line rounded" />
                Text
              </label>
            </div>
          </div>
          <SnippetBox snippet={productSnippet}>
            Squarespace: Settings → Advanced → Code Injection → Footer (Core plan or higher). Tag products with the tag
            above. Each product&apos;s SKU must match the artwork&apos;s Squarespace SKU in ArtPiq.
          </SnippetBox>
        </section>
      </main>
    </div>
  )
}
