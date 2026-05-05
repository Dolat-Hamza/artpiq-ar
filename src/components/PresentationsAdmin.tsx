'use client'
import { useEffect, useState } from 'react'
import { Check, Download, FileText, LayoutGrid, List, Loader, Search } from 'lucide-react'
import { useAuth } from '@/lib/db/auth'
import { listMyArtworks } from '@/lib/db/artworks'
import { exportPresentation, type PresentationLayout } from '@/lib/artworkSheet'
import type { Artwork } from '@/types'
import LoginForm from './LoginForm'
import AdminPageHeader from './ui/AdminPageHeader'

const LAYOUTS: { id: PresentationLayout; label: string; desc: string; noPrice?: boolean }[] = [
  {
    id: 'portfolio',
    label: 'Portfolio',
    desc: 'Landscape. Large image, title and artist. No price.',
    noPrice: true,
  },
  {
    id: 'catalogue',
    label: 'Catalogue',
    desc: 'Grid cover + one page per artwork with price.',
  },
  {
    id: 'price-list',
    label: 'Price list',
    desc: 'Compact table — thumbnail, medium, dims, price.',
  },
  {
    id: 'press-kit',
    label: 'Press kit',
    desc: 'Full description per artwork. No price.',
    noPrice: true,
  },
]

export default function PresentationsAdmin() {
  const { user, loading } = useAuth()
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [layout, setLayout] = useState<PresentationLayout>('catalogue')
  const [showPrice, setShowPrice] = useState(true)
  const [title, setTitle] = useState('artpiq')
  const [exporting, setExporting] = useState(false)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    setBusy(true)
    listMyArtworks(user.id).then(setArtworks).catch(() => {}).finally(() => setBusy(false))
  }, [user])

  if (loading) return <div className="p-8 text-body text-ink-muted">Loading…</div>
  if (!user) return <div className="min-h-dvh flex items-center justify-center p-6"><LoginForm /></div>

  const filtered = search.trim()
    ? artworks.filter(a =>
        [a.title, a.artist, a.medium].join(' ').toLowerCase().includes(search.toLowerCase())
      )
    : artworks

  const selectedArtworks = artworks.filter(a => selected.has(a.id))
  const activeLayout = LAYOUTS.find(l => l.id === layout)!

  async function generate() {
    if (!selected.size || exporting) return
    setExporting(true)
    try {
      await exportPresentation({ title, artworks: selectedArtworks, showPrice, layout })
    } finally {
      setExporting(false)
    }
  }

  function toggle(id: string) {
    const n = new Set(selected)
    if (n.has(id)) n.delete(id); else n.add(id)
    setSelected(n)
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(a => a.id)))
  }

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <AdminPageHeader
        title="Presentations"
        subBar={
          <>
            <span className="text-ink-muted">Select artworks → choose layout → download PDF</span>
            {selected.size > 0 && (
              <>
                <span className="text-ink-muted">·</span>
                <span><span className="text-ink font-bold">{selected.size}</span> selected</span>
              </>
            )}
          </>
        }
      />

      <div className="flex gap-0">
        {/* ── Main artwork picker ── */}
        <section className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="px-6 md:px-10 py-3 bg-paper border-b border-line flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search artworks…"
                className="input !pl-9"
              />
            </div>
            <button
              onClick={toggleAll}
              className="btn-outline !h-9"
            >
              {selected.size === filtered.length && filtered.length > 0 ? 'Clear' : 'All'}
            </button>
            <span className="text-meta text-ink-muted">{filtered.length}</span>
            <div className="ml-auto flex gap-1">
              {(['grid', 'list'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  data-active={view === v}
                  className="ap-nav !rounded-md !py-1.5 !px-2"
                >
                  {v === 'grid' ? <LayoutGrid size={14} /> : <List size={14} />}
                </button>
              ))}
            </div>
          </div>

          {/* Grid / List */}
          <div className="px-6 md:px-10 py-6">
            {busy && (
              <div className="py-20 flex items-center justify-center gap-2 text-body text-ink-muted">
                <Loader size={16} className="animate-spin" /> Loading artworks…
              </div>
            )}
            {!busy && !filtered.length && (
              <p className="text-body text-ink-muted text-center py-20">No artworks found.</p>
            )}

            {view === 'grid' && !busy && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-6">
                {filtered.map(a => {
                  const on = selected.has(a.id)
                  return (
                    <div key={a.id} className="relative cursor-pointer group" onClick={() => toggle(a.id)}>
                      {/* Artwork image */}
                      <div className={`aspect-[4/5] overflow-hidden border-2 transition-all duration-150 ${
                        on ? 'border-accent' : 'border-transparent group-hover:border-line'
                      }`}>
                        {a.thumb ? (
                          <img src={a.thumb} alt={a.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-line/40 grid place-items-center">
                            <FileText size={28} className="text-ink-muted/30" />
                          </div>
                        )}
                        {/* Overlay when selected */}
                        {on && (
                          <div className="absolute inset-0 bg-accent/10 pointer-events-none" />
                        )}
                      </div>
                      {/* Checkbox badge */}
                      <div className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        on
                          ? 'bg-accent border-accent text-paper'
                          : 'bg-paper/80 border-line group-hover:border-ink-muted'
                      }`}>
                        {on && <Check size={12} strokeWidth={3} />}
                      </div>
                      {/* Title */}
                      <p className="mt-2 text-body font-bold truncate">{a.title}</p>
                      <p className="text-meta text-ink-muted truncate">{a.artist}</p>
                    </div>
                  )
                })}
              </div>
            )}

            {view === 'list' && !busy && (
              <div className="bg-paper border border-line rounded-md overflow-hidden">
                <table className="w-full text-body">
                  <thead className="border-b border-line bg-bg text-meta uppercase tracking-[0.14em] text-ink-muted">
                    <tr>
                      <th className="w-8 text-left py-2 px-3">
                        <input
                          type="checkbox"
                          checked={selected.size === filtered.length && filtered.length > 0}
                          onChange={toggleAll}
                          className="accent-accent"
                        />
                      </th>
                      <th className="text-left py-2 px-3">Title</th>
                      <th className="text-left py-2 px-3 hidden md:table-cell">Artist</th>
                      <th className="text-left py-2 px-3 hidden lg:table-cell">Medium</th>
                      <th className="text-left py-2 px-3 hidden lg:table-cell">Dimensions</th>
                      <th className="text-right py-2 px-3 hidden md:table-cell">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(a => {
                      const on = selected.has(a.id)
                      return (
                        <tr
                          key={a.id}
                          className={`border-b border-line/60 cursor-pointer ${on ? 'bg-accent-soft' : 'hover:bg-bg'}`}
                          onClick={() => toggle(a.id)}
                        >
                          <td className="py-2 px-3" onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={on} onChange={() => toggle(a.id)} className="accent-accent" />
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              {a.thumb && <img src={a.thumb} alt="" className="w-8 h-10 object-cover rounded-xs shrink-0" />}
                              <span className="font-bold truncate">{a.title}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-ink-muted hidden md:table-cell">{a.artist}</td>
                          <td className="py-2 px-3 text-ink-muted hidden lg:table-cell">{a.medium || '—'}</td>
                          <td className="py-2 px-3 text-ink-muted text-[11px] hidden lg:table-cell">{a.widthCm} × {a.heightCm} cm</td>
                          <td className="py-2 px-3 text-right text-ink-muted hidden md:table-cell">
                            {a.price != null ? `${a.currency || 'EUR'} ${a.price.toLocaleString()}` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* ── Options sidebar (fixed right) ── */}
        <aside className="hidden lg:flex flex-col w-[280px] shrink-0 border-l border-line bg-paper min-h-screen sticky top-[128px] h-[calc(100vh-128px)] overflow-y-auto">
          <div className="p-5 flex flex-col gap-5 flex-1">
            {/* Title */}
            <div>
              <label className="block text-meta uppercase tracking-[0.14em] text-ink-muted mb-1.5">Title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="input"
                placeholder="Gallery / artist name"
              />
            </div>

            {/* Layout */}
            <div>
              <p className="text-meta uppercase tracking-[0.14em] text-ink-muted mb-2">Layout</p>
              <div className="grid gap-2">
                {LAYOUTS.map(l => (
                  <button
                    key={l.id}
                    onClick={() => setLayout(l.id)}
                    className={`text-left border rounded-md p-3 transition-all ${
                      layout === l.id ? 'border-accent bg-accent-soft' : 'border-line hover:border-ink'
                    }`}
                  >
                    <p className={`text-body font-bold ${layout === l.id ? 'text-accent' : ''}`}>{l.label}</p>
                    <p className="text-meta text-ink-muted mt-0.5 leading-relaxed">{l.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Price toggle — not shown for press-kit / portfolio */}
            {!activeLayout.noPrice && (
              <div>
                <p className="text-meta uppercase tracking-[0.14em] text-ink-muted mb-2">Options</p>
                <label className="flex items-center gap-2 text-body cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={e => setShowPrice(e.target.checked)}
                    className="accent-accent w-4 h-4"
                  />
                  Show price in PDF
                </label>
              </div>
            )}

            {/* Selection summary */}
            {selected.size > 0 && (
              <div className="border-t border-line pt-4">
                <p className="text-meta uppercase tracking-[0.14em] text-ink-muted mb-2">
                  {selected.size} artwork{selected.size > 1 ? 's' : ''} selected
                </p>
                <div className="flex flex-wrap gap-1">
                  {selectedArtworks.slice(0, 5).map(a => (
                    <button
                      key={a.id}
                      onClick={() => toggle(a.id)}
                      className="text-meta bg-bg border border-line px-1.5 py-0.5 rounded-xs truncate max-w-[200px] hover:border-red-300 hover:text-red-600"
                      title={`Remove ${a.title}`}
                    >
                      {a.title}
                    </button>
                  ))}
                  {selected.size > 5 && (
                    <span className="text-meta text-ink-muted">+{selected.size - 5} more</span>
                  )}
                </div>
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Download button — pinned bottom */}
            <div className="border-t border-line pt-4">
              <button
                onClick={generate}
                disabled={!selected.size || exporting}
                className="btn-primary w-full disabled:opacity-40"
              >
                {exporting ? (
                  <><Loader size={14} className="animate-spin" /> Generating…</>
                ) : (
                  <><Download size={14} strokeWidth={2.5} /> {selected.size ? `${activeLayout.label} PDF (${selected.size})` : 'Select artworks'}</>
                )}
              </button>
              {exporting && (
                <p className="text-meta text-ink-muted text-center mt-2">
                  Fetching images… this may take a moment
                </p>
              )}
            </div>
          </div>
        </aside>

        {/* Mobile: bottom action bar */}
        {selected.size > 0 && (
          <div className="lg:hidden fixed bottom-14 inset-x-0 z-30 bg-paper border-t border-line px-6 py-3 flex items-center gap-3">
            <span className="text-body font-bold">{selected.size} selected</span>
            <select
              value={layout}
              onChange={e => setLayout(e.target.value as PresentationLayout)}
              className="input flex-1 !h-9"
            >
              {LAYOUTS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
            <button onClick={generate} disabled={exporting} className="btn-primary disabled:opacity-40">
              {exporting ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
