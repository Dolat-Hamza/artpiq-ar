'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/db/auth'
import { createShow, deleteShow, listShows } from '@/lib/db/artShows'
import { ArtShow } from '@/types'
import LoginForm from './LoginForm'
import AdminPageHeader from './ui/AdminPageHeader'

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

  if (loading) return <div className="p-8 text-body text-ink-muted">Loading…</div>
  if (!user) return <div className="min-h-dvh flex items-center justify-center p-6"><LoginForm /></div>

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <AdminPageHeader
        title="Personal Spaces"
        actions={
          <button onClick={add} className="btn-primary">
            <Plus size={14} strokeWidth={2.5} /> New space
          </button>
        }
        subBar={
          <span>
            Total: <span className="text-ink font-bold">{list.length} / 50</span>
          </span>
        }
      />
      <main className="px-6 md:px-10 py-6">
        {!list.length && !busy && (
          <div className="py-20 text-center">
            <p className="text-body text-ink-muted">No spaces yet — plan your first hang.</p>
            <button onClick={add} className="btn-primary mt-4">
              <Plus size={14} strokeWidth={2.5} /> New space
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map(s => (
            <article
              key={s.id}
              className="bg-paper border border-line rounded-md overflow-hidden group hover:border-ink hover:shadow-card transition-all ease-snap"
            >
              <Link href={`/admin/shows/${s.id}`} className="block aspect-[16/10] bg-line/40">
                {s.floorPlanUrl ? (
                  <img src={s.floorPlanUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-meta uppercase tracking-[0.16em] text-ink-muted">
                    no floor plan
                  </div>
                )}
              </Link>
              <div className="p-3 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <Link href={`/admin/shows/${s.id}`} className="font-bold text-[13px] truncate block">
                    {s.name}
                  </Link>
                  <p className="text-[11px] text-ink-muted mt-0.5 inline-flex items-center gap-1">
                    <MapPin size={10} /> {s.venueName || '—'} · {s.wallSegments.length} walls
                  </p>
                </div>
                <Link
                  href={`/admin/shows/${s.id}`}
                  className="w-8 h-8 grid place-items-center text-ink-muted hover:text-ink"
                  title="Open"
                >
                  <Pencil size={14} />
                </Link>
                <button
                  onClick={() => rm(s.id)}
                  className="w-8 h-8 grid place-items-center text-red-600"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  )
}
