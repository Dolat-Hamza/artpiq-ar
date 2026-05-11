'use client'
import { useEffect, useState } from 'react'
import { Image as ImageIcon, Plus, Trash2, X } from 'lucide-react'
import { useAuth } from '@/lib/db/auth'
import { createDeal, deleteDeal, listDeals, updateDeal } from '@/lib/db/crm'
import { listMyArtworks } from '@/lib/db/artworks'
import type { Artwork, Deal, DealStage } from '@/types'
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
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Deal | null>(null)
  const confirm = useConfirm()
  const toast = useToast()

  useEffect(() => {
    if (!user) return
    refresh()
    listMyArtworks(user.id).then(setArtworks).catch(() => {})
  }, [user])
  async function refresh() { if (user) setList(await listDeals(user.id)) }

  async function moveStage(d: Deal, stage: DealStage) {
    await updateDeal(d.id, { stage })
    refresh()
  }
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
            <button onClick={() => setAdding(true)} className="btn-primary">
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
              return (
                <section key={stage} className="bg-paper border border-line rounded-md p-3 min-h-[200px]">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-display text-meta uppercase tracking-[0.14em]">{stage}</p>
                    <span className="text-meta tracking-[0.14em] text-ink-muted">{col.length}</span>
                  </div>
                  {sum > 0 && <p className="text-meta text-ink-muted mb-2">€ {sum.toLocaleString()}</p>}
                  <div className="flex flex-col gap-2">
                    {col.map(d => {
                    const linked = artworks.filter(a => (d.artworkIds ?? []).includes(a.id))
                    return (
                      <article key={d.id} className="border border-line rounded-sm p-2 bg-bg/50 cursor-pointer hover:border-ink" onClick={() => setEditing(d)}>
                        <p className="text-body font-bold truncate">{d.title}</p>
                        {d.amount && <p className="text-meta text-ink-muted">€ {d.amount.toLocaleString()}</p>}
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
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {STAGES.filter(s => s !== d.stage).slice(0, 2).map(s => (
                            <button key={s} onClick={e => { e.stopPropagation(); moveStage(d, s) }} className="text-meta tracking-[0.12em] uppercase text-ink-muted underline hover:text-ink">
                              → {s}
                            </button>
                          ))}
                        </div>
                      </article>
                    )
                  })}
                  </div>
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
      {adding && <AddDealModal ownerId={user.id} onCancel={() => setAdding(false)} onSaved={() => { setAdding(false); refresh() }} />}
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
  onCancel,
  onSaved,
}: {
  ownerId: string
  onCancel: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState('')
  const [stage, setStage] = useState<DealStage>('enquiry')
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

  const filteredArtworks = artworkSearch.trim()
    ? allArtworks.filter(a => [a.title, a.artist].join(' ').toLowerCase().includes(artworkSearch.toLowerCase()))
    : allArtworks

  async function save() {
    setBusy(true)
    try {
      await updateDeal(d.id, d)
      onClose()
    } finally { setBusy(false) }
  }

  const linkedIds = new Set(d.artworkIds ?? [])

  function toggleArtwork(id: string) {
    const current = new Set(d.artworkIds ?? [])
    if (current.has(id)) current.delete(id)
    else current.add(id)
    setD(x => ({ ...x, artworkIds: [...current] }))
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4 md:p-8" onClick={onClose}>
      <div className="w-full max-w-[720px] max-h-[92vh] overflow-y-auto bg-paper rounded-md shadow-pop" onClick={e => e.stopPropagation()}>
        <header className="sticky top-0 z-10 bg-paper border-b border-line px-6 h-14 flex items-center gap-3">
          <h2 className="font-display text-[14px] tracking-[0.18em] uppercase">Deal</h2>
          <div className="ml-auto flex gap-2">
            <button onClick={onClose} className="btn-outline"><X size={13} /> Close</button>
            <button onClick={save} disabled={busy} className="btn-primary disabled:opacity-40">Save</button>
          </div>
        </header>
        <div className="px-6 py-5 grid gap-4">
          <input value={d.title} onChange={e => setD(x => ({ ...x, title: e.target.value }))} className="input font-display text-[16px]" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-meta uppercase tracking-[0.14em] text-ink-muted mb-1">Stage</label>
              <select value={d.stage} onChange={e => setD(x => ({ ...x, stage: e.target.value as DealStage }))} className="input">
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-meta uppercase tracking-[0.14em] text-ink-muted mb-1">Amount (€)</label>
              <input
                value={d.amount ?? ''}
                onChange={e => setD(x => ({ ...x, amount: e.target.value ? Number(e.target.value) : null }))}
                inputMode="numeric"
                className="input"
              />
            </div>
            <div>
              <label className="block text-meta uppercase tracking-[0.14em] text-ink-muted mb-1">Expected close</label>
              <input type="date" value={d.expectedCloseDate ?? ''} onChange={e => setD(x => ({ ...x, expectedCloseDate: e.target.value || null }))} className="input" />
            </div>
            <div>
              <label className="block text-meta uppercase tracking-[0.14em] text-ink-muted mb-1">Probability: {d.probability ?? 50}%</label>
              <input type="range" min={0} max={100} step={5} value={d.probability ?? 50} onChange={e => setD(x => ({ ...x, probability: Number(e.target.value) }))} className="w-full" />
            </div>
          </div>
          <div>
            <label className="block text-meta uppercase tracking-[0.14em] text-ink-muted mb-1">Notes</label>
            <textarea value={d.notes ?? ''} onChange={e => setD(x => ({ ...x, notes: e.target.value }))} rows={3} className="input" />
          </div>

          {/* Artwork picker */}
          <div className="border border-line rounded-md p-4">
            <p className="text-meta uppercase tracking-[0.14em] text-ink-muted font-bold mb-3">
              Linked artworks · {linkedIds.size}
            </p>
            {/* Linked chips */}
            {linkedIds.size > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {allArtworks.filter(a => linkedIds.has(a.id)).map(a => (
                  <span key={a.id} className="inline-flex items-center gap-1 bg-accent-soft text-accent text-meta px-2 py-0.5 rounded-xs">
                    {a.title}
                    <button onClick={() => toggleArtwork(a.id)} className="hover:text-red-600"><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
            <input
              value={artworkSearch}
              onChange={e => setArtworkSearch(e.target.value)}
              placeholder="Search artworks to link…"
              className="input mb-2"
            />
            <div className="max-h-48 overflow-y-auto grid grid-cols-1 divide-y divide-line">
              {filteredArtworks.slice(0, 50).map(a => (
                <button
                  key={a.id}
                  onClick={() => toggleArtwork(a.id)}
                  className={`flex items-center gap-2 px-2 py-1.5 text-left hover:bg-bg ${linkedIds.has(a.id) ? 'bg-accent-soft' : ''}`}
                >
                  {a.thumb && <img src={a.thumb} alt="" className="w-8 h-8 object-cover rounded-xs shrink-0" />}
                  <span className="flex-1 min-w-0">
                    <span className="text-body font-bold truncate block">{a.title}</span>
                    <span className="text-meta text-ink-muted">{a.artist}</span>
                  </span>
                  {linkedIds.has(a.id) && <span className="text-accent text-meta">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

