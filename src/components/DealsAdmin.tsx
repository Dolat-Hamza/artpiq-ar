'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, ArrowUp, Building2, Check, MessageSquareQuote, Plus, Trash2, Undo2, User, X } from 'lucide-react'
import { useAuth } from '@/lib/db/auth'
import { createActivity, createDeal, deleteDeal, listActivities, listDeals, updateDeal } from '@/lib/db/crm'
import { listContacts } from '@/lib/db/contacts'
import { listMyArtworks } from '@/lib/db/artworks'
import {
  addDealArtwork,
  computeDealTotals,
  deleteDealArtwork,
  listDealArtworks,
  updateDealArtwork,
} from '@/lib/db/dealArtworks'
import type { Activity, ActivityType, Artwork, ArtworkOwnershipStatus, Contact, Deal, DealArtwork, DealLineMode, DealLineStatus, DealStage, OfferRound } from '@/types'
import LoginForm from './LoginForm'
import AdminPageHeader from './ui/AdminPageHeader'
import { useConfirm } from './ui/ConfirmDialog'
import { useToast } from './ui/toast'

const STAGES: DealStage[] = ['enquiry', 'qualified', 'proposal', 'negotiation', 'reserved', 'won', 'lost']
// Default probability per stage. Saves the user from sliding a range
// after every stage move; they can still override.
const STAGE_PROBABILITY: Record<DealStage, number> = {
  enquiry: 10,
  qualified: 25,
  proposal: 50,
  negotiation: 70,
  reserved: 90,
  won: 100,
  lost: 0,
}
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
  const [contacts, setContacts] = useState<Contact[]>([])
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
    listContacts(user.id).then(setContacts).catch(() => {})
  }, [user])

  // Universal Create deep-link: ?new=1 (optionally &contactId=) from
  // sidebar Create menu or the Contact drawer's New deal button.
  const router = useRouter()
  const searchParams = useSearchParams()
  const [prefillContactId, setPrefillContactId] = useState<string | null>(null)
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setAdding('enquiry')
      setPrefillContactId(searchParams.get('contactId'))
      router.replace('/admin/deals')
    }
  }, [searchParams, router])
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
      <main className="px-6 md:px-10 py-6 grid gap-6">
        {/* Top summary metrics — sales volume + count by period */}
        <DealMetrics deals={list} />
        {/* Kanban — visual pipeline */}
        <div>
          <p className="font-display text-[14px] tracking-[0.18em] uppercase text-ink-muted mb-3">Pipeline</p>
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
        </div>
        {/* Detailed table — CRM-style, sortable scan-friendly */}
        <div>
          <p className="font-display text-[14px] tracking-[0.18em] uppercase text-ink-muted mb-3">All deals</p>
          <div className="bg-paper border border-line rounded-md overflow-hidden">
            <table className="w-full text-body">
              <thead className="border-b border-line bg-bg text-meta uppercase tracking-[0.14em] text-ink-muted">
                <tr>
                  <th className="text-left py-2 px-3">Title</th>
                  <th className="text-left py-2 px-3">Stage</th>
                  <th className="text-left py-2 px-3 hidden md:table-cell">Customer</th>
                  <th className="text-right py-2 px-3">Amount</th>
                  <th className="text-right py-2 px-3 hidden lg:table-cell">Probability</th>
                  <th className="text-right py-2 px-3 hidden xl:table-cell">Close date</th>
                  <th className="text-right py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {list.map(d => {
                  const c = d.contactId ? contacts.find(x => x.id === d.contactId) : null
                  return (
                    <tr
                      key={d.id}
                      className="border-b border-line/60 hover:bg-bg cursor-pointer"
                      onClick={() => setEditing(d)}
                    >
                      <td className="py-2 px-3 font-bold">{d.title}</td>
                      <td className="py-2 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded-xs text-meta tracking-[0.14em] uppercase ${STAGE_COLOR[d.stage]}`}>
                          {d.stage}
                        </span>
                      </td>
                      <td className="py-2 px-3 hidden md:table-cell text-ink-muted">
                        {c ? <span className="text-ink">{c.name || c.email}</span> : '—'}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">{d.amount ? `€ ${d.amount.toLocaleString()}` : '—'}</td>
                      <td className="py-2 px-3 text-right hidden lg:table-cell text-ink-muted">{d.probability ?? '—'}%</td>
                      <td className="py-2 px-3 text-right hidden xl:table-cell text-ink-muted text-[11px]">{d.expectedCloseDate || '—'}</td>
                      <td className="py-2 px-3 text-right" onClick={e => e.stopPropagation()}>
                        <button onClick={() => rm(d.id)} className="text-red-600 hover:text-red-700"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  )
                })}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-ink-muted text-meta">No deals yet. Click + New deal to start.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      {adding && (
        <AddDealModal
          ownerId={user.id}
          initialStage={adding}
          initialContactId={prefillContactId}
          contacts={contacts}
          onCancel={() => { setAdding(false); setPrefillContactId(null) }}
          onSaved={async (created) => {
            setAdding(false)
            setPrefillContactId(null)
            // Refresh list, then open the freshly created deal in the
            // rich slide-over drawer so the user lands in the workspace
            // instead of staring at a flat row. Same pattern HubSpot uses.
            const updated = await listDeals(user.id)
            setList(updated)
            const fresh = updated.find(d => d.id === created.id) ?? created
            setEditing(fresh)
          }}
        />
      )}
      <AnimatePresence mode="wait">
        {editing && (
          <DealEditModal
            deal={editing}
            allArtworks={artworks}
            allContacts={contacts}
            dealList={list}
            onNavigate={dir => {
              const idx = list.findIndex(d => d.id === editing.id)
              if (idx < 0) return
              const next = dir === 'next' ? list[idx + 1] : list[idx - 1]
              if (next) setEditing(next)
            }}
            onClose={() => { setEditing(null); refresh() }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Sales summary metrics — sits above the kanban as the dashboard.
// Won deals only, grouped by created/updated timestamp window.
// ──────────────────────────────────────────────────────────────
function DealMetrics({ deals }: { deals: Deal[] }) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const isInRange = (iso: string | undefined, start: Date) =>
    !!iso && new Date(iso) >= start
  const won = deals.filter(d => d.stage === 'won')
  const wonInRange = (start: Date) => won.filter(d => isInRange(d.updatedAt ?? d.createdAt, start))
  const fmt = (n: number) => `€ ${Math.round(n).toLocaleString()}`
  const sum = (xs: Deal[]) => xs.reduce((s, d) => s + (d.amount ?? 0), 0)

  const monthDeals = wonInRange(monthStart)
  const quarterDeals = wonInRange(quarterStart)
  const yearDeals = wonInRange(yearStart)
  const open = deals.filter(d => d.stage !== 'lost' && d.stage !== 'won')

  return (
    <section className="bg-paper border border-line rounded-md p-5">
      <div className="flex items-baseline mb-4">
        <p className="font-display text-[14px] inline-flex items-center gap-2">Sales summary</p>
        <p className="ml-auto text-meta uppercase tracking-[0.14em] text-ink-muted">
          Won deals · updated this period
        </p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="This month" amount={fmt(sum(monthDeals))} count={monthDeals.length} tone="accent" />
        <MetricCard label="This quarter" amount={fmt(sum(quarterDeals))} count={quarterDeals.length} />
        <MetricCard label="Year to date" amount={fmt(sum(yearDeals))} count={yearDeals.length} />
        <MetricCard label="Open pipeline" amount={fmt(sum(open))} count={open.length} tone="muted" />
      </div>
    </section>
  )
}

function MetricCard({
  label,
  amount,
  count,
  tone,
}: {
  label: string
  amount: string
  count: number
  tone?: 'accent' | 'muted'
}) {
  const accent =
    tone === 'accent'
      ? 'border-line hover:border-ink'
      : tone === 'muted'
      ? 'border-line'
      : 'border-line'
  return (
    <div className={`border rounded-md p-4 bg-paper ${accent}`}>
      <p className="text-meta uppercase tracking-[0.14em] text-ink-muted">{label}</p>
      <p className="font-display text-[24px] leading-none tabular-nums mt-3">{amount}</p>
      <p className="text-meta text-ink-muted mt-1">
        <span className="font-bold text-ink">{count}</span> {count === 1 ? 'deal' : 'deals'}
      </p>
    </div>
  )
}

function AddDealModal({
  ownerId,
  initialStage,
  initialContactId,
  contacts,
  onCancel,
  onSaved,
}: {
  ownerId: string
  initialStage?: DealStage
  initialContactId?: string | null
  contacts: Contact[]
  onCancel: () => void
  onSaved: (created: Deal) => void
}) {
  const [title, setTitle] = useState('')
  const [stage, setStage] = useState<DealStage>(initialStage ?? 'enquiry')
  const [amount, setAmount] = useState('')
  const [probability, setProbability] = useState(50)
  const [expectedCloseDate, setExpectedCloseDate] = useState('')
  const [contactId, setContactId] = useState<string>(initialContactId ?? '')
  const [contactSearch, setContactSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const filtered = useMemo(() => {
    const q = contactSearch.trim().toLowerCase()
    if (!q) return contacts.slice(0, 50)
    return contacts.filter(c => `${c.name ?? ''} ${c.email ?? ''}`.toLowerCase().includes(q)).slice(0, 50)
  }, [contacts, contactSearch])
  const selectedContact = contacts.find(c => c.id === contactId)
  async function save() {
    if (!contactId) return // hard-required
    setBusy(true)
    try {
      const created = await createDeal({
        ownerId,
        title,
        stage,
        amount: amount ? Number(amount) : null,
        probability,
        expectedCloseDate: expectedCloseDate || null,
        currency: 'EUR',
        contactId,
      })
      onSaved(created)
    } finally { setBusy(false) }
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={onCancel}>
      <div className="bg-paper rounded-md shadow-pop p-6 w-full max-w-[520px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="font-display text-[14px] tracking-[0.18em] uppercase mb-4">New deal</h2>
        <div className="grid gap-3">
          {/* Customer picker — REQUIRED. A deal without a counterparty has no meaning. */}
          <div>
            <label className="text-meta uppercase tracking-[0.14em] text-ink-muted block mb-1">Customer <span className="text-red-600">*</span></label>
            {selectedContact ? (
              <div className="flex items-center justify-between border border-line rounded-md px-3 py-2 bg-bg">
                <div className="min-w-0">
                  <p className="font-bold truncate">{selectedContact.name || '—'}</p>
                  <p className="text-meta text-ink-muted truncate">{selectedContact.email}</p>
                </div>
                <button onClick={() => setContactId('')} className="text-meta text-ink-muted hover:text-ink underline">Change</button>
              </div>
            ) : (
              <>
                <input
                  placeholder="Search contacts by name or email…"
                  value={contactSearch}
                  onChange={e => setContactSearch(e.target.value)}
                  className="input"
                  autoFocus
                />
                <div className="mt-1 max-h-[180px] overflow-y-auto border border-line rounded-sm divide-y divide-line bg-paper">
                  {filtered.length === 0 ? (
                    <p className="px-3 py-2 text-meta text-ink-muted">No contacts. Add one in CRM first.</p>
                  ) : (
                    filtered.map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setContactId(c.id); setContactSearch('') }}
                        className="w-full text-left px-3 py-2 hover:bg-bg"
                      >
                        <p className="font-bold truncate text-body">{c.name || <span className="text-ink-muted italic">No name</span>}</p>
                        <p className="text-meta text-ink-muted truncate">{c.email || '—'}</p>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
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
            <button
              onClick={save}
              disabled={!title || !contactId || busy}
              title={!contactId ? 'Attach a customer first' : undefined}
              className="btn-primary disabled:opacity-40"
            >
              Create & open
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DealEditModal({
  deal,
  allArtworks,
  allContacts,
  dealList,
  onNavigate,
  onClose,
}: {
  deal: Deal
  allArtworks: Artwork[]
  allContacts: Contact[]
  dealList: Deal[]
  onNavigate: (dir: 'next' | 'prev') => void
  onClose: () => void
}) {
  const [d, setD] = useState<Deal>(deal)
  const [busy, setBusy] = useState(false)
  const idx = useMemo(() => dealList.findIndex(x => x.id === deal.id), [deal.id, dealList])
  const hasPrev = idx > 0
  const hasNext = idx >= 0 && idx < dealList.length - 1
  const [artworkSearch, setArtworkSearch] = useState('')
  const [lines, setLines] = useState<DealArtwork[]>([])
  const [pickerOpen, setPickerOpen] = useState<'out' | 'swap_in' | null>(null)

  const artworkById = useMemo(() => {
    const m = new Map<string, Artwork>()
    for (const a of allArtworks) m.set(a.id, a)
    return m
  }, [allArtworks])
  const contactById = useMemo(() => {
    const m = new Map<string, Contact>()
    for (const c of allContacts) m.set(c.id, c)
    return m
  }, [allContacts])

  // Activity log + new-activity composer (in-drawer mini-timeline)
  const [activities, setActivities] = useState<Activity[]>([])
  const [actType, setActType] = useState<ActivityType>('note')
  const [actBody, setActBody] = useState('')
  const [actBusy, setActBusy] = useState(false)

  const customer = useMemo(
    () => (deal.contactId ? allContacts.find(c => c.id === deal.contactId) : null),
    [deal.contactId, allContacts]
  )

  useEffect(() => {
    setD(deal)
    listDealArtworks(deal.id).then(setLines).catch(() => {})
    listActivities(deal.ownerId, { dealId: deal.id }).then(setActivities).catch(() => {})
  }, [deal])

  function setStage(stage: DealStage) {
    setD(x => ({
      ...x,
      stage,
      probability: STAGE_PROBABILITY[stage], // auto-suggest; user can still slide
    }))
  }

  async function logActivity() {
    if (!actBody.trim()) return
    setActBusy(true)
    try {
      const a = await createActivity({
        ownerId: deal.ownerId,
        dealId: deal.id,
        contactId: deal.contactId ?? null,
        type: actType,
        subject: null,
        body: actBody.trim(),
        occurredAt: new Date().toISOString(),
      })
      setActivities(prev => [a, ...prev])
      setActBody('')
    } finally {
      setActBusy(false)
    }
  }

  // j/k navigation between deals (Artlogic-style)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null
      const tag = t?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable) return
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'j' && hasNext) { e.preventDefault(); onNavigate('next') }
      if (e.key === 'k' && hasPrev) { e.preventDefault(); onNavigate('prev') }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [hasNext, hasPrev, onClose, onNavigate])

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
    <>
      {/* Scrim */}
      <motion.div
        className="fixed inset-0 z-50 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
      />
      {/* Slide-over drawer */}
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="fixed top-0 right-0 z-50 h-dvh w-full max-w-[960px] bg-paper shadow-pop overflow-y-auto"
      >
        <header className="sticky top-0 z-10 bg-paper border-b border-line px-6 h-14 flex items-center gap-3">
          <h2 className="font-display text-[14px] tracking-[0.18em] uppercase">Deal</h2>
          <span className={`pill ${STAGE_COLOR[d.stage] ?? 'pill-sold'}`}>{d.stage}</span>
          {dealList.length > 1 && (
            <div className="ml-2 inline-flex items-center gap-0.5">
              <button
                onClick={() => onNavigate('prev')}
                disabled={!hasPrev}
                title="Previous deal (k)"
                className="w-7 h-7 grid place-items-center text-ink-muted hover:text-ink disabled:opacity-30"
              >
                <ArrowUp size={13} />
              </button>
              <button
                onClick={() => onNavigate('next')}
                disabled={!hasNext}
                title="Next deal (j)"
                className="w-7 h-7 grid place-items-center text-ink-muted hover:text-ink disabled:opacity-30"
              >
                <ArrowDown size={13} />
              </button>
              <span className="ml-1 text-meta text-ink-muted tabular-nums">
                {idx + 1}/{dealList.length}
              </span>
            </div>
          )}
          <div className="ml-auto flex gap-2">
            <button onClick={onClose} className="btn-outline"><X size={13} /> Close</button>
            <button onClick={save} disabled={busy} className="btn-primary disabled:opacity-40">Save</button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-0">
          {/* Main column */}
          <div className="px-6 py-5 grid gap-4 border-r border-line">
            {/* Customer card — most-important fact in the drawer */}
            {customer ? (
              <a
                href={`/admin/contacts?focus=${customer.id}`}
                className="block border border-line rounded-md p-3 bg-bg/40 hover:bg-bg hover:border-ink transition-colors"
              >
                <p className="text-meta uppercase tracking-[0.14em] text-ink-muted">Customer</p>
                <p className="font-display text-[15px] mt-0.5">{customer.name || customer.email || '—'}</p>
                <div className="flex items-center gap-2 mt-1 text-meta text-ink-muted">
                  {customer.email && <span>{customer.email}</span>}
                  {customer.country && <><span>·</span><span>{customer.country}</span></>}
                  {customer.lifecycleStage && (
                    <span className="ml-auto text-[9px] tracking-[0.14em] uppercase font-bold px-1.5 py-0.5 rounded-xs bg-line text-ink-muted">
                      {customer.lifecycleStage}
                    </span>
                  )}
                </div>
              </a>
            ) : (
              <div className="border border-amber-200 bg-amber-50/40 rounded-md p-3">
                <p className="text-meta uppercase tracking-[0.14em] text-amber-700 font-bold">No customer attached</p>
                <p className="text-meta text-ink-muted mt-0.5">Legacy deal — link a contact in CRM to enable per-customer reporting.</p>
              </div>
            )}

            <input value={d.title} onChange={e => setD(x => ({ ...x, title: e.target.value }))} className="input font-display text-[16px]" placeholder="Deal title" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-meta uppercase tracking-[0.14em] text-ink-muted mb-1">Stage</label>
                <select value={d.stage} onChange={e => setStage(e.target.value as DealStage)} className="input">
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
              contactById={contactById}
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
              contactById={contactById}
              onPatch={patchLine}
              onRemove={removeLine}
              onAdd={() => setPickerOpen('swap_in')}
              isSwap
            />

            {/* Activity timeline */}
            <section className="border-t border-line pt-4">
              <p className="text-meta uppercase tracking-[0.14em] text-ink-muted font-bold mb-2">
                Activity · {activities.length}
              </p>
              <div className="flex items-end gap-2 mb-3">
                <select
                  value={actType}
                  onChange={e => setActType(e.target.value as ActivityType)}
                  className="input !w-auto !h-9 !py-1"
                  aria-label="Activity type"
                >
                  {(['note','call','email','meeting','viewing','offer','file'] as ActivityType[]).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input
                  value={actBody}
                  onChange={e => setActBody(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); logActivity() } }}
                  placeholder="Add note, call summary, offer detail…"
                  className="input flex-1"
                />
                <button
                  onClick={logActivity}
                  disabled={!actBody.trim() || actBusy}
                  className="btn-primary !h-9 disabled:opacity-40"
                >
                  Log
                </button>
              </div>
              {activities.length === 0 ? (
                <p className="text-meta text-ink-muted">No activity logged yet.</p>
              ) : (
                <ul className="grid gap-2">
                  {activities.slice(0, 15).map(a => (
                    <li key={a.id} className="border border-line rounded-sm p-2">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-[9px] tracking-[0.14em] uppercase font-bold px-1.5 py-0.5 rounded-xs bg-line text-ink-muted">
                          {a.type}
                        </span>
                        <span className="text-meta text-ink-muted">
                          {new Date(a.occurredAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {a.body && <p className="text-body whitespace-pre-wrap">{a.body}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>

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
              <TotalRow label="Commission (you keep)" value={totals.commission} muted />
              {/* Net to artists/owners = gross out − commission. Tells the seller
                  how much they owe artists/owners across the deal. */}
              <TotalRow label="Net to owners" value={Math.max(0, totals.grossOut - totals.commission)} muted />
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
      </motion.div>
    </>
  )
}

// Compact labelled field used inside the per-line auto-fit grid. The
// fixed-height label keeps inputs bottom-aligned even when labels wrap
// to two lines on narrow columns.
function LineField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <label className="block text-[9px] tracking-[0.14em] uppercase text-ink-muted mb-0.5 leading-[1.25] min-h-[22px]">
        {label}
      </label>
      {children}
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
// Pill background + border for the inline status chip on each line.
const LINE_STATUS_CHIP: Record<DealLineStatus, string> = {
  pending:   'border-line bg-paper text-ink-muted',
  offered:   'border-blue-200 bg-blue-50 text-blue-700',
  countered: 'border-amber-200 bg-amber-50 text-amber-700',
  agreed:    'border-emerald-200 bg-emerald-50 text-emerald-700',
  declined:  'border-red-200 bg-red-50 text-red-700',
  completed: 'border-green-300 bg-green-100 text-green-800',
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
  title, subtitle, lines, artworkById, contactById, onPatch, onRemove, onAdd, isSwap,
}: {
  title: string
  subtitle: string
  lines: DealArtwork[]
  artworkById: Map<string, Artwork>
  contactById: Map<string, Contact>
  onPatch: (id: string, p: Partial<DealArtwork>) => void
  onRemove: (id: string) => void
  onAdd: () => void
  isSwap?: boolean
}) {
  return (
    <div className="bg-bg/40 border border-line rounded-md p-5 grid gap-3">
      <div className="flex items-baseline justify-between">
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
              <div key={l.id} className="border border-line rounded-md p-4 bg-paper grid gap-3">
                <div className="flex items-start gap-3">
                  {a.thumb && <img src={a.thumb} alt="" className="w-14 h-14 object-cover rounded-sm shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-bold truncate">{a.title}</p>
                    <p className="text-meta text-ink-muted truncate">{a.artist}{a.price != null ? ` · list € ${a.price.toLocaleString()}` : ''}</p>
                    {/* Ownership badge — always visible per Thomas. Pulls
                        from artwork.ownershipStatus; falls back if unset. */}
                    {!isSwap && (() => {
                      const owner = a.ownerContactId ? contactById.get(a.ownerContactId) : null
                      const status: ArtworkOwnershipStatus =
                        (a.ownershipStatus as ArtworkOwnershipStatus) ||
                        (owner?.isArtist ? 'artist' : (owner ? 'collector' : 'dealer'))
                      const label =
                        status === 'dealer' ? 'Owned by us'
                        : status === 'artist' ? `Artist: ${owner?.name || owner?.email || '—'}`
                        : `Collector: ${owner?.name || owner?.email || '—'}`
                      const tone =
                        status === 'dealer' ? 'bg-ink/5 text-ink border-line'
                        : status === 'artist' ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                        : 'bg-amber-100 text-amber-700 border-amber-200'
                      return (
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap text-meta text-ink-muted">
                          <span className={`inline-flex items-center text-[9px] tracking-[0.14em] uppercase font-bold px-1.5 py-0.5 rounded-xs border ${tone}`}>
                            {label}
                          </span>
                          {/* Per-line econ glance */}
                          {(() => {
                            const price = l.agreedPrice ?? l.counterOffer ?? l.offerPrice ?? a.price ?? 0
                            if (price <= 0) return null
                            if (status === 'dealer') {
                              const purchase = Number(a.costBasis ?? 0)
                              const profit = price - purchase
                              if (purchase <= 0) return null
                              return (
                                <span className="ml-auto">
                                  Profit: <span className="font-bold text-ink tabular-nums">€ {Math.round(profit).toLocaleString()}</span>
                                </span>
                              )
                            }
                            const commission = l.commissionPct ?? a.commissionPct ?? 0
                            if (commission <= 0) return null
                            const net = Math.max(0, price * (1 - commission / 100))
                            return (
                              <span className="ml-auto">
                                Net to owner: <span className="font-bold text-ink tabular-nums">€ {Math.round(net).toLocaleString()}</span>
                                <span className="text-ink-muted/70"> ({(100 - commission).toFixed(0)}%)</span>
                              </span>
                            )
                          })()}
                        </div>
                      )
                    })()}
                  </div>
                  {/* Colored status chip — same control, visual emphasis */}
                  <label className={`inline-flex items-center gap-1.5 text-meta tracking-[0.12em] uppercase font-bold border rounded-xs px-2 py-1 cursor-pointer ${LINE_STATUS_CHIP[l.lineStatus] ?? 'border-line bg-paper text-ink-muted'}`}>
                    <span className={`w-2 h-2 rounded-full ${LINE_STATUS_DOT[l.lineStatus]}`} />
                    <select
                      value={l.lineStatus}
                      onChange={e => onPatch(l.id, { lineStatus: e.target.value as DealLineStatus })}
                      className="bg-transparent border-0 outline-none uppercase tracking-[0.12em] font-bold cursor-pointer pr-3 appearance-none"
                    >
                      {(['pending', 'offered', 'countered', 'agreed', 'declined', 'completed'] as const).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <button onClick={() => onRemove(l.id)} className="text-red-600 hover:text-red-700" title="Remove line">
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
                  // Auto-fit grid: every cell is ≥120px wide and grows
                  // equally. Multi-line labels share a fixed min-height so
                  // every input bottom-aligns into a clean row.
                  <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(120px,1fr))]">
                    <LineField label="Mode">
                      <select
                        value={l.mode}
                        onChange={e => onPatch(l.id, { mode: e.target.value as DealLineMode })}
                        className="input !h-8 !px-1.5 text-[11px]"
                      >
                        <option value="sale">Sale</option>
                        <option value="rent">Rent</option>
                      </select>
                    </LineField>
                    {/* List price — read-only, locked to artwork.price.
                        Editing the artwork's price elsewhere updates here. */}
                    <LineField label="List price (€)">
                      <div className="input !h-8 !px-1.5 text-[11px] flex items-center bg-bg text-ink tabular-nums select-text cursor-default">
                        {a.price != null ? a.price.toLocaleString() : '—'}
                      </div>
                    </LineField>
                    {/* Commission field — only meaningful when artwork is
                        owned by an artist or collector. For dealer-owned
                        stock the purchase price + profit live in the
                        ownership badge above; no per-line commission % to
                        capture in the deal. */}
                    {((a.ownershipStatus ?? 'dealer') !== 'dealer') && (
                      <LineField label="Our commission %">
                        <input
                          type="number"
                          value={l.commissionPct ?? a.commissionPct ?? ''}
                          onChange={e => onPatch(l.id, { commissionPct: e.target.value ? Number(e.target.value) : null })}
                          className="input !h-8 !px-1.5 text-[11px]"
                        />
                      </LineField>
                    )}
                    {(a.ownershipStatus === 'dealer' || a.ownershipStatus == null) && (
                      <LineField label="Purchase price (€)">
                        <div className="input !h-8 !px-1.5 text-[11px] flex items-center bg-bg text-ink tabular-nums select-text cursor-default">
                          {a.costBasis != null ? a.costBasis.toLocaleString() : '—'}
                        </div>
                      </LineField>
                    )}
                  </div>
                )}
                {/* Rent fields are grouped under their own subtle card so
                    sale-mode lines don't look spartan and rent lines feel
                    structured rather than tacked-on. */}
                {l.mode === 'rent' && !isSwap && (
                  <fieldset className="border border-line/60 rounded-sm p-3">
                    <legend className="text-[9px] tracking-[0.14em] uppercase text-ink-muted px-1.5 font-bold">
                      Rent terms
                    </legend>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <LineField label="Term (mo)">
                        <input
                          type="number"
                          value={l.rentTermMonths ?? ''}
                          onChange={e => onPatch(l.id, { rentTermMonths: e.target.value ? Number(e.target.value) : null })}
                          className="input !h-8 !px-1.5 text-[11px]"
                        />
                      </LineField>
                      <LineField label="€ / month">
                        <input
                          type="number"
                          value={l.rentMonthly ?? ''}
                          onChange={e => onPatch(l.id, { rentMonthly: e.target.value ? Number(e.target.value) : null })}
                          className="input !h-8 !px-1.5 text-[11px]"
                        />
                      </LineField>
                    </div>
                  </fieldset>
                )}
                {/* Negotiation rounds — append-only ledger of every offer */}
                {!isSwap && (
                  <NegotiationRounds line={l} artwork={a} onPatch={onPatch} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Negotiation rounds — append-only history of offers between
// company and client. Each round captures by/amount/sales-commission
// at the moment it was made. Accepting a round sets agreed_price and
// flips line status to agreed.
// ──────────────────────────────────────────────────────────────
function NegotiationRounds({
  line,
  artwork,
  onPatch,
}: {
  line: DealArtwork
  artwork: Artwork
  onPatch: (id: string, p: Partial<DealArtwork>) => void
}) {
  const rounds = line.offerRounds ?? []
  const [showForm, setShowForm] = useState(false)
  const [by, setBy] = useState<'company' | 'client'>('company')
  const [amount, setAmount] = useState('')
  const [salesPct, setSalesPct] = useState('')
  const taxPct = artwork.taxPct ?? 0
  const ourPct = line.commissionPct ?? artwork.commissionPct ?? 0

  function calc(amt: number, sCommPct: number) {
    const taxAmt = amt * taxPct / 100
    const ourComm = amt * ourPct / 100
    const salesComm = amt * sCommPct / 100
    // Owner net: gross - our cut (only meaningful for non-dealer-owned)
    const ownerNet = Math.max(0, amt - ourComm)
    // Dealer keep: our commission - tax - sales person commission
    const dealerKeep = ourComm - taxAmt - salesComm
    return { taxAmt, ourComm, salesComm, ownerNet, dealerKeep }
  }

  function addRound() {
    if (!amount) return
    const next: OfferRound = {
      round: (rounds[rounds.length - 1]?.round ?? 0) + 1,
      by,
      amount: Number(amount),
      salesCommissionPct: salesPct ? Number(salesPct) : null,
      occurredAt: new Date().toISOString(),
      note: null,
    }
    const updated = [...rounds, next]
    // Snapshot the latest values to legacy fields so totals + price
    // cascade keep working: company offers fill counterOffer, client
    // offers fill offerPrice.
    const patch: Partial<DealArtwork> = { offerRounds: updated }
    if (by === 'company') patch.counterOffer = next.amount
    else patch.offerPrice = next.amount
    if (next.salesCommissionPct != null) {
      // commissionPct is already used for our cut; keep sales separate
      // by stashing on the line via... hmm, no dedicated field. We
      // accept the limitation — sales commission per round lives only
      // in the rounds JSON. Aggregated totals can read the last value.
    }
    onPatch(line.id, patch)
    setAmount('')
    setSalesPct('')
    setShowForm(false)
  }

  function accept(round: OfferRound) {
    onPatch(line.id, {
      agreedPrice: round.amount,
      lineStatus: 'agreed',
    })
  }

  // Revert an accepted line so the negotiation can continue. Keeps the
  // rounds history intact; just clears agreed_price + drops status back
  // to 'countered'.
  function reopen() {
    onPatch(line.id, {
      agreedPrice: null,
      lineStatus: 'countered',
    })
  }

  const accepted = line.lineStatus === 'agreed' || line.lineStatus === 'completed'

  return (
    <div className="border-t border-line pt-3">
      <div className="flex items-center mb-3 flex-wrap gap-2">
        <p className="text-meta uppercase tracking-[0.14em] text-ink-muted font-bold inline-flex items-center gap-1.5">
          <MessageSquareQuote size={12} className="text-ink-muted" />
          Negotiation
          {rounds.length > 0 && (
            <span className="text-ink-muted/70">· {rounds.length} round{rounds.length === 1 ? '' : 's'}</span>
          )}
        </p>
        <div className="ml-auto flex gap-1 flex-wrap">
          {accepted ? (
            <button
              onClick={reopen}
              className="btn-outline !h-7 text-meta !text-amber-700 !border-amber-300 hover:!bg-amber-50 inline-flex items-center gap-1"
              title="Reopen negotiation — clears agreed price, drops status back to countered"
            >
              <Undo2 size={11} /> Reopen
            </button>
          ) : rounds.length > 0 ? (
            <button
              onClick={() => accept(rounds[rounds.length - 1])}
              className="btn-outline !h-7 text-meta !text-emerald-700 !border-emerald-300 hover:!bg-emerald-50 inline-flex items-center gap-1"
              title="Accept latest as final"
            >
              <Check size={11} /> Accept final
            </button>
          ) : null}
          <button
            onClick={() => { setBy('company'); setShowForm(true) }}
            className="btn-outline !h-7 text-meta inline-flex items-center gap-1"
          >
            <Building2 size={11} /> Company offer
          </button>
          <button
            onClick={() => { setBy('client'); setShowForm(true) }}
            className="btn-outline !h-7 text-meta inline-flex items-center gap-1"
          >
            <User size={11} /> Client counter
          </button>
        </div>
      </div>

      {showForm && (
        <div className="border border-line rounded-md p-4 mb-3 bg-paper grid gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-bg">
              {by === 'company' ? <Building2 size={13} className="text-indigo-700" /> : <User size={13} className="text-amber-700" />}
            </span>
            <select
              value={by}
              onChange={e => setBy(e.target.value as 'company' | 'client')}
              className="input !h-8 !w-auto !py-1 font-bold"
            >
              <option value="company">Company → Client</option>
              <option value="client">Client → Company</option>
            </select>
            <span className="ml-auto text-meta uppercase tracking-[0.14em] text-ink-muted">
              Round {(rounds[rounds.length - 1]?.round ?? 0) + 1}
            </span>
          </div>
          {/* Amount as the hero input */}
          <div>
            <label className="block text-[10px] tracking-[0.16em] uppercase text-ink-muted mb-1">Offer amount</label>
            <div className="flex items-center gap-2">
              <span className="font-display text-[22px] text-ink-muted">€</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="input !h-12 !text-[22px] font-display tabular-nums flex-1"
                autoFocus
                placeholder="0"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={salesPct}
                  onChange={e => setSalesPct(e.target.value)}
                  className="input !h-12 !w-20 !text-[14px] text-center"
                  placeholder="0"
                />
                <span className="text-meta uppercase tracking-[0.12em] text-ink-muted">% sales</span>
              </div>
            </div>
          </div>
          {amount && (
            <div className="border-t border-line/60 pt-2">
              <NegotiationCalc
                amount={Number(amount)}
                salesPct={Number(salesPct || 0)}
                calc={calc(Number(amount), Number(salesPct || 0))}
                taxPct={taxPct}
                ourPct={ourPct}
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="btn-outline !h-8 text-meta">Cancel</button>
            <button
              onClick={addRound}
              disabled={!amount}
              className="btn-primary !h-8 disabled:opacity-40 inline-flex items-center gap-1"
            >
              <Check size={12} /> Save round
            </button>
          </div>
        </div>
      )}

      {rounds.length === 0 && !showForm && (
        <div className="border border-dashed border-line rounded-md p-5 text-center bg-bg/30">
          <MessageSquareQuote size={20} className="mx-auto text-ink-muted/60 mb-2" />
          <p className="text-meta text-ink-muted">
            No offers yet. Start with <b className="text-ink">Company offer</b> or capture an incoming <b className="text-ink">Client counter</b>.
          </p>
        </div>
      )}

      {rounds.length > 0 && (
        <ol className="relative">
          {/* Vertical connector line */}
          <span className="absolute left-3.5 top-3 bottom-3 w-px bg-line" aria-hidden />
          {rounds.map((r, i) => {
            const latest = i === rounds.length - 1
            const breakdown = calc(r.amount, r.salesCommissionPct ?? 0)
            const isAccepted = accepted && latest
            const Icon = r.by === 'company' ? Building2 : User
            const dot = isAccepted
              ? 'bg-emerald-500 ring-emerald-100'
              : r.by === 'company'
              ? 'bg-indigo-500 ring-indigo-100'
              : 'bg-amber-500 ring-amber-100'
            return (
              <li
                key={i}
                className="relative pl-9 pb-3 last:pb-0"
              >
                {/* Marker */}
                <span
                  className={`absolute left-1.5 top-2.5 w-4 h-4 rounded-full ring-4 ${dot} grid place-items-center`}
                  aria-hidden
                >
                  <Icon size={9} className="text-paper" />
                </span>
                <div
                  className={`rounded-md p-3 border ${
                    isAccepted ? 'border-emerald-300 bg-emerald-50/50' : 'border-line bg-paper'
                  }`}
                >
                  <div className="flex items-baseline gap-2 flex-wrap mb-1.5">
                    <span className="text-[9px] tracking-[0.14em] uppercase font-bold text-ink-muted">
                      R{r.round}
                    </span>
                    <span className={`text-[9px] tracking-[0.14em] uppercase font-bold ${
                      r.by === 'company' ? 'text-indigo-700' : 'text-amber-700'
                    }`}>
                      {r.by === 'company' ? 'Company' : 'Client'}
                    </span>
                    <span className="font-display text-[15px] font-bold tabular-nums ml-1">
                      € {r.amount.toLocaleString()}
                    </span>
                    {r.salesCommissionPct != null && (
                      <span className="text-meta text-ink-muted">sales {r.salesCommissionPct}%</span>
                    )}
                    {isAccepted && (
                      <span className="text-[9px] tracking-[0.14em] uppercase font-bold px-1.5 py-0.5 rounded-xs bg-emerald-200 text-emerald-800">
                        ✓ Final
                      </span>
                    )}
                    <span className="ml-auto text-meta text-ink-muted">
                      {new Date(r.occurredAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                  <NegotiationCalc
                    amount={r.amount}
                    salesPct={r.salesCommissionPct ?? 0}
                    calc={breakdown}
                    taxPct={taxPct}
                    ourPct={ourPct}
                    compact
                  />
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

function NegotiationCalc({
  amount, salesPct, calc, taxPct, ourPct, compact,
}: {
  amount: number
  salesPct: number
  calc: { taxAmt: number; ourComm: number; salesComm: number; ownerNet: number; dealerKeep: number }
  taxPct: number
  ourPct: number
  compact?: boolean
}) {
  const cells: Array<{ k: string; v: string; tone?: 'pos' | 'neg' | 'mute' }> = [
    { k: 'Gross', v: `€ ${amount.toLocaleString()}` },
    { k: `Tax ${taxPct}%`, v: `€ ${Math.round(calc.taxAmt).toLocaleString()}`, tone: 'mute' },
    { k: `Our ${ourPct}%`, v: `€ ${Math.round(calc.ourComm).toLocaleString()}` },
    { k: `Sales ${salesPct}%`, v: `€ ${Math.round(calc.salesComm).toLocaleString()}`, tone: 'mute' },
    { k: 'Owner net', v: `€ ${Math.round(calc.ownerNet).toLocaleString()}` },
    { k: 'Dealer keep', v: `€ ${Math.round(calc.dealerKeep).toLocaleString()}`, tone: calc.dealerKeep >= 0 ? 'pos' : 'neg' },
  ]
  return (
    <div className={`grid grid-cols-3 sm:grid-cols-6 gap-x-3 gap-y-1 ${compact ? 'text-[10px]' : 'text-meta'}`}>
      {cells.map(({ k, v, tone }) => (
        <div key={k} className="flex flex-col min-w-0">
          <span className="uppercase tracking-[0.12em] text-ink-muted truncate">{k}</span>
          <span className={`tabular-nums font-bold truncate ${
            tone === 'pos' ? 'text-emerald-700'
            : tone === 'neg' ? 'text-red-600'
            : tone === 'mute' ? 'text-ink-muted'
            : 'text-ink'
          }`}>
            {v}
          </span>
        </div>
      ))}
    </div>
  )
}

