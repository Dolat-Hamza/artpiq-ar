'use client'
import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { useAuth } from '@/lib/db/auth'
import { createDeal, deleteDeal, listDeals, updateDeal } from '@/lib/db/crm'
import { listMyArtworks } from '@/lib/db/artworks'
import {
  addDealArtwork,
  computeDealTotals,
  deleteDealArtwork,
  listDealArtworks,
  updateDealArtwork,
} from '@/lib/db/dealArtworks'
import type { Artwork, Deal, DealArtwork, DealLineMode, DealLineStatus, DealStage } from '@/types'
import LoginForm from './LoginForm'
import AdminPageHeader from './ui/AdminPageHeader'
import { useConfirm } from './ui/ConfirmDialog'
import { useToast } from './ui/toast'

const STAGES: DealStage[] = ['enquiry', 'qualified', 'proposal', 'negotiation', 'reserved', 'won', 'lost']
const STAGE_COLOR: Record<DealStage, string> = {
  enquiry: 'bg-line text-ink-muted',
  qualified: 'bg-blue-100 text-blue-700',
  proposal: 'bg-amber-100 text-amber-700',
  negotiation: 'bg-orange-100 text-orange-700',
  reserved: 'bg-indigo-100 text-indigo-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
}

export default function DealsAdmin() {
  const { user, loading } = useAuth()
  const [list, setList] = useState<Deal[]>([])
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [adding, setAdding] = useState<false | DealStage>(false)
  const [editing, setEditing] = useState<Deal | null>(null)
  const confirm = useConfirm()
  const toast = useToast()
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null)

  function onDragStart(e: React.DragEvent, d: Deal) {
    setDragId(d.id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', d.id)
  }
  function onDragOver(e: React.DragEvent, stage: DealStage) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverStage !== stage) setDragOverStage(stage)
  }
  function onDragLeave() {
    setDragOverStage(null)
  }
  async function onDrop(e: React.DragEvent, stage: DealStage) {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain') || dragId
    setDragId(null)
    setDragOverStage(null)
    if (!id) return
    const d = list.find(x => x.id === id)
    if (!d || d.stage === stage) return
    // Optimistic
    setList(prev => prev.map(x => x.id === id ? { ...x, stage } : x))
    try {
      await updateDeal(id, { stage })
      toast.success(`Moved to ${stage}`)
    } catch {
      toast.error('Move failed')
      refresh()
    }
  }

  useEffect(() => {
    if (!user) return
    refresh()
    listMyArtworks(user.id).then(setArtworks).catch(() => {})
  }, [user])
  async function refresh() { if (user) setList(await listDeals(user.id)) }

  async function rm(id: string) {
    const ok = await confirm({
      title: 'Delete deal?',
      description: 'Linked activities will be removed too. Cannot be undone.',
      destructive: true,
      confirmLabel: 'Delete',
    })
    if (!ok) return
    await deleteDeal(id)
    toast.success('Deal deleted')
    refresh()
  }

  if (loading) return <div className="p-8 text-body text-ink-muted">Loading…</div>
  if (!user) return <div className="min-h-dvh flex items-center justify-center p-6"><LoginForm /></div>

  const totalValue = list
    .filter(d => d.stage !== 'lost')
    .reduce((s, d) => s + (d.amount ?? 0), 0)

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <AdminPageHeader
        title="Deals"
        actions={
          <>
            <div className="hidden md:inline-flex items-center gap-1 mr-2">
              {(['kanban', 'list'] as const).map(v => (
                <button key={v} onClick={() => setView(v)} data-active={view === v} className="ap-nav !rounded-md !py-1.5 !px-3 text-meta uppercase tracking-[0.14em]">
                  {v}
                </button>
              ))}
            </div>
            <button data-tour="new-deal" onClick={() => setAdding('enquiry')} className="btn-primary">
              <Plus size={14} strokeWidth={2.5} /> New deal
            </button>
          </>
        }
        subBar={
          <>
            <span>Total: <span className="text-ink font-bold">{list.length}</span></span>
            <span className="text-ink-muted">·</span>
            <span>Pipeline value: <span className="text-ink font-bold">€ {totalValue.toLocaleString()}</span></span>
          </>
        }
      />
      <main className="px-6 md:px-10 py-6">
        {view === 'kanban' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {STAGES.map(stage => {
              const col = list.filter(d => d.stage === stage)
              const sum = col.reduce((s, d) => s + (d.amount ?? 0), 0)
              const isOver = dragOverStage === stage
              return (
                <section
                  key={stage}
                  onDragOver={e => onDragOver(e, stage)}
                  onDragLeave={onDragLeave}
                  onDrop={e => onDrop(e, stage)}
                  className={`bg-paper border rounded-md p-3 min-h-[200px] transition-colors ${
                    isOver ? 'border-accent bg-accent-soft' : 'border-line'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-display text-meta uppercase tracking-[0.14em]">{stage}</p>
                    <span className="text-meta tracking-[0.14em] text-ink-muted">{col.length}</span>
                  </div>
                  {sum > 0 && <p className="text-meta text-ink-muted mb-2">€ {sum.toLocaleString()}</p>}
                  <div className="flex flex-col gap-2">
                    {col.map(d => {
                    const linked = artworks.filter(a => (d.artworkIds ?? []).includes(a.id))
                    const isDragging = dragId === d.id
                    return (
                      <article
                        key={d.id}
                        draggable
                        onDragStart={e => onDragStart(e, d)}
                        onDragEnd={() => { setDragId(null); setDragOverStage(null) }}
                        className={`border border-line rounded-sm p-2 bg-paper cursor-grab active:cursor-grabbing hover:border-ink hover:shadow-sm transition-all ${
                          isDragging ? 'opacity-40' : ''
                        }`}
                        onClick={() => setEditing(d)}
                      >
                        <p className="text-body font-bold truncate">{d.title}</p>
                        <div className="flex items-center justify-between mt-1 gap-2">
                          {d.amount ? (
                            <p className="text-meta text-ink font-bold">€ {d.amount.toLocaleString()}</p>
                          ) : <span />}
                          {typeof d.probability === 'number' && (
                            <span className="text-[10px] text-ink-muted">{d.probability}%</span>
                          )}
                        </div>
                        {linked.length > 0 && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {linked.slice(0, 3).map(a => (
                              <span key={a.id} className="text-[10px] text-ink-muted border border-line/60 px-1 rounded-xs truncate max-w-[80px]">
                                {a.title}
                              </span>
                            ))}
                            {linked.length > 3 && <span className="text-meta text-ink-muted">+{linked.length - 3}</span>}
                          </div>
                        )}
                      </article>
                    )
                  })}
                  </div>
                  <button
                    onClick={() => setAdding(stage)}
                    className="mt-2 w-full inline-flex items-center justify-center gap-1 text-meta uppercase tracking-[0.14em] text-ink-muted hover:text-ink py-1.5 border border-dashed border-line rounded-sm hover:border-ink transition-colors"
                    title={`Add deal in ${stage}`}
                  >
                    <Plus size={11} /> Add
                  </button>
                </section>
              )
            })}
          </div>
        ) : (
          <div className="bg-paper border border-line rounded-md overflow-hidden">
            <table className="w-full text-body">
              <thead className="border-b border-line bg-bg text-meta uppercase tracking-[0.14em] text-ink-muted">
                <tr>
                  <th className="text-left py-2 px-3">Title</th>
                  <th className="text-left py-2 px-3">Stage</th>
                  <th className="text-left py-2 px-3">Amount</th>
                  <th className="text-left py-2 px-3">Probability</th>
                  <th className="text-left py-2 px-3">Close date</th>
                  <th className="text-right py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {list.map(d => (
                  <tr key={d.id} className="border-b border-line/60 hover:bg-bg">
                    <td className="py-2 px-3 font-bold">{d.title}</td>
                    <td className="py-2 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded-xs text-meta tracking-[0.14em] uppercase ${STAGE_COLOR[d.stage]}`}>
                        {d.stage}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-ink-muted">{d.amount ? `€ ${d.amount.toLocaleString()}` : '—'}</td>
                    <td className="py-2 px-3 text-ink-muted">{d.probability ?? '—'}%</td>
                    <td className="py-2 px-3 text-ink-muted text-[11px]">{d.expectedCloseDate || '—'}</td>
                    <td className="py-2 px-3 text-right">
                      <button onClick={() => rm(d.id)} className="text-red-600 hover:text-red-700"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
      {adding && <AddDealModal ownerId={user.id} initialStage={adding} onCancel={() => setAdding(false)} onSaved={() => { setAdding(false); refresh() }} />}
      {editing && (
        <DealEditModal
          deal={editing}
          allArtworks={artworks}
          onClose={() => { setEditing(null); refresh() }}
        />
      )}
    </div>
  )
}

function AddDealModal({
  ownerId,
  initialStage,
  onCancel,
  onSaved,
}: {
  ownerId: string
  initialStage?: DealStage
  onCancel: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState('')
  const [stage, setStage] = useState<DealStage>(initialStage ?? 'enquiry')
  const [amount, setAmount] = useState('')
  const [probability, setProbability] = useState(50)
  const [expectedCloseDate, setExpectedCloseDate] = useState('')
  const [busy, setBusy] = useState(false)
  async function save() {
    setBusy(true)
    try {
      await createDeal({
        ownerId,
        title,
        stage,
        amount: amount ? Number(amount) : null,
        probability,
        expectedCloseDate: expectedCloseDate || null,
        currency: 'EUR',
      })
      onSaved()
    } finally { setBusy(false) }
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={onCancel}>
      <div className="bg-paper rounded-md shadow-pop p-6 w-full max-w-[480px]" onClick={e => e.stopPropagation()}>
        <h2 className="font-display text-[14px] tracking-[0.18em] uppercase mb-4">New deal</h2>
        <div className="grid gap-3">
          <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="input" />
          <select value={stage} onChange={e => setStage(e.target.value as DealStage)} className="input">
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input placeholder="Amount (€)" value={amount} onChange={e => setAmount(e.target.value)} inputMode="numeric" className="input" />
          <input type="range" min={0} max={100} step={5} value={probability} onChange={e => setProbability(Number(e.target.value))} />
          <p className="text-meta text-ink-muted">Probability: {probability}%</p>
          <input type="date" value={expectedCloseDate} onChange={e => setExpectedCloseDate(e.target.value)} className="input" />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={onCancel} className="btn-outline">Cancel</button>
            <button onClick={save} disabled={!title || busy} className="btn-primary disabled:opacity-40">Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DealEditModal({
  deal,
  allArtworks,
  onClose,
}: {
  deal: Deal
  allArtworks: Artwork[]
  onClose: () => void
}) {
  const [d, setD] = useState<Deal>(deal)
  const [busy, setBusy] = useState(false)
  const [artworkSearch, setArtworkSearch] = useState('')
  const [lines, setLines] = useState<DealArtwork[]>([])
  const [pickerOpen, setPickerOpen] = useState<'out' | 'swap_in' | null>(null)

  const artworkById = useMemo(() => {
    const m = new Map<string, Artwork>()
    for (const a of allArtworks) m.set(a.id, a)
    return m
  }, [allArtworks])

  useEffect(() => {
    listDealArtworks(deal.id).then(setLines).catch(() => {})
  }, [deal.id])

  const filteredArtworks = artworkSearch.trim()
    ? allArtworks.filter(a => [a.title, a.artist].join(' ').toLowerCase().includes(artworkSearch.toLowerCase()))
    : allArtworks

  const totals = useMemo(() => {
    const byId = new Map<string, { costBasis?: number | null }>()
    for (const [id, a] of artworkById) byId.set(id, { costBasis: a.costBasis ?? null })
    return computeDealTotals(lines, byId)
  }, [lines, artworkById])

  async function save() {
    setBusy(true)
    try {
      await updateDeal(d.id, { ...d, amount: totals.grossOut || d.amount })
      onClose()
    } finally { setBusy(false) }
  }

  async function addLine(artworkId: string, direction: 'out' | 'swap_in') {
    const a = artworkById.get(artworkId)
    if (!a) return
    const created = await addDealArtwork({
      dealId: deal.id,
      artworkId,
      direction,
      mode: 'sale',
      listPrice: a.price ?? null,
      offerPrice: a.price ?? null,
      commissionPct: a.commissionPct ?? 30,
    })
    setLines(prev => [...prev, created])
    setPickerOpen(null)
    setArtworkSearch('')
  }

  async function patchLine(id: string, patch: Partial<DealArtwork>) {
    setLines(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))
    await updateDealArtwork(id, patch).catch(() => {})
  }

  async function removeLine(id: string) {
    setLines(prev => prev.filter(l => l.id !== id))
    await deleteDealArtwork(id).catch(() => {})
  }

  const outLines = lines.filter(l => l.direction === 'out')
  const swapLines = lines.filter(l => l.direction === 'swap_in')

  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4 md:p-8" onClick={onClose}>
      <div className="w-full max-w-[1080px] max-h-[92vh] overflow-y-auto bg-paper rounded-md shadow-pop" onClick={e => e.stopPropagation()}>
        <header className="sticky top-0 z-10 bg-paper border-b border-line px-6 h-14 flex items-center gap-3">
          <h2 className="font-display text-[14px] tracking-[0.18em] uppercase">Deal</h2>
          <span className={`pill ${STAGE_COLOR[d.stage] ?? 'pill-sold'}`}>{d.stage}</span>
          <div className="ml-auto flex gap-2">
            <button onClick={onClose} className="btn-outline"><X size={13} /> Close</button>
            <button onClick={save} disabled={busy} className="btn-primary disabled:opacity-40">Save</button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-0">
          {/* Main column */}
          <div className="px-6 py-5 grid gap-4 border-r border-line">
            <input value={d.title} onChange={e => setD(x => ({ ...x, title: e.target.value }))} className="input font-display text-[16px]" placeholder="Deal title" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-meta uppercase tracking-[0.14em] text-ink-muted mb-1">Stage</label>
                <select value={d.stage} onChange={e => setD(x => ({ ...x, stage: e.target.value as DealStage }))} className="input">
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-meta uppercase tracking-[0.14em] text-ink-muted mb-1">Expected close</label>
                <input type="date" value={d.expectedCloseDate ?? ''} onChange={e => setD(x => ({ ...x, expectedCloseDate: e.target.value || null }))} className="input" />
              </div>
              <div className="col-span-2">
                <label className="block text-meta uppercase tracking-[0.14em] text-ink-muted mb-1">Probability: {d.probability ?? 50}%</label>
                <input type="range" min={0} max={100} step={5} value={d.probability ?? 50} onChange={e => setD(x => ({ ...x, probability: Number(e.target.value) }))} className="w-full" />
              </div>
            </div>
            <div>
              <label className="block text-meta uppercase tracking-[0.14em] text-ink-muted mb-1">Notes</label>
              <textarea value={d.notes ?? ''} onChange={e => setD(x => ({ ...x, notes: e.target.value }))} rows={2} className="input" />
            </div>

            {/* Sold lines (artworks going out) */}
            <DealLineSection
              title="Artworks for sale / rent"
              subtitle="Items the buyer receives"
              lines={outLines}
              artworkById={artworkById}
              onPatch={patchLine}
              onRemove={removeLine}
              onAdd={() => setPickerOpen('out')}
            />

            {/* Swap lines (artworks coming back) */}
            <DealLineSection
              title="Swap / part-exchange"
              subtitle="Artworks the buyer offers in trade — reduces their cash due"
              lines={swapLines}
              artworkById={artworkById}
              onPatch={patchLine}
              onRemove={removeLine}
              onAdd={() => setPickerOpen('swap_in')}
              isSwap
            />

            {/* Artwork picker — modal-in-modal */}
            {pickerOpen && (
              <div className="fixed inset-0 z-[60] bg-black/40 grid place-items-center p-4" onClick={() => setPickerOpen(null)}>
                <div className="w-full max-w-[520px] bg-paper rounded-md shadow-pop max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                  <header className="px-4 h-12 flex items-center border-b border-line gap-2">
                    <h3 className="font-display text-[13px] tracking-[0.16em] uppercase">
                      {pickerOpen === 'out' ? 'Add sale/rent line' : 'Add swap-in line'}
                    </h3>
                    <button onClick={() => setPickerOpen(null)} className="ml-auto text-ink-muted hover:text-ink">
                      <X size={14} />
                    </button>
                  </header>
                  <input
                    autoFocus
                    value={artworkSearch}
                    onChange={e => setArtworkSearch(e.target.value)}
                    placeholder="Search artworks…"
                    className="input !rounded-none !border-0 border-b border-line"
                  />
                  <div className="flex-1 overflow-y-auto">
                    {filteredArtworks.slice(0, 60).map(a => (
                      <button
                        key={a.id}
                        onClick={() => addLine(a.id, pickerOpen)}
                        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-bg border-b border-line/60"
                      >
                        {a.thumb && <img src={a.thumb} alt="" className="w-10 h-10 object-cover rounded-xs shrink-0" />}
                        <span className="flex-1 min-w-0">
                          <span className="text-body font-bold truncate block">{a.title}</span>
                          <span className="text-meta text-ink-muted truncate block">
                            {a.artist}{a.price != null ? ` · ${a.currency || 'EUR'} ${a.price.toLocaleString()}` : ''}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Totals sidebar */}
          <aside className="p-5 bg-bg/40 grid gap-3 content-start">
            <p className="text-meta uppercase tracking-[0.14em] text-ink-muted font-bold">Deal totals</p>

            <TotalRow label="Gross out (sale/rent total)" value={totals.grossOut} />
            {totals.swapInValue > 0 && (
              <TotalRow label="Swap-in value (offsetting)" value={-totals.swapInValue} muted />
            )}
            <div className="border-t border-line pt-2">
              <TotalRow label="Buyer pays (cash)" value={totals.buyerNet} highlight />
            </div>

            <div className="border-t border-line pt-3">
              <TotalRow label="Commission" value={totals.commission} muted />
              <TotalRow label="Cost basis" value={totals.costBasis} muted />
              <TotalRow label="Swap value cost" value={totals.swapInValue} muted />
            </div>
            <div className="border-t border-line pt-2">
              <TotalRow
                label="Net profit"
                value={totals.netProfit}
                highlight
                color={totals.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}
              />
              <p className="text-meta text-ink-muted mt-1">
                Margin: <span className="font-bold">{totals.marginPct.toFixed(1)}%</span>
              </p>
            </div>

            <div className="border-t border-line pt-3">
              <p className="text-meta uppercase tracking-[0.12em] text-ink-muted mb-1">Line statuses</p>
              <div className="grid gap-1 text-meta">
                {(['pending', 'offered', 'countered', 'agreed', 'declined', 'completed'] as const).map(s => {
                  const count = lines.filter(l => l.lineStatus === s).length
                  if (count === 0) return null
                  return (
                    <div key={s} className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${LINE_STATUS_DOT[s]}`} />
                      <span className="capitalize">{s}</span>
                      <span className="ml-auto text-ink-muted">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

const LINE_STATUS_DOT: Record<DealLineStatus, string> = {
  pending: 'bg-line',
  offered: 'bg-blue-400',
  countered: 'bg-amber-400',
  agreed: 'bg-emerald-500',
  declined: 'bg-red-500',
  completed: 'bg-green-700',
}

function TotalRow({
  label, value, muted, highlight, color,
}: { label: string; value: number; muted?: boolean; highlight?: boolean; color?: string }) {
  return (
    <div className={`flex items-baseline justify-between ${muted ? 'opacity-70' : ''}`}>
      <span className="text-meta tracking-[0.12em] uppercase text-ink-muted">{label}</span>
      <span className={`tabular-nums ${highlight ? 'text-[15px] font-bold' : 'text-body'} ${color ?? ''}`}>
        € {value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </span>
    </div>
  )
}

function DealLineSection({
  title, subtitle, lines, artworkById, onPatch, onRemove, onAdd, isSwap,
}: {
  title: string
  subtitle: string
  lines: DealArtwork[]
  artworkById: Map<string, Artwork>
  onPatch: (id: string, p: Partial<DealArtwork>) => void
  onRemove: (id: string) => void
  onAdd: () => void
  isSwap?: boolean
}) {
  return (
    <div className="border border-line rounded-md p-4">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <p className="text-meta uppercase tracking-[0.14em] text-ink-muted font-bold">{title}</p>
          <p className="text-meta text-ink-muted">{subtitle}</p>
        </div>
        <button onClick={onAdd} className="btn-outline !h-8 text-meta">
          + Add artwork
        </button>
      </div>
      {lines.length === 0 ? (
        <p className="text-body text-ink-muted text-center py-3">No artworks yet.</p>
      ) : (
        <div className="grid gap-2">
          {lines.map(l => {
            const a = artworkById.get(l.artworkId)
            if (!a) return null
            return (
              <div key={l.id} className="border border-line/60 rounded-sm p-3 bg-bg/40">
                <div className="flex items-start gap-3 mb-2">
                  {a.thumb && <img src={a.thumb} alt="" className="w-12 h-12 object-cover rounded-xs shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-bold truncate">{a.title}</p>
                    <p className="text-meta text-ink-muted truncate">{a.artist}{a.price != null ? ` · list € ${a.price.toLocaleString()}` : ''}</p>
                  </div>
                  <select
                    value={l.lineStatus}
                    onChange={e => onPatch(l.id, { lineStatus: e.target.value as DealLineStatus })}
                    className="text-meta tracking-[0.12em] uppercase border border-line rounded-xs bg-paper px-1.5 py-0.5"
                  >
                    {(['pending', 'offered', 'countered', 'agreed', 'declined', 'completed'] as const).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button onClick={() => onRemove(l.id)} className="text-red-600 hover:text-red-700">
                    <Trash2 size={13} />
                  </button>
                </div>
                {isSwap ? (
                  <div>
                    <label className="block text-meta uppercase tracking-[0.14em] text-ink-muted mb-1">Swap value (€)</label>
                    <input
                      type="number"
                      value={l.swapValue ?? ''}
                      onChange={e => onPatch(l.id, { swapValue: e.target.value ? Number(e.target.value) : null })}
                      className="input !h-8"
                      placeholder="What's it worth in the deal?"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <div className="md:col-span-1">
                      <label className="block text-[9px] tracking-[0.14em] uppercase text-ink-muted mb-0.5">Mode</label>
                      <select
                        value={l.mode}
                        onChange={e => onPatch(l.id, { mode: e.target.value as DealLineMode })}
                        className="input !h-8 !px-1.5 text-[11px]"
                      >
                        <option value="sale">Sale</option>
                        <option value="rent">Rent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] tracking-[0.14em] uppercase text-ink-muted mb-0.5">Offer (€)</label>
                      <input
                        type="number"
                        value={l.offerPrice ?? ''}
                        onChange={e => onPatch(l.id, { offerPrice: e.target.value ? Number(e.target.value) : null })}
                        className="input !h-8 !px-1.5 text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] tracking-[0.14em] uppercase text-ink-muted mb-0.5">Counter (€)</label>
                      <input
                        type="number"
                        value={l.counterOffer ?? ''}
                        onChange={e => onPatch(l.id, { counterOffer: e.target.value ? Number(e.target.value) : null })}
                        className="input !h-8 !px-1.5 text-[11px]"
                        placeholder="from buyer"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] tracking-[0.14em] uppercase text-ink-muted mb-0.5">Agreed (€)</label>
                      <input
                        type="number"
                        value={l.agreedPrice ?? ''}
                        onChange={e => onPatch(l.id, { agreedPrice: e.target.value ? Number(e.target.value) : null })}
                        className="input !h-8 !px-1.5 text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] tracking-[0.14em] uppercase text-ink-muted mb-0.5">Comm %</label>
                      <input
                        type="number"
                        value={l.commissionPct ?? ''}
                        onChange={e => onPatch(l.id, { commissionPct: e.target.value ? Number(e.target.value) : null })}
                        className="input !h-8 !px-1.5 text-[11px]"
                      />
                    </div>
                    {l.mode === 'rent' && (
                      <>
                        <div>
                          <label className="block text-[9px] tracking-[0.14em] uppercase text-ink-muted mb-0.5">Term (mo)</label>
                          <input
                            type="number"
                            value={l.rentTermMonths ?? ''}
                            onChange={e => onPatch(l.id, { rentTermMonths: e.target.value ? Number(e.target.value) : null })}
                            className="input !h-8 !px-1.5 text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] tracking-[0.14em] uppercase text-ink-muted mb-0.5">€/month</label>
                          <input
                            type="number"
                            value={l.rentMonthly ?? ''}
                            onChange={e => onPatch(l.id, { rentMonthly: e.target.value ? Number(e.target.value) : null })}
                            className="input !h-8 !px-1.5 text-[11px]"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

