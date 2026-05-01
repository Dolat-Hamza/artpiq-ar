'use client'
import { useEffect, useState } from 'react'
import { Download, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/db/auth'
import {
  deleteSubscriber,
  downloadSubscribersCsv,
  listSubscribers,
} from '@/lib/db/subscribers'
import { Subscriber } from '@/types'
import LoginForm from './LoginForm'

export default function InboxAdmin() {
  const { user, loading } = useAuth()
  const [list, setList] = useState<Subscriber[]>([])
  const [busy, setBusy] = useState(false)
  const [embedShown, setEmbedShown] = useState(false)

  useEffect(() => {
    if (!user) return
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function refresh() {
    if (!user) return
    setBusy(true)
    try {
      setList(await listSubscribers(user.id))
    } finally {
      setBusy(false)
    }
  }

  async function rm(id: string) {
    if (!confirm('Remove subscriber?')) return
    await deleteSubscriber(id)
    refresh()
  }

  if (loading) return <div className="p-8 text-[13px] text-ink-muted">Loading…</div>
  if (!user) return <div className="min-h-dvh flex items-center justify-center p-6"><LoginForm /></div>

  const embedSnippet = `<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/embed/newsletter.js" data-owner="${user.id}"></script>`

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="border-b border-line">
        <div className="max-w-content mx-auto px-6 md:px-12 py-5 flex items-center gap-3 flex-wrap">
          <div className="flex-1">
            <p className="text-[11px] tracking-[0.22em] uppercase text-ink-muted">Newsletter inbox</p>
            <h1 className="font-display text-[22px] tracking-tight">{list.filter(s => !s.optedOutAt).length} active subscribers</h1>
          </div>
          <button
            onClick={() => setEmbedShown(s => !s)}
            className="px-3 py-2 text-[11px] tracking-[0.18em] uppercase border border-line"
          >
            {embedShown ? 'Hide' : 'Embed snippet'}
          </button>
          <button
            onClick={() => downloadSubscribersCsv(list)}
            disabled={!list.length}
            className="px-3 py-2 text-[11px] tracking-[0.18em] uppercase border border-line inline-flex items-center gap-2 disabled:opacity-40"
          >
            <Download size={13} /> Mailchimp CSV
          </button>
        </div>
        {embedShown && (
          <div className="max-w-content mx-auto px-6 md:px-12 pb-4">
            <p className="text-[11px] text-ink-muted mb-1">
              Paste this on any site (Squarespace code block, plain HTML page, etc):
            </p>
            <pre className="bg-line/30 p-3 text-[11px] overflow-x-auto">
              {embedSnippet}
            </pre>
            <p className="text-[11px] text-ink-muted mt-1">
              Or use the React component <code>&lt;NewsletterForm ownerId="{user.id}" /&gt;</code> directly.
            </p>
          </div>
        )}
      </header>

      <main className="max-w-content mx-auto px-6 md:px-12 py-8">
        {!list.length && !busy && (
          <p className="text-[13px] text-ink-muted py-12 text-center">
            No subscribers yet. Embed the form on a viewing room or your Discover profile.
          </p>
        )}
        <table className="w-full text-[13px]">
          <thead className="border-b border-line text-[10px] tracking-[0.16em] uppercase text-ink-muted">
            <tr>
              <th className="text-left py-2">Email</th>
              <th className="text-left py-2">Name</th>
              <th className="text-left py-2">Source</th>
              <th className="text-left py-2">Joined</th>
              <th className="text-left py-2">Status</th>
              <th className="text-right py-2"></th>
            </tr>
          </thead>
          <tbody>
            {list.map(s => (
              <tr key={s.id} className="border-b border-line/60">
                <td className="py-2">{s.email}</td>
                <td className="py-2">{s.name || <span className="text-ink-muted">—</span>}</td>
                <td className="py-2 text-[11px] tracking-[0.12em] uppercase text-ink-muted">{s.source}</td>
                <td className="py-2 text-ink-muted text-[11px]">
                  {s.optedInAt ? new Date(s.optedInAt).toLocaleDateString() : ''}
                </td>
                <td className="py-2 text-[11px] uppercase">
                  {s.optedOutAt ? <span className="text-red-600">Out</span> : <span className="text-emerald-700">Active</span>}
                </td>
                <td className="py-2 text-right">
                  <button onClick={() => rm(s.id)} className="text-red-600">
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  )
}
