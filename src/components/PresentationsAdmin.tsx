'use client'
import { useEffect, useState } from 'react'
import { Download, FileText, LayoutGrid, List, Search } from 'lucide-react'
import { useAuth } from '@/lib/db/auth'
import { listMyArtworks } from '@/lib/db/artworks'
import { exportPresentation, type PresentationLayout } from '@/lib/artworkSheet'
import type { Artwork } from '@/types'
import LoginForm from './LoginForm'
import AdminPageHeader from './ui/AdminPageHeader'

const LAYOUTS: { id: PresentationLayout; label: string; desc: string }[] = [
  {
    id: 'portfolio',
    label: 'Portfolio',
    desc: 'Full-bleed landscape. Large image + artist details. No price. Ideal for gallery introductions.',
  },
  {
    id: 'catalogue',
    label: 'Catalogue',
    desc: 'Cover grid + individual artwork pages with price. Classic gallery catalogue format.',
  },
  {
    id: 'price-list',
    label: 'Price list',
    desc: 'Compact table with thumbnails, dimensions, medium, and price. Sales reference tool.',
  },
  {
    id: 'press-kit',
    label: 'Press kit',
    desc: 'Full artwork description + provenance details per page. No price. For press and institutions.',
  },
]

export default function PresentationsAdmin() {
  const { user, loading } = useAuth()
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [layout, setLayout] = useState<PresentationLayout>('catalogue')
  const [showPrice, setShowPrice] = useState(true)
  const [title, setTitle] = useState('My Collection')
  const [exporting, setExporting] = useState(false)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    setBusy(true)
    listMyArtworks(user.id)
      .then(setArtworks)
      .catch(() => {})
      .finally(() => setBusy(false))
  }, [user])

  if (loading) return <div className="p-8 text-body text-ink-muted">Loading…</div>
  if (!user) return <div className="min-h-dvh flex items-center justify-center p-6"><LoginForm /></div>

  const filtered = search.trim()
    ? artworks.filter(a =>
        [a.title, a.artist, a.medium, a.collection].join(' ').toLowerCase().includes(search.toLowerCase())
      )
    : artworks

  const selectedArtworks = artworks.filter(a => selected.has(a.id))

  async function generate() {
    if (!selected.size) return
    setExporting(true)
    try {
      await exportPresentation({
        title,
        artworks: selectedArtworks,
        showPrice,
        layout,
      })
    } finally {
      setExporting(false)
    }
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(a => a.id)))
    }
  }

  return (
    <div className="min-h-dvh bg-bg text-ink flex flex-col">
      <AdminPageHeader
        title="Presentations"
        actions={
          <>
            <div className="hidden md:inline-flex items-center gap-1 mr-2">
              {(['grid', 'list'] as const).map(v => (
                <button key={v} onClick={() => setView(v)} data-active={view === v} className="ap-nav !rounded-md !py-1.5 !px-3">
                  {v === 'grid' ? <LayoutGrid size={14} /> : <List size={14} />}
                </button>
              ))}
            </div>
            <button
              onClick={generate}
              disabled={!selected.size || exporting}
              className="btn-primary disabled:opacity-40"
            >
              <Download size={14} strokeWidth={2.5} />
              {exporting ? 'Generating…' : `Download PDF (${selected.size})`}
            </button>
          </>
        }
        subBar={
          <>
            <span>
              {selected.size > 0
                ? <><span className="text-ink font-bold">{selected.size}</span> selected</>
                : <span className="text-ink-muted">Select artworks below, then choose a layout</span>
              }
            </span>
          </>
        }
      />

      <div className="flex flex-col lg:flex-row flex-1 min-h-0 gap-0">
        {/* Artwork selector */}
        <section className="flex-1 min-w-0 flex flex-col">
          <div className="px-6 md:px-10 py-3 border-b border-line bg-paper flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search artworks…"
                className="input !pl-9"
              />
            </div>
            <button
              onClick={toggleAll}
              className="text-meta uppercase tracking-[0.14em] text-ink-muted hover:text-ink"
            >
              {selected.size === filtered.length && filtered.length > 0 ? 'Deselect all' : 'Select all'}
            </button>
            <span className="text-meta text-ink-muted">{filtered.length} artworks</span>
          </div>

          <div className="flex-1 overflow-y-auto px-6 md:px-10 py-4">
            {busy && <p className="text-body text-ink-muted text-center py-12">Loading…</p>}
            {!busy && !filtered.length && (
              <p className="text-body text-ink-muted text-center py-12">No artworks found.</p>
            )}
            {view === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 gap-y-6">
                {filtered.map(a => {
                  const isSelected = selected.has(a.id)
                  return (
                    <button
                      key={a.id}
                      onClick={() => {
                        const n = new Set(selected)
                        if (n.has(a.id)) n.delete(a.id); else n.add(a.id)
                        setSelected(n)
                      }}
                      className={`group text-left focus:outline-none`}
                    >
                      <div
                        className={`aspect-[4/5] overflow-hidden border-2 transition-all rounded-sm ${
                          isSelected ? 'border-accent' : 'border-transparent hover:border-line'
                        }`}
                      >
                        {a.thumb ? (
                          <img src={a.thumb} alt={a.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-line/40 grid place-items-center">
                            <FileText size={24} className="text-ink-muted/40" />
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 bg-accent/10" />
                        )}
                      </div>
                      <div className="mt-1.5 relative">
                        {isSelected && (
                          <span className="absolute -top-6 right-0 w-5 h-5 bg-accent text-paper rounded-full grid place-items-center text-[10px] font-bold">
                            ✓
                          </span>
                        )}
                        <p className="text-body font-bold truncate">{a.title}</p>
                        <p className="text-meta text-ink-muted truncate">{a.artist}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="bg-paper border border-line rounded-md overflow-hidden">
                <table className="w-full text-body">
                  <thead className="border-b border-line bg-bg text-meta uppercase tracking-[0.14em] text-ink-muted">
                    <tr>
                      <th className="w-8 text-left py-2 px-3">
                        <input
                          type="checkbox"
                          checked={selected.size === filtered.length && filtered.length > 0}
                          onChange={toggleAll}
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
                    {filtered.map(a => (
                      <tr
                        key={a.id}
                        className={`border-b border-line/60 cursor-pointer ${selected.has(a.id) ? 'bg-accent-soft' : 'hover:bg-bg'}`}
                        onClick={() => {
                          const n = new Set(selected)
                          if (n.has(a.id)) n.delete(a.id); else n.add(a.id)
                          setSelected(n)
                        }}
                      >
                        <td className="py-2 px-3" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(a.id)}
                            onChange={() => {
                              const n = new Set(selected)
                              if (n.has(a.id)) n.delete(a.id); else n.add(a.id)
                              setSelected(n)
                            }}
                          />
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Options panel */}
        <aside className="w-full lg:w-[320px] border-t lg:border-t-0 lg:border-l border-line bg-paper p-6 flex flex-col gap-5 lg:sticky lg:top-[128px] lg:self-start lg:max-h-[calc(100vh-128px)] lg:overflow-y-auto shrink-0">
          <div>
            <label className="block text-meta uppercase tracking-[0.14em] text-ink-muted mb-1">
              Presentation title
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="input"
              placeholder="Gallery name, artist name…"
            />
          </div>

          <div>
            <p className="text-meta uppercase tracking-[0.14em] text-ink-muted mb-3 font-bold">Layout</p>
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
                  <p className="text-meta text-ink-muted mt-0.5">{l.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {layout !== 'press-kit' && layout !== 'portfolio' && (
            <div>
              <p className="text-meta uppercase tracking-[0.14em] text-ink-muted mb-2 font-bold">Options</p>
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

          {selected.size > 0 && (
            <div className="border-t border-line pt-4">
              <p className="text-meta uppercase tracking-[0.14em] text-ink-muted mb-2 font-bold">
                Selected · {selected.size}
              </p>
              <div className="flex flex-wrap gap-1">
                {selectedArtworks.slice(0, 6).map(a => (
                  <span key={a.id} className="text-meta bg-bg border border-line px-1.5 py-0.5 rounded-xs truncate max-w-[140px]">
                    {a.title}
                  </span>
                ))}
                {selected.size > 6 && (
                  <span className="text-meta text-ink-muted">+{selected.size - 6} more</span>
                )}
              </div>
            </div>
          )}

          <button
            onClick={generate}
            disabled={!selected.size || exporting}
            className="btn-primary w-full disabled:opacity-40 mt-auto"
          >
            <Download size={14} strokeWidth={2.5} />
            {exporting ? 'Generating PDF…' : `Download ${layout} PDF`}
          </button>

          {!selected.size && (
            <p className="text-meta text-ink-muted text-center">Select at least one artwork</p>
          )}
        </aside>
      </div>
    </div>
  )
}
