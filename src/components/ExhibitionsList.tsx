'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/db/auth'
import { createExhibition, deleteExhibition, listExhibitions } from '@/lib/db/exhibitions'
import { VirtualExhibition } from '@/types'
import LoginForm from './LoginForm'
import AdminPageHeader from './ui/AdminPageHeader'

export default function ExhibitionsList() {
  const { user, loading } = useAuth()
  const [list, setList] = useState<VirtualExhibition[]>([])
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
      setList(await listExhibitions(user.id))
    } finally {
      setBusy(false)
    }
  }

  async function add() {
    if (!user) return
    const name = prompt('Exhibition name')?.trim()
    if (!name) return
    const ve = await createExhibition(user.id, name)
    window.location.href = `/admin/exhibitions/${ve.id}`
  }

  async function rm(id: string) {
    if (!confirm('Delete exhibition?')) return
    await deleteExhibition(id)
    refresh()
  }

  if (loading) return <div className="p-8 text-body text-ink-muted">Loading…</div>
  if (!user) return <div className="min-h-dvh flex items-center justify-center p-6"><LoginForm /></div>

  const live = list.filter(v => v.published).length

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <AdminPageHeader
        title="Virtual Exhibitions"
        actions={
          <button onClick={add} className="btn-primary">
            <Plus size={14} strokeWidth={2.5} /> New exhibition
          </button>
        }
        subBar={
          <>
            <span>
              Total: <span className="text-ink font-bold">{list.length}</span>
            </span>
            <span className="text-ink-muted">·</span>
            <span>
              Live: <span className="text-ink font-bold">{live}</span>
            </span>
          </>
        }
      />

      <main className="px-6 md:px-10 py-6">
        {!list.length && !busy && (
          <div className="py-20 text-center">
            <p className="text-body text-ink-muted">No exhibitions yet — build your first 3D walkthrough.</p>
            <button onClick={add} className="btn-primary mt-4">
              <Plus size={14} strokeWidth={2.5} /> New exhibition
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map(ve => (
            <article key={ve.id} className="bg-paper border border-line rounded-md overflow-hidden group hover:border-ink hover:shadow-card transition-all ease-snap">
              <Link href={`/admin/exhibitions/${ve.id}`} className="block aspect-[16/10] bg-line/40 grid place-items-center relative">
                <span className="text-meta uppercase tracking-[0.16em] text-ink-muted">
                  {ve.roomTemplate || 'room'}
                </span>
                <span
                  className={`absolute top-2 left-2 text-[9px] tracking-[0.16em] uppercase font-bold px-1.5 py-0.5 rounded-xs ${
                    ve.published
                      ? 'bg-accent-2 text-paper'
                      : 'bg-paper/85 backdrop-blur text-ink-muted'
                  }`}
                >
                  {ve.published ? 'Live' : 'Draft'}
                </span>
              </Link>
              <div className="p-3 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <Link href={`/admin/exhibitions/${ve.id}`} className="font-bold text-[13px] truncate block">
                    {ve.name}
                  </Link>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    {ve.wallArtworks.length} works
                  </p>
                </div>
                {ve.published && ve.slug && (
                  <Link
                    href={`/exhibition/${ve.slug}`}
                    target="_blank"
                    className="w-8 h-8 grid place-items-center text-ink-muted hover:text-ink"
                    title="View live"
                  >
                    <ExternalLink size={14} />
                  </Link>
                )}
                <Link
                  href={`/admin/exhibitions/${ve.id}`}
                  className="w-8 h-8 grid place-items-center text-ink-muted hover:text-ink"
                  title="Edit"
                >
                  <Pencil size={14} />
                </Link>
                <button
                  onClick={() => rm(ve.id)}
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
