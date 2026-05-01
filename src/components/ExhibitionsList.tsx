'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/db/auth'
import { createExhibition, deleteExhibition, listExhibitions } from '@/lib/db/exhibitions'
import { VirtualExhibition } from '@/types'
import LoginForm from './LoginForm'

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

  if (loading) return <div className="p-8 text-[13px] text-ink-muted">Loading…</div>
  if (!user) return <div className="min-h-dvh flex items-center justify-center p-6"><LoginForm /></div>

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="border-b border-line">
        <div className="max-w-content mx-auto px-6 md:px-12 py-5 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[11px] tracking-[0.22em] uppercase text-ink-muted">Virtual Exhibitions</p>
            <h1 className="font-display text-[22px] tracking-tight">{list.length} exhibitions</h1>
          </div>
          <button onClick={add} className="px-3 py-2 text-[11px] tracking-[0.18em] uppercase bg-ink text-paper inline-flex items-center gap-2">
            <Plus size={13} /> New exhibition
          </button>
        </div>
      </header>
      <main className="max-w-content mx-auto px-6 md:px-12 py-8">
        {!list.length && !busy && (
          <p className="text-[13px] text-ink-muted py-12 text-center">No exhibitions yet — build your first 3D walkthrough.</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {list.map(ve => (
            <article key={ve.id} className="border border-line p-4 flex gap-3 items-center">
              <div className="w-20 h-20 bg-line/40 grid place-items-center text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                {ve.published ? 'Live' : 'Draft'}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/admin/exhibitions/${ve.id}`} className="font-display truncate block">{ve.name}</Link>
                <p className="text-[11px] tracking-[0.14em] uppercase text-ink-muted">
                  {ve.wallArtworks.length} works · {ve.roomTemplate}
                </p>
              </div>
              {ve.published && ve.slug && (
                <Link href={`/exhibition/${ve.slug}`} target="_blank" className="text-[11px] uppercase tracking-[0.14em] inline-flex items-center gap-1">
                  <ExternalLink size={11} /> View
                </Link>
              )}
              <Link href={`/admin/exhibitions/${ve.id}`} className="text-[11px] uppercase tracking-[0.14em]">Edit</Link>
              <button onClick={() => rm(ve.id)} className="text-red-600">
                <Trash2 size={13} />
              </button>
            </article>
          ))}
        </div>
      </main>
    </div>
  )
}
