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
    id: 'rental-proposal',
    label: 'Rental proposal',
    desc: '3 columns: 12 / 24 / 36 month monthly rental rates.',
    noPrice: true,
  },
  {
    id: 'press-kit',
    label: 'Press kit',
    desc: 'Full description per artwork. No price.',
    noPrice: true,
  },
]

// Generate a sensible default rental tier from the sale price.
// Rule of thumb in the art-rental market: monthly rate is ~1.5–2.5% of sale.
// Longer terms drop the rate.
function defaultRentalTiers(price: number | null | undefined): { rent12: number; rent24: number; rent36: number } | null {
  if (price == null || price <= 0) return null
  const round = (n: number) => Math.round(n / 5) * 5
  return {
    rent12: round(price * 0.022),
    rent24: round(price * 0.018),
    rent36: round(price * 0.015),
  }
}

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
  // Filters
  const [filterArtist, setFilterArtist] = useState<string>('all')
  const [filterMedium, setFilterMedium] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCollection, setFilterCollection] = useState<string>('all')
  // Per-artwork rental tiers (only used for rental-proposal layout)
  const [rentalTiers, setRentalTiers] = useState<Record<string, { rent12?: number | null; rent24?: number | null; rent36?: number | null }>>({})

  useEffect(() => {
    if (!user) return
    setBusy(true)
    listMyArtworks(user.id).then(setArtworks).catch(() => {}).finally(() => setBusy(false))
  }, [user])

  // Seed rental tiers when switching to rental-proposal layout (before early returns to keep hook order stable)
  useEffect(() => {
    if (layout !== 'rental-proposal') return
    setRentalTiers(prev => {
      const next = { ...prev }
      for (const id of selected) {
        const a = artworks.find(x => x.id === id)
        if (a && !next[a.id]) {
          const def = defaultRentalTiers(a.price)
          if (def) next[a.id] = def
        }
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, selected])

  if (loading) return <div className="p-8 text-body text-ink-muted">Loading…</div>
  if (!user) return <div className="min-h-dvh flex items-center justify-center p-6"><LoginForm /></div>

  // Build filter option lists
  const artistOptions = Array.from(new Set(artworks.map(a => a.artist).filter(Boolean))).sort() as string[]
  const mediumOptions = Array.from(new Set(artworks.map(a => a.medium).filter(Boolean))).sort() as string[]
  const collectionOptions = Array.from(new Set(artworks.map(a => a.collection).filter(Boolean))).sort() as string[]
  const statusOptions = Array.from(new Set(artworks.map(a => a.status).filter(Boolean))).sort() as string[]

  const filtered = artworks.filter(a => {
    if (search.trim()) {
      const hay = [a.title, a.artist, a.medium, a.collection].join(' ').toLowerCase()
      if (!hay.includes(search.toLowerCase())) return false
    }
    if (filterArtist !== 'all' && a.artist !== filterArtist) return false
    if (filterMedium !== 'all' && a.medium !== filterMedium) return false
    if (filterCollection !== 'all' && a.collection !== filterCollection) return false
    if (filterStatus !== 'all' && a.status !== filterStatus) return false
    return true
  })

  const selectedArtworks = artworks.filter(a => selected.has(a.id))
  const activeLayout = LAYOUTS.find(l => l.id === layout)!
  const hasFilters = filterArtist !== 'all' || filterMedium !== 'all' || filterCollection !== 'all' || filterStatus !== 'all'

  function setTier(id: string, key: 'rent12' | 'rent24' | 'rent36', value: number | null) {
    setRentalTiers(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } }))
  }

  function clearFilters() {
    setFilterArtist('all')
    setFilterMedium('all')
    setFilterCollection('all')
    setFilterStatus('all')
  }

  async function generate() {
    if (!selected.size || exporting) return
    setExporting(true)
    try {
      await exportPresentation({ title, artworks: selectedArtworks, showPrice, layout, rentalTiers })
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
          <div className="px-6 md:px-10 py-3 bg-paper border-b border-line flex items-center gap-2 flex-wrap">
            <div className="relative w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="input !pl-9"
              />
            </div>
            {/* Filters next to search */}
            <select value={filterArtist} onChange={e => setFilterArtist(e.target.value)} className="input !w-auto max-w-[140px]">
              <option value="all">All artists</option>
              {artistOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <select value={filterMedium} onChange={e => setFilterMedium(e.target.value)} className="input !w-auto max-w-[140px]">
              <option value="all">All mediums</option>
              {mediumOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <select value={filterCollection} onChange={e => setFilterCollection(e.target.value)} className="input !w-auto max-w-[140px]">
              <option value="all">All collections</option>
              {collectionOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input !w-auto max-w-[120px]">
              <option value="all">All statuses</option>
              {statusOptions.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
            </select>
            {hasFilters && (
              <button onClick={clearFilters} className="text-meta uppercase tracking-[0.14em] text-ink-muted underline hover:text-ink">
                Clear filters
              </button>
            )}
            <button
              onClick={toggleAll}
              className="btn-outline !h-9"
            >
              {selected.size === filtered.length && filtered.length > 0 ? 'None' : 'Select all'}
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

        {/* ── Options sidebar (fixed right, full-height with internal scroller) ── */}
        <aside className="hidden lg:flex flex-col w-[300px] shrink-0 border-l border-line bg-paper sticky top-[128px] h-[calc(100vh-128px)]">
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-5 grid gap-5">
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

            {/* Price toggle — not shown for press-kit / portfolio / rental */}
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

            {/* Rental tiers editor — only for rental-proposal layout */}
            {layout === 'rental-proposal' && selected.size > 0 && (
              <div>
                <p className="text-meta uppercase tracking-[0.14em] text-ink-muted mb-2">
                  Rental tiers (per month, €)
                </p>
                <p className="text-meta text-ink-muted mb-3">
                  Defaults seeded from sale price (~2.2% / 1.8% / 1.5%). Edit any cell to override.
                </p>
                <div className="grid gap-2 max-h-[360px] overflow-y-auto pr-1">
                  {selectedArtworks.map(a => {
                    const tier = rentalTiers[a.id] ?? {}
                    return (
                      <div key={a.id} className="border border-line rounded-sm p-2 bg-bg/50">
                        <p className="text-meta font-bold truncate mb-1.5">{a.title}</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(['rent12', 'rent24', 'rent36'] as const).map(k => (
                            <div key={k}>
                              <label className="block text-[9px] tracking-[0.14em] uppercase text-ink-muted mb-0.5">
                                {k === 'rent12' ? '12mo' : k === 'rent24' ? '24mo' : '36mo'}
                              </label>
                              <input
                                type="number"
                                value={tier[k] ?? ''}
                                onChange={e => setTier(a.id, k, e.target.value ? Number(e.target.value) : null)}
                                placeholder="—"
                                className="input !h-7 !px-1.5 text-[11px]"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Selection summary (hidden for rental-proposal since shown above with tier editor) */}
            {selected.size > 0 && layout !== 'rental-proposal' && (
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
          </div>
          {/* Pinned download button at bottom (outside scroller) */}
          <div className="border-t border-line bg-paper p-4 shrink-0">
            <button
              onClick={generate}
              disabled={!selected.size || exporting}
              className="btn-primary w-full disabled:opacity-40"
            >
              {exporting ? (
                <><Loader size={14} className="animate-spin" /> Generating…</>
              ) : (
                <><Download size={14} strokeWidth={2.5} /> {selected.size ? `${activeLayout.label} (${selected.size})` : 'Select artworks'}</>
              )}
            </button>
            {exporting && (
              <p className="text-meta text-ink-muted text-center mt-2">
                Fetching images…
              </p>
            )}
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
