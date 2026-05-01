'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/db/auth'
import { createShow, deleteShow, listShows } from '@/lib/db/artShows'
import { ArtShow } from '@/types'
import LoginForm from './LoginForm'

export default function ArtShowsList() {
  const { user, loading } = useAuth()
  const [list, setList] = useState<ArtShow[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function refresh() {
    if (!user) return
    setBusy(true)
    try {
      setList(await listShows(user.id))
    } finally {
      setBusy(false)
    }
  }

  async function add() {
    if (!user) return
    const name = prompt('Show name')?.trim()
    if (!name) return
    const s = await createShow(user.id, name)
    window.location.href = `/admin/shows/${s.id}`
  }

  async function rm(id: string) {
    if (!confirm('Delete show?')) return
    await deleteShow(id)
    refresh()
  }

  if (loading) return <div className="p-8 text-[13px] text-ink-muted">Loading…</div>
  if (!user) return <div className="min-h-dvh flex items-center justify-center p-6"><LoginForm /></div>

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="border-b border-line">
        <div className="max-w-content mx-auto px-6 md:px-12 py-5 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[11px] tracking-[0.22em] uppercase text-ink-muted">Art Show Planner</p>
            <h1 className="font-display text-[22px] tracking-tight">{list.length} shows</h1>
          </div>
          <button onClick={add} className="px-3 py-2 text-[11px] tracking-[0.18em] uppercase bg-ink text-paper inline-flex items-center gap-2">
            <Plus size={13} /> New show
          </button>
        </div>
      </header>
      <main className="max-w-content mx-auto px-6 md:px-12 py-8">
        {!list.length && !busy && (
          <p className="text-[13px] text-ink-muted py-12 text-center">No shows yet — plan your first hang.</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {list.map(s => (
            <article key={s.id} className="border border-line p-4 flex gap-3 items-center">
              {s.floorPlanUrl ? (
                <img src={s.floorPlanUrl} alt="" className="w-20 h-20 object-cover" />
              ) : (
                <div className="w-20 h-20 bg-line/40 grid place-items-center text-[10px] text-ink-muted">no plan</div>
              )}
              <div className="flex-1 min-w-0">
                <Link href={`/admin/shows/${s.id}`} className="font-display truncate block">{s.name}</Link>
                <p className="text-[11px] tracking-[0.14em] uppercase text-ink-muted">
                  {s.venueName || '—'} · {s.wallSegments.length} walls · {s.placements.length} placements
                </p>
              </div>
              <Link href={`/admin/shows/${s.id}`} className="text-[11px] uppercase tracking-[0.14em]">Open</Link>
              <button onClick={() => rm(s.id)} className="text-red-600">
                <Trash2 size={13} />
              </button>
            </article>
          ))}
        </div>
      </main>
    </div>
  )
}
