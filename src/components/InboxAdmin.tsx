'use client'
import { useEffect, useState } from 'react'
import { Code2, Download, Send, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/db/auth'
import {
  deleteSubscriber,
  downloadSubscribersCsv,
  listSubscribers,
} from '@/lib/db/subscribers'
import { listContent } from '@/lib/db/social'
import { ContentItem, Subscriber } from '@/types'
import LoginForm from './LoginForm'
import AdminPageHeader from './ui/AdminPageHeader'

export default function InboxAdmin() {
  const { user, loading } = useAuth()
  const [list, setList] = useState<Subscriber[]>([])
  const [busy, setBusy] = useState(false)
  const [embedShown, setEmbedShown] = useState(false)
  const [sending, setSending] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [newsletters, setNewsletters] = useState<ContentItem[]>([])
  const [pickedId, setPickedId] = useState<string>('')
  const [dryRun, setDryRun] = useState(false)

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

  async function openSendPicker() {
    if (!user) return
    const all = await listContent(user.id, { type: 'newsletter' })
    setNewsletters(all)
    setPickedId(all[0]?.id ?? '')
    setPickerOpen(true)
  }

  async function sendNewsletter() {
    if (!pickedId || !user) return
    const picked = newsletters.find(n => n.id === pickedId)
    const label = picked?.subjectLine || picked?.title || 'newsletter'
    const confirmMsg = dryRun
      ? `Dry run: preview the recipient list for "${label}" without actually sending?`
      : `Send "${label}" to ${active} active subscribers? This cannot be undone.`
    if (!confirm(confirmMsg)) return
    setSending(true)
    try {
      const res = await fetch('/api/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: pickedId, ownerId: user.id, dryRun }),
      })
      const json = await res.json()
      if (!res.ok) {
        alert(`${res.status === 503 ? 'Email not configured: ' : 'Error: '}${json.error ?? 'Unknown error'}`)
        return
      }
      if (json.dryRun) {
        const sample = (json.sampleRecipients ?? []).join(', ')
        alert(`Dry run OK · Would send to ${json.wouldSend} subscribers.\nSample: ${sample || '(none)'}\nNo emails actually sent.`)
      } else {
        alert(`Sent ${json.sent} · Failed ${json.failed}`)
        setPickerOpen(false)
      }
    } catch (e) {
      alert('Send failed: ' + String(e))
    } finally {
      setSending(false)
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
              onClick={openSendPicker}
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
      {pickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={() => setPickerOpen(false)}>
          <div className="bg-paper rounded-md shadow-pop w-full max-w-[560px]" onClick={e => e.stopPropagation()}>
            <header className="px-6 h-14 flex items-center gap-3 border-b border-line">
              <Send size={14} className="text-ink-muted" />
              <h2 className="font-display text-[14px] tracking-[0.18em] uppercase">Send newsletter</h2>
            </header>
            <div className="px-6 py-5 grid gap-3">
              {newsletters.length === 0 ? (
                <p className="text-body text-ink-muted text-center py-3">
                  No newsletters drafted yet. Create one in Social Calendar → Newsletter column first.
                </p>
              ) : (
                <>
                  <label className="block">
                    <span className="block text-meta uppercase tracking-[0.14em] text-ink-muted mb-1">Newsletter</span>
                    <select
                      value={pickedId}
                      onChange={e => setPickedId(e.target.value)}
                      className="input"
                    >
                      {newsletters.map(n => (
                        <option key={n.id} value={n.id}>
                          {n.subjectLine || n.title || '(untitled)'} — {n.status}
                        </option>
                      ))}
                    </select>
                  </label>
                  {(() => {
                    const picked = newsletters.find(n => n.id === pickedId)
                    if (!picked) return null
                    return (
                      <div className="border border-line rounded-md p-3 bg-bg/40 grid gap-1">
                        <p className="text-meta uppercase tracking-[0.14em] text-ink-muted">Preview</p>
                        <p className="font-bold text-body">{picked.subjectLine || picked.title}</p>
                        {picked.previewText && <p className="text-meta text-ink-muted">{picked.previewText}</p>}
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-meta text-ink-muted">→ {active} active subscriber{active === 1 ? '' : 's'}</p>
                          {picked.publishedUrl && (
                            <a
                              href={picked.publishedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-meta uppercase tracking-[0.12em] text-accent underline hover:text-accent/80"
                            >
                              Preview live →
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </>
              )}
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 cursor-pointer text-meta uppercase tracking-[0.12em] text-ink-muted">
                  <input
                    type="checkbox"
                    checked={dryRun}
                    onChange={e => setDryRun(e.target.checked)}
                  />
                  Dry run
                </label>
                <span className="text-meta text-ink-muted/70">
                  {dryRun ? 'Preview recipients without sending' : 'Live send via Resend'}
                </span>
                <div className="ml-auto flex gap-2">
                  <button onClick={() => setPickerOpen(false)} className="btn-outline">Cancel</button>
                  <button
                    onClick={sendNewsletter}
                    disabled={!pickedId || sending}
                    className="btn-primary disabled:opacity-40"
                  >
                    {sending ? (dryRun ? 'Checking…' : 'Sending…') : (dryRun ? 'Run preview' : `Send to ${active}`)}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
