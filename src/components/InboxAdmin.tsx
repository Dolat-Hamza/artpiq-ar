'use client'
import { useEffect, useState } from 'react'
import { Code2, Download, Send, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/db/auth'
import {
  deleteSubscriber,
  downloadSubscribersCsv,
  listSubscribers,
} from '@/lib/db/subscribers'
import { Subscriber } from '@/types'
import LoginForm from './LoginForm'
import AdminPageHeader from './ui/AdminPageHeader'

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

  if (loading) return <div className="p-8 text-body text-ink-muted">Loading…</div>
  if (!user) return <div className="min-h-dvh flex items-center justify-center p-6"><LoginForm /></div>

  const embedSnippet = `<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/embed/newsletter.js" data-owner="${user.id}"></script>`
  const active = list.filter(s => !s.optedOutAt).length

  async function sendNewsletter() {
    const contentId = prompt('Paste the newsletter content ID from Social Calendar → newsletter item')?.trim()
    if (!contentId) return
    const ok = confirm(`Send to ${active} active subscribers?`)
    if (!ok) return
    try {
      const res = await fetch('/api/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, ownerId: user?.id }),
      })
      const json = await res.json()
      if (!res.ok) alert(`Error: ${json.error}`)
      else alert(`Sent ${json.sent} · Failed ${json.failed}`)
    } catch (e) {
      alert('Send failed: ' + String(e))
    }
  }

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <AdminPageHeader
        title="Newsletter"
        actions={
          <>
            <button
              onClick={() => setEmbedShown(s => !s)}
              className="btn-outline"
            >
              <Code2 size={13} /> {embedShown ? 'Hide embed' : 'Embed snippet'}
            </button>
            <button
              onClick={sendNewsletter}
              disabled={!active}
              className="btn-outline disabled:opacity-40"
              title="Send a newsletter campaign via Resend (requires RESEND_API_KEY)"
            >
              <Send size={13} /> Send campaign
            </button>
            <button
              onClick={() => downloadSubscribersCsv(list)}
              disabled={!list.length}
              className="btn-outline disabled:opacity-40"
            >
              <Download size={13} /> Mailchimp CSV
            </button>
          </>
        }
        subBar={
          <>
            <span>
              Active: <span className="text-ink font-bold">{active}</span>
            </span>
            <span className="text-ink-muted">·</span>
            <span>
              Total: <span className="text-ink font-bold">{list.length}</span>
            </span>
          </>
        }
      />

      {embedShown && (
        <div className="px-6 md:px-10 py-4 border-b border-line bg-paper">
          <p className="text-meta uppercase tracking-[0.14em] text-ink-muted mb-2">
            Paste on any site (Squarespace, plain HTML, etc.)
          </p>
          <pre className="bg-bg border border-line p-3 text-[11px] overflow-x-auto rounded-sm">
            {embedSnippet}
          </pre>
          <p className="text-[11px] text-ink-muted mt-2">
            Or use React: <code>&lt;NewsletterForm ownerId={'{'}user.id{'}'} /&gt;</code>
          </p>
        </div>
      )}

      <main className="px-6 md:px-10 py-6">
        {!list.length && !busy && (
          <div className="py-20 text-center">
            <p className="text-body text-ink-muted">
              No subscribers yet. Embed the form on a viewing room or your Discover profile.
            </p>
          </div>
        )}
        {list.length > 0 && (
          <div className="bg-paper border border-line rounded-md overflow-hidden">
            <table className="w-full text-body">
              <thead className="border-b border-line bg-bg text-meta uppercase tracking-[0.14em] text-ink-muted">
                <tr>
                  <th className="text-left py-2 px-3">Email</th>
                  <th className="text-left py-2 px-3">Name</th>
                  <th className="text-left py-2 px-3">Source</th>
                  <th className="text-left py-2 px-3">Joined</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-right py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {list.map(s => (
                  <tr key={s.id} className="border-b border-line/60 hover:bg-bg">
                    <td className="py-2 px-3 font-bold">{s.email}</td>
                    <td className="py-2 px-3">{s.name || <span className="text-ink-muted">—</span>}</td>
                    <td className="py-2 px-3 text-meta tracking-[0.12em] uppercase text-ink-muted">{s.source}</td>
                    <td className="py-2 px-3 text-ink-muted text-[11px]">
                      {s.optedInAt ? new Date(s.optedInAt).toLocaleDateString() : ''}
                    </td>
                    <td className="py-2 px-3">
                      {s.optedOutAt ? (
                        <span className="pill pill-sold">Out</span>
                      ) : (
                        <span className="pill pill-sale">Active</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button onClick={() => rm(s.id)} className="text-red-600 hover:text-red-700">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
