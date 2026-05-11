'use client'
import { useEffect, useRef, useState } from 'react'
import { Bold, Heading1, Heading2, Image as ImageIcon, Italic, Link2, List, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/db/auth'
import { createContent, deleteContent, listContent, updateContent } from '@/lib/db/social'
import type { ContentItem, ContentStatus } from '@/types'
import LoginForm from './LoginForm'
import AdminPageHeader from './ui/AdminPageHeader'

const STATUS_LABEL: Record<ContentStatus, string> = {
  draft: 'Draft',
  in_progress: 'In progress',
  submitted_for_review: 'In review',
  changes_requested: 'Changes requested',
  approved: 'Approved',
  scheduled: 'Scheduled',
  published: 'Published',
  failed: 'Failed',
  archived: 'Archived',
}
const STATUS_COLOR: Record<ContentStatus, string> = {
  draft: 'bg-line text-ink-muted',
  in_progress: 'bg-blue-100 text-blue-700',
  submitted_for_review: 'bg-amber-100 text-amber-700',
  changes_requested: 'bg-orange-100 text-orange-700',
  approved: 'bg-emerald-100 text-emerald-700',
  scheduled: 'bg-indigo-100 text-indigo-700',
  published: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  archived: 'bg-line text-ink-muted',
}

export default function BlogList() {
  const { user, loading } = useAuth()
  const [list, setList] = useState<ContentItem[]>([])
  const [editing, setEditing] = useState<ContentItem | null>(null)

  useEffect(() => { if (user) refresh() }, [user])
  async function refresh() {
    if (!user) return
    setList(await listContent(user.id, { type: 'blog' }))
  }

  async function newPost() {
    if (!user) return
    const item = await createContent({ ownerId: user.id, type: 'blog', title: 'Untitled blog post', status: 'draft' })
    setEditing(item)
    refresh()
  }
  async function rm(id: string) {
    if (!confirm('Delete this blog post?')) return
    await deleteContent(id)
    refresh()
  }

  if (loading) return <div className="p-8 text-body text-ink-muted">Loading…</div>
  if (!user) return <div className="min-h-dvh flex items-center justify-center p-6"><LoginForm /></div>

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <AdminPageHeader
        title="Blog"
        actions={
          <button onClick={newPost} className="btn-primary">
            <Plus size={14} strokeWidth={2.5} /> New post
          </button>
        }
        subBar={
          <span>
            Total: <span className="text-ink font-bold">{list.length}</span>
          </span>
        }
      />
      <main className="px-6 md:px-10 py-6">
        {!list.length ? (
          <div className="py-20 text-center">
            <p className="text-body text-ink-muted">No blog posts yet.</p>
            <button onClick={newPost} className="btn-primary mt-4">
              <Plus size={14} strokeWidth={2.5} /> Write your first post
            </button>
          </div>
        ) : (
          <div className="bg-paper border border-line rounded-md overflow-hidden">
            <table className="w-full text-body">
              <thead className="border-b border-line bg-bg text-meta uppercase tracking-[0.14em] text-ink-muted">
                <tr>
                  <th className="text-left py-2 px-3">Title</th>
                  <th className="text-left py-2 px-3">Purpose</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-left py-2 px-3">Scheduled</th>
                  <th className="text-right py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {list.map(it => (
                  <tr key={it.id} className="border-b border-line/60 hover:bg-bg cursor-pointer" onClick={() => setEditing(it)}>
                    <td className="py-2 px-3 font-bold">{it.title || '(untitled)'}</td>
                    <td className="py-2 px-3 text-ink-muted truncate max-w-[260px]">{it.purpose || '—'}</td>
                    <td className="py-2 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded-xs text-meta tracking-[0.14em] uppercase ${STATUS_COLOR[it.status]}`}>
                        {STATUS_LABEL[it.status]}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-ink-muted text-[11px]">
                      {it.scheduledAt ? new Date(it.scheduledAt).toLocaleString() : '—'}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button onClick={e => { e.stopPropagation(); rm(it.id) }} className="text-red-600 hover:text-red-700">
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

      {editing && (
        <BlogEditor
          item={editing}
          onClose={() => { setEditing(null); refresh() }}
        />
      )}
    </div>
  )
}

function BlogEditor({ item, onClose }: { item: ContentItem; onClose: () => void }) {
  const [draft, setDraft] = useState<Partial<ContentItem>>(item)
  const [busy, setBusy] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)

  async function generateAI() {
    setAiBusy(true)
    try {
      const res = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'blog',
          brief: { title: draft.title, purpose: draft.purpose },
        }),
      })
      const json = await res.json()
      if (json.content) setDraft(s => ({ ...s, bodyMd: json.content }))
    } finally {
      setAiBusy(false)
    }
  }

  async function save() {
    setBusy(true)
    try {
      await updateContent(item.id, draft)
      onClose()
    } finally { setBusy(false) }
  }

  function insertMd(prefix: string, suffix = '', placeholder = 'text') {
    const ta = taRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = ta.value.slice(start, end) || placeholder
    const inserted = `${prefix}${selected}${suffix}`
    const next = ta.value.slice(0, start) + inserted + ta.value.slice(end)
    setDraft(s => ({ ...s, bodyMd: next }))
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(start + prefix.length, start + prefix.length + selected.length)
    })
  }

  const toolbar = [
    { icon: <Heading1 size={14} />, label: 'H1', action: () => insertMd('# ', '', 'Heading') },
    { icon: <Heading2 size={14} />, label: 'H2', action: () => insertMd('## ', '', 'Heading') },
    { icon: <Bold size={14} />, label: 'Bold', action: () => insertMd('**', '**', 'bold text') },
    { icon: <Italic size={14} />, label: 'Italic', action: () => insertMd('_', '_', 'italic text') },
    { icon: <Link2 size={14} />, label: 'Link', action: () => insertMd('[', '](https://)', 'link text') },
    { icon: <List size={14} />, label: 'List', action: () => insertMd('\n- ', '', 'item') },
    { icon: <ImageIcon size={14} />, label: 'Image', action: () => insertMd('![alt](', ')', 'https://') },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4 md:p-8" onClick={onClose}>
      <div className="w-full max-w-[900px] max-h-[92vh] overflow-y-auto bg-paper rounded-md shadow-pop" onClick={e => e.stopPropagation()}>
        <header className="sticky top-0 z-10 bg-paper border-b border-line px-6 h-14 flex items-center gap-3">
          <h2 className="font-display text-[14px] tracking-[0.18em] uppercase">Blog post</h2>
          <select
            value={draft.status ?? 'draft'}
            onChange={e => setDraft(s => ({ ...s, status: e.target.value as ContentStatus }))}
            className="input !h-8 !w-auto"
          >
            {(['draft','in_progress','submitted_for_review','changes_requested','approved','scheduled','published','archived'] as ContentStatus[]).map(s => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
          <div className="ml-auto flex gap-2">
            <button onClick={onClose} className="btn-outline">Close</button>
            <button onClick={save} disabled={busy} className="btn-primary disabled:opacity-40">
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </header>
        <div className="px-6 py-5 grid gap-3">
          <input
            value={draft.title ?? ''}
            onChange={e => setDraft(s => ({ ...s, title: e.target.value }))}
            placeholder="Title"
            className="input !text-[18px] !h-12 font-display"
          />
          <input
            value={draft.purpose ?? ''}
            onChange={e => setDraft(s => ({ ...s, purpose: e.target.value }))}
            placeholder="Purpose / angle"
            className="input"
          />
          {/* Formatting toolbar + AI */}
          <div className="flex gap-1 flex-wrap border border-line rounded-sm bg-bg px-2 py-1.5">
            {toolbar.map(btn => (
              <button
                key={btn.label}
                onClick={btn.action}
                title={btn.label}
                type="button"
                className="w-8 h-7 grid place-items-center text-ink-muted hover:text-ink hover:bg-paper rounded-xs transition-colors"
              >
                {btn.icon}
              </button>
            ))}
            <button
              onClick={generateAI}
              disabled={aiBusy}
              type="button"
              className="ml-auto text-meta tracking-[0.12em] uppercase text-accent underline hover:text-accent/80 disabled:opacity-40"
              title="Generate first draft with AI"
            >
              {aiBusy ? 'Generating…' : '✦ Generate AI draft'}
            </button>
          </div>
          <textarea
            ref={taRef}
            value={draft.bodyMd ?? ''}
            onChange={e => setDraft(s => ({ ...s, bodyMd: e.target.value }))}
            rows={20}
            placeholder="Write your post (markdown)…"
            className="input font-mono text-[13px]"
          />
          <input
            value={draft.coverUrl ?? ''}
            onChange={e => setDraft(s => ({ ...s, coverUrl: e.target.value }))}
            placeholder="Cover image URL"
            className="input"
          />
          <input
            type="datetime-local"
            value={draft.scheduledAt ? new Date(draft.scheduledAt).toISOString().slice(0, 16) : ''}
            onChange={e => setDraft(s => ({ ...s, scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : null }))}
            className="input"
          />
        </div>
      </div>
    </div>
  )
}
