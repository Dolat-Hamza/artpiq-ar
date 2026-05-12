'use client'
import { useEffect, useMemo, useState } from 'react'
import {
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Mail,
  Megaphone,
  MessageSquare,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/db/auth'
import {
  addComment,
  createContent,
  deleteContent,
  listComments,
  listContent,
  resolveComment,
  updateContent,
} from '@/lib/db/social'
import type { ContentComment, ContentItem, ContentStatus, ContentType } from '@/types'
import LoginForm from './LoginForm'
import AdminPageHeader from './ui/AdminPageHeader'
import { useConfirm } from './ui/ConfirmDialog'
import { useToast } from './ui/toast'

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

const TYPE_LABEL: Record<ContentType, string> = {
  post: 'Post',
  reel: 'Reel',
  story: 'Story',
  blog: 'Blog',
  newsletter: 'Newsletter',
  event_promo: 'Event promo',
}
const TYPE_ICON: Record<ContentType, typeof Megaphone> = {
  post: Megaphone,
  reel: Megaphone,
  story: Megaphone,
  blog: FileText,
  newsletter: Mail,
  event_promo: CalendarIcon,
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

export default function SocialCalendar() {
  const { user, loading } = useAuth()
  const [list, setList] = useState<ContentItem[]>([])
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState<'calendar' | 'kanban' | 'list'>('calendar')
  const [cursor, setCursor] = useState<Date>(startOfMonth(new Date()))
  const [editing, setEditing] = useState<ContentItem | null>(null)
  const [composing, setComposing] = useState<{ type: ContentType; date?: Date } | null>(null)
  const confirm = useConfirm()
  const toast = useToast()

  useEffect(() => {
    if (!user) return
    refresh()
  }, [user])

  async function refresh() {
    if (!user) return
    setBusy(true)
    try {
      setList(await listContent(user.id))
    } finally {
      setBusy(false)
    }
  }

  async function createEventPromoBundle(title: string, eventDate: string, location: string) {
    if (!user) return
    await Promise.all([
      createContent({ ownerId: user.id, type: 'post', title: `[Post] ${title}`, purpose: 'Promote event', eventDate, eventLocation: location, status: 'draft' }),
      createContent({ ownerId: user.id, type: 'blog', title: `[Blog] ${title}`, purpose: 'Promote event', eventDate, eventLocation: location, status: 'draft' }),
      createContent({ ownerId: user.id, type: 'newsletter', title: `[Newsletter] ${title}`, purpose: 'Promote event', eventDate, eventLocation: location, status: 'draft' }),
    ])
    refresh()
  }

  async function quickStatus(item: ContentItem, status: ContentStatus) {
    await updateContent(item.id, { status })
    refresh()
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: 'Delete this content?',
      description: 'Comments and review history will be removed.',
      destructive: true,
      confirmLabel: 'Delete',
    })
    if (!ok) return
    await deleteContent(id)
    toast.success('Content deleted')
    refresh()
  }

  if (loading) return <div className="p-8 text-body text-ink-muted">Loading…</div>
  if (!user)
    return (
      <div className="min-h-dvh flex items-center justify-center p-6">
        <LoginForm />
      </div>
    )

  const counts = list.reduce<Record<ContentStatus, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1
    return acc
  }, {} as Record<ContentStatus, number>)

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <AdminPageHeader
        title="Social Calendar"
        actions={
          <>
            <div className="hidden md:inline-flex items-center gap-1 mr-2">
              {(['calendar', 'kanban', 'list'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  data-active={view === v}
                  className="ap-nav !rounded-md !py-1.5 !px-3 text-meta uppercase tracking-[0.14em]"
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="relative group">
              <button className="btn-primary">
                <Plus size={14} strokeWidth={2.5} /> New
              </button>
              <div className="absolute right-0 top-full mt-1 w-52 bg-paper border border-line shadow-pop rounded-md py-1 z-20 hidden group-hover:block">
                {(['post', 'reel', 'story', 'blog', 'newsletter'] as ContentType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setComposing({ type: t })}
                    className="block w-full text-left px-3 py-1.5 text-body hover:bg-bg"
                  >
                    {TYPE_LABEL[t]}
                  </button>
                ))}
                <div className="border-t border-line my-1" />
                <button
                  onClick={() => setComposing({ type: 'event_promo' })}
                  className="block w-full text-left px-3 py-1.5 text-body hover:bg-bg font-bold"
                >
                  Event promo bundle ✦
                </button>
              </div>
            </div>
          </>
        }
        subBar={
          <>
            <span>
              Total: <span className="text-ink font-bold">{list.length}</span>
            </span>
            <span className="text-ink-muted">·</span>
            <span>
              In review: <span className="text-ink font-bold">{counts.submitted_for_review ?? 0}</span>
            </span>
            <span className="text-ink-muted">·</span>
            <span>
              Scheduled: <span className="text-ink font-bold">{counts.scheduled ?? 0}</span>
            </span>
            <span className="text-ink-muted">·</span>
            <span>
              Published: <span className="text-ink font-bold">{counts.published ?? 0}</span>
            </span>
          </>
        }
      />

      <main className="px-6 md:px-10 py-6">
        {view === 'calendar' && (
          <CalendarView
            cursor={cursor}
            setCursor={setCursor}
            items={list}
            onCellClick={(date, type) => setComposing({ type, date })}
            onItemClick={item => setEditing(item)}
          />
        )}
        {view === 'kanban' && (
          <KanbanView items={list} onItemClick={item => setEditing(item)} onStatus={quickStatus} />
        )}
        {view === 'list' && (
          <ListView items={list} onItemClick={item => setEditing(item)} onDelete={remove} />
        )}
      </main>

      {composing && (
        <ComposerModal
          ownerId={user.id}
          initial={{ type: composing.type, scheduledAt: composing.date?.toISOString() ?? null }}
          onClose={() => setComposing(null)}
          onSaved={() => {
            setComposing(null)
            refresh()
          }}
        />
      )}
      {editing && (
        <ComposerModal
          ownerId={user.id}
          existing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}

// ============================================================
// Calendar view (CoSchedule unified — all content types in grid)
// ============================================================
function CalendarView({
  cursor,
  setCursor,
  items,
  onCellClick,
  onItemClick,
}: {
  cursor: Date
  setCursor: (d: Date) => void
  items: ContentItem[]
  onCellClick: (date: Date, type: ContentType) => void
  onItemClick: (item: ContentItem) => void
}) {
  const start = startOfMonth(cursor)
  const end = endOfMonth(cursor)
  const startWeekday = (start.getDay() + 6) % 7 // Mon-first
  const days = end.getDate()

  const cells: (Date | null)[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= days; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d))
  while (cells.length % 7 !== 0) cells.push(null)

  const itemsByDay = useMemo(() => {
    const m = new Map<string, ContentItem[]>()
    for (const c of items) {
      if (!c.scheduledAt) continue
      const d = new Date(c.scheduledAt)
      const key = d.toISOString().slice(0, 10)
      const arr = m.get(key) ?? []
      arr.push(c)
      m.set(key, arr)
    }
    return m
  }, [items])

  const monthLabel = cursor.toLocaleString('en', { month: 'long', year: 'numeric' })

  return (
    <section className="bg-paper border border-line rounded-md p-4">
      <div className="flex items-center mb-3">
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="w-8 h-8 grid place-items-center rounded hover:bg-bg"
        >
          <ChevronLeft size={16} />
        </button>
        <p className="font-display text-[14px] tracking-[0.04em] mx-3">{monthLabel}</p>
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="w-8 h-8 grid place-items-center rounded hover:bg-bg"
        >
          <ChevronRight size={16} />
        </button>
        <button
          onClick={() => setCursor(startOfMonth(new Date()))}
          className="ml-auto text-meta uppercase tracking-[0.14em] text-ink-muted hover:text-ink"
        >
          Today
        </button>
      </div>
      <div className="grid grid-cols-7 gap-px bg-line border border-line text-meta uppercase tracking-[0.14em] text-ink-muted font-bold">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="bg-bg px-2 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-line border-x border-b border-line">
        {cells.map((d, i) => {
          const key = d ? d.toISOString().slice(0, 10) : `empty-${i}`
          const inMonth = !!d
          const today = d && d.toDateString() === new Date().toDateString()
          const dayItems = d ? itemsByDay.get(key) ?? [] : []
          return (
            <div
              key={key}
              className={`min-h-[110px] p-1.5 bg-paper ${inMonth ? '' : 'bg-bg/50'} ${today ? 'ring-1 ring-accent ring-inset' : ''}`}
            >
              {d && (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[11px] ${today ? 'font-bold text-accent' : 'text-ink-muted'}`}>
                      {d.getDate()}
                    </span>
                    <button
                      onClick={() => onCellClick(d, 'post')}
                      className="opacity-0 hover:opacity-100 group-hover:opacity-100 w-5 h-5 grid place-items-center text-ink-muted hover:text-ink"
                      title="Add post"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-1">
                    {dayItems.slice(0, 3).map(it => {
                      const Icon = TYPE_ICON[it.type]
                      return (
                        <button
                          key={it.id}
                          onClick={() => onItemClick(it)}
                          className={`text-left px-1.5 py-0.5 rounded-xs text-[10px] truncate flex items-center gap-1 ${STATUS_COLOR[it.status]}`}
                          title={`${TYPE_LABEL[it.type]} · ${STATUS_LABEL[it.status]} · ${it.title || '(untitled)'}`}
                        >
                          <Icon size={10} className="shrink-0" />
                          <span className="truncate">{it.title || TYPE_LABEL[it.type]}</span>
                        </button>
                      )
                    })}
                    {dayItems.length > 3 && (
                      <span className="text-[10px] text-ink-muted">+{dayItems.length - 3} more</span>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ============================================================
// Kanban (status pipeline — Buffer / ContentCal style)
// ============================================================
function KanbanView({
  items,
  onItemClick,
  onStatus,
}: {
  items: ContentItem[]
  onItemClick: (item: ContentItem) => void
  onStatus: (item: ContentItem, status: ContentStatus) => void
}) {
  const cols: ContentStatus[] = ['draft', 'in_progress', 'submitted_for_review', 'approved', 'scheduled', 'published']
  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
      {cols.map(col => {
        const colItems = items.filter(i => i.status === col)
        return (
          <section key={col} className="bg-paper border border-line rounded-md p-3 min-h-[200px]">
            <div className="flex items-center justify-between mb-3">
              <p className="font-display text-meta uppercase tracking-[0.14em]">
                {STATUS_LABEL[col]}
              </p>
              <span className="text-meta tracking-[0.14em] text-ink-muted">{colItems.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {colItems.map(it => {
                const Icon = TYPE_ICON[it.type]
                return (
                  <article
                    key={it.id}
                    className="border border-line rounded-sm p-2 bg-bg/50 cursor-pointer hover:border-ink"
                    onClick={() => onItemClick(it)}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon size={11} className="text-ink-muted" />
                      <span className="text-meta uppercase tracking-[0.14em] text-ink-muted">
                        {TYPE_LABEL[it.type]}
                      </span>
                    </div>
                    <p className="text-body font-bold truncate">{it.title || '(untitled)'}</p>
                    {it.scheduledAt && (
                      <p className="text-meta text-ink-muted mt-1 inline-flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(it.scheduledAt).toLocaleString('en', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    )}
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {col !== 'submitted_for_review' && col !== 'approved' && col !== 'published' && (
                        <button
                          onClick={e => { e.stopPropagation(); onStatus(it, 'submitted_for_review') }}
                          className="text-meta tracking-[0.14em] uppercase text-accent underline"
                        >
                          Submit
                        </button>
                      )}
                      {col === 'submitted_for_review' && (
                        <>
                          <button
                            onClick={e => { e.stopPropagation(); onStatus(it, 'approved') }}
                            className="text-meta tracking-[0.14em] uppercase text-emerald-700 underline"
                          >
                            Approve
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); onStatus(it, 'changes_requested') }}
                            className="text-meta tracking-[0.14em] uppercase text-orange-700 underline"
                          >
                            Request changes
                          </button>
                        </>
                      )}
                      {col === 'approved' && (
                        <button
                          onClick={e => { e.stopPropagation(); onStatus(it, 'scheduled') }}
                          className="text-meta tracking-[0.14em] uppercase text-indigo-700 underline"
                        >
                          Schedule
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

// ============================================================
// List view
// ============================================================
function ListView({
  items,
  onItemClick,
  onDelete,
}: {
  items: ContentItem[]
  onItemClick: (item: ContentItem) => void
  onDelete: (id: string) => void
}) {
  if (!items.length) {
    return (
      <div className="py-20 text-center">
        <p className="text-body text-ink-muted">No content yet. Hit &ldquo;+ New&rdquo; to start your calendar.</p>
      </div>
    )
  }
  return (
    <div className="bg-paper border border-line rounded-md overflow-hidden">
      <table className="w-full text-body">
        <thead className="border-b border-line bg-bg text-meta uppercase tracking-[0.14em] text-ink-muted">
          <tr>
            <th className="text-left py-2 px-3">Title</th>
            <th className="text-left py-2 px-3">Type</th>
            <th className="text-left py-2 px-3">Purpose</th>
            <th className="text-left py-2 px-3">Status</th>
            <th className="text-left py-2 px-3">Scheduled</th>
            <th className="text-right py-2 px-3"></th>
          </tr>
        </thead>
        <tbody>
          {items.map(it => (
            <tr key={it.id} className="border-b border-line/60 hover:bg-bg cursor-pointer" onClick={() => onItemClick(it)}>
              <td className="py-2 px-3 font-bold">{it.title || '(untitled)'}</td>
              <td className="py-2 px-3 text-ink-muted">{TYPE_LABEL[it.type]}</td>
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
                <button
                  onClick={e => { e.stopPropagation(); onDelete(it.id) }}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================
// Composer modal — Loomly Brief schema
// ============================================================
const POST_TYPES = ['Single image', 'Carousel', 'Video', 'Reel', 'Story', 'Text only', 'Link']
const PURPOSES = [
  'Brand awareness',
  'Drive traffic',
  'Newsletter sign-ups',
  'Showcase new collection',
  'Promote event',
  'Lead generation',
  'Engagement',
  'Sales',
]

function ComposerModal({
  ownerId,
  initial,
  existing,
  onClose,
  onSaved,
}: {
  ownerId: string
  initial?: Partial<ContentItem> & { type: ContentType }
  existing?: ContentItem
  onClose: () => void
  onSaved: () => void
}) {
  const [item, setItem] = useState<Partial<ContentItem>>(
    existing ?? { type: initial?.type ?? 'post', status: 'draft', ...initial },
  )
  const [busy, setBusy] = useState(false)
  const [comments, setComments] = useState<ContentComment[]>([])
  const [commentText, setCommentText] = useState('')
  const [commentBusy, setCommentBusy] = useState(false)
  const [modalTab, setModalTab] = useState<'edit' | 'comments'>('edit')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  async function generateWithAI() {
    setAiBusy(true)
    setAiError(null)
    try {
      const res = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: item.type ?? 'post',
          brief: {
            title: item.title,
            purpose: item.purpose,
            postType: item.postType,
            targetAudience: item.targetAudience,
            hook: item.hook,
            cta: item.cta,
            ctaUrl: item.ctaUrl,
            eventDate: item.eventDate,
            eventLocation: item.eventLocation,
          },
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.content) {
        setAiError(json.error || 'Failed to generate.')
        return
      }
      const generated = json.content as string
      const isLongForm = item.type === 'blog' || item.type === 'newsletter'
      if (isLongForm) setItem(s => ({ ...s, bodyMd: generated }))
      else setItem(s => ({ ...s, copy: generated }))
    } catch (e) {
      setAiError(String(e))
    } finally {
      setAiBusy(false)
    }
  }
  const set = <K extends keyof ContentItem>(k: K, v: ContentItem[K]) =>
    setItem(s => ({ ...s, [k]: v }))

  useEffect(() => {
    if (existing?.id) listComments(existing.id).then(setComments)
  }, [existing?.id])

  async function postComment() {
    if (!commentText.trim() || !existing?.id) return
    setCommentBusy(true)
    try {
      await addComment({ ownerId, contentId: existing.id, authorId: ownerId, body: commentText })
      setCommentText('')
      const updated = await listComments(existing.id)
      setComments(updated)
    } finally {
      setCommentBusy(false)
    }
  }

  async function save() {
    setBusy(true)
    try {
      // Auto-derive month_key from scheduledAt so monthly portal can group reliably
      const monthKey = item.scheduledAt
        ? new Date(item.scheduledAt).toISOString().slice(0, 7)
        : item.monthKey ?? null
      const payload = { ...item, monthKey }
      if (existing) {
        await updateContent(existing.id, payload)
      } else if (item.type === 'event_promo' && !existing) {
        // Create event_promo anchor + auto-bundle post+blog+newsletter
        await createContent({ ownerId, type: 'event_promo', ...item })
        if (item.title) {
          await Promise.all([
            createContent({ ownerId, type: 'post', title: `[Post] ${item.title}`, purpose: item.purpose ?? 'Promote event', eventDate: item.eventDate ?? null, eventLocation: item.eventLocation ?? null, status: 'draft' }),
            createContent({ ownerId, type: 'blog', title: `[Blog] ${item.title}`, purpose: item.purpose ?? 'Promote event', eventDate: item.eventDate ?? null, eventLocation: item.eventLocation ?? null, status: 'draft' }),
            createContent({ ownerId, type: 'newsletter', title: `[Newsletter] ${item.title}`, purpose: item.purpose ?? 'Promote event', eventDate: item.eventDate ?? null, eventLocation: item.eventLocation ?? null, status: 'draft' }),
          ])
        }
      } else {
        await createContent({ ownerId, type: item.type ?? 'post', ...payload })
      }
      onSaved()
    } finally {
      setBusy(false)
    }
  }

  async function setStatus(s: ContentStatus) {
    set('status', s)
    if (existing) {
      await updateContent(existing.id, { status: s })
      onSaved()
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4 md:p-8" onClick={onClose}>
      <div
        className="w-full max-w-[760px] max-h-[92vh] overflow-y-auto bg-paper rounded-md shadow-pop"
        onClick={e => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 bg-paper border-b border-line px-6 h-14 flex items-center gap-3">
          <h2 className="font-display text-[14px] tracking-[0.18em] uppercase">
            {existing ? 'Edit content' : 'New content'}
          </h2>
          <span
            className={`px-2 py-0.5 rounded-xs text-meta tracking-[0.14em] uppercase ${STATUS_COLOR[(item.status ?? 'draft') as ContentStatus]}`}
          >
            {STATUS_LABEL[(item.status ?? 'draft') as ContentStatus]}
          </span>
          {existing && (
            <div className="flex gap-1 ml-2">
              {(['edit', 'comments'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setModalTab(t)}
                  className={`ap-nav !rounded-md !py-1 !px-2.5 text-meta uppercase tracking-[0.12em] ${modalTab === t ? 'font-bold' : ''}`}
                >
                  {t === 'comments' ? (
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare size={11} /> {comments.length > 0 ? comments.length : ''}
                      {t}
                    </span>
                  ) : t}
                </button>
              ))}
            </div>
          )}
          <div className="ml-auto flex gap-2">
            <button onClick={onClose} className="btn-outline">
              <X size={13} /> Close
            </button>
            <button onClick={save} disabled={busy} className="btn-primary disabled:opacity-40">
              <Check size={14} strokeWidth={2.5} /> {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </header>

        {modalTab === 'comments' && existing ? (
          <div className="px-6 py-5">
            <div className="grid gap-3 mb-4">
              {!comments.length && (
                <p className="text-body text-ink-muted text-center py-6">No comments yet.</p>
              )}
              {comments.map(c => (
                <div key={c.id} className={`rounded-md p-3 text-body ${c.resolved ? 'opacity-50 bg-bg border border-line' : 'bg-accent-soft border border-accent/20'}`}>
                  <p className="whitespace-pre-line">{c.body}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-meta text-ink-muted">{new Date(c.createdAt!).toLocaleString()}</p>
                    <button
                      onClick={async () => {
                        await resolveComment(c.id, !c.resolved)
                        const updated = await listComments(existing!.id)
                        setComments(updated)
                      }}
                      className="text-meta uppercase tracking-[0.12em] text-ink-muted underline hover:text-ink"
                    >
                      {c.resolved ? 'Reopen' : 'Resolve'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-2">
              <textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                rows={3}
                className="input"
                placeholder="Leave a comment or review note…"
              />
              <button
                onClick={postComment}
                disabled={!commentText.trim() || commentBusy}
                className="btn-primary self-end disabled:opacity-40"
              >
                {commentBusy ? 'Posting…' : 'Post comment'}
              </button>
            </div>
          </div>
        ) : (

        <div className="px-6 py-5 grid gap-4">
          {/* Type + status workflow */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Type">
              <select
                value={item.type ?? 'post'}
                onChange={e => set('type', e.target.value as ContentType)}
                className="input"
              >
                {(['post', 'reel', 'story', 'blog', 'newsletter', 'event_promo'] as ContentType[]).map(t => (
                  <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                value={item.status ?? 'draft'}
                onChange={e => setStatus(e.target.value as ContentStatus)}
                className="input"
              >
                {(['draft','in_progress','submitted_for_review','changes_requested','approved','scheduled','published','archived'] as ContentStatus[]).map(s => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Loomly Brief — Thomas's Google Sheets framework */}
          <fieldset className="border border-line rounded-md p-4 grid gap-3">
            <legend className="text-meta uppercase tracking-[0.14em] text-ink-muted px-2 font-bold">
              Brief
            </legend>
            <Field label="Title / internal name">
              <input
                value={item.title ?? ''}
                onChange={e => set('title', e.target.value)}
                placeholder="What is this content about (internal)"
                className="input"
              />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Purpose">
                <input
                  list="purpose-list"
                  value={item.purpose ?? ''}
                  onChange={e => set('purpose', e.target.value)}
                  placeholder="Drive newsletter signups…"
                  className="input"
                />
                <datalist id="purpose-list">
                  {PURPOSES.map(p => <option key={p} value={p} />)}
                </datalist>
              </Field>
              <Field label="Post type">
                <input
                  list="posttype-list"
                  value={item.postType ?? ''}
                  onChange={e => set('postType', e.target.value)}
                  placeholder="Carousel, Reel…"
                  className="input"
                />
                <datalist id="posttype-list">
                  {POST_TYPES.map(p => <option key={p} value={p} />)}
                </datalist>
              </Field>
            </div>
            <Field label="Target audience">
              <input
                value={item.targetAudience ?? ''}
                onChange={e => set('targetAudience', e.target.value)}
                placeholder="Mid-career collectors in EU…"
                className="input"
              />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Hook">
                <input
                  value={item.hook ?? ''}
                  onChange={e => set('hook', e.target.value)}
                  placeholder="Opening line / scroll-stopper"
                  className="input"
                />
              </Field>
              <Field label="CTA">
                <input
                  value={item.cta ?? ''}
                  onChange={e => set('cta', e.target.value)}
                  placeholder="Visit the viewing room"
                  className="input"
                />
              </Field>
            </div>
            <Field label="CTA link">
              <input
                value={item.ctaUrl ?? ''}
                onChange={e => set('ctaUrl', e.target.value)}
                placeholder="https://…"
                className="input"
              />
            </Field>
          </fieldset>

          {/* Matrix — Thomas's framework fields */}
          <fieldset className="border border-line rounded-md p-4 grid gap-3">
            <legend className="text-meta uppercase tracking-[0.14em] text-ink-muted px-2 font-bold">
              Matrix
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Platform">
                <select
                  value={item.platform ?? ''}
                  onChange={e => set('platform', e.target.value || null)}
                  className="input"
                >
                  <option value="">— Choose platform —</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="x">X (Twitter)</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="tiktok">TikTok</option>
                  <option value="youtube">YouTube</option>
                  <option value="pinterest">Pinterest</option>
                  <option value="threads">Threads</option>
                </select>
              </Field>
              <Field label="Brand pillar">
                <input
                  list="pillar-list"
                  value={item.pillar ?? ''}
                  onChange={e => set('pillar', e.target.value || null)}
                  placeholder="Artist Story, Behind the Scenes…"
                  className="input"
                />
                <datalist id="pillar-list">
                  <option value="Artist Story" />
                  <option value="Behind the Scenes" />
                  <option value="New Work" />
                  <option value="Sales" />
                  <option value="Education" />
                  <option value="Community" />
                </datalist>
              </Field>
              <Field label="Funnel stage">
                <select
                  value={item.funnelStage ?? ''}
                  onChange={e => set('funnelStage', e.target.value || null)}
                  className="input"
                >
                  <option value="">—</option>
                  <option value="awareness">Awareness</option>
                  <option value="consideration">Consideration</option>
                  <option value="conversion">Conversion</option>
                  <option value="retention">Retention</option>
                </select>
              </Field>
              <Field label="Format">
                <select
                  value={item.format ?? ''}
                  onChange={e => set('format', e.target.value || null)}
                  className="input"
                >
                  <option value="">—</option>
                  <option value="carousel">Carousel</option>
                  <option value="reel">Reel</option>
                  <option value="static">Static</option>
                  <option value="video">Video</option>
                  <option value="story">Story</option>
                  <option value="article">Article</option>
                  <option value="email">Email</option>
                </select>
              </Field>
              <Field label="Audience segment">
                <input
                  list="audience-list"
                  value={item.audienceSegment ?? ''}
                  onChange={e => set('audienceSegment', e.target.value || null)}
                  placeholder="Collectors, press, curators…"
                  className="input"
                />
                <datalist id="audience-list">
                  <option value="collectors" />
                  <option value="first-time buyers" />
                  <option value="press" />
                  <option value="curators" />
                  <option value="investors" />
                  <option value="general" />
                </datalist>
              </Field>
              <Field label="KPI target">
                <select
                  value={item.kpi ?? ''}
                  onChange={e => set('kpi', e.target.value || null)}
                  className="input"
                >
                  <option value="">—</option>
                  <option value="reach">Reach</option>
                  <option value="engagement">Engagement</option>
                  <option value="leads">Leads</option>
                  <option value="sales">Sales</option>
                  <option value="website-clicks">Website clicks</option>
                  <option value="subscribers">Subscribers</option>
                </select>
              </Field>
            </div>
          </fieldset>

          {/* Copy / body — with AI generator */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-meta uppercase tracking-[0.14em] text-ink-muted">
                {item.type === 'blog' || item.type === 'newsletter' ? 'Body (markdown)' : 'Caption / copy'}
              </label>
              <button
                type="button"
                onClick={generateWithAI}
                disabled={aiBusy}
                className="text-meta uppercase tracking-[0.12em] text-accent underline hover:text-accent/80 disabled:opacity-40 inline-flex items-center gap-1"
              >
                {aiBusy ? 'Generating…' : '✦ Generate with AI'}
              </button>
            </div>
            <textarea
              value={(item.type === 'blog' || item.type === 'newsletter' ? item.bodyMd : item.copy) ?? ''}
              onChange={e =>
                item.type === 'blog' || item.type === 'newsletter'
                  ? set('bodyMd', e.target.value)
                  : set('copy', e.target.value)
              }
              rows={item.type === 'blog' || item.type === 'newsletter' ? 12 : 6}
              className="input"
              placeholder={item.type === 'blog' ? 'Full blog body…' : 'Caption…'}
            />
            {aiError && <p className="text-meta text-red-600 mt-1">{aiError}</p>}
          </div>

          {/* Hashtags */}
          {(item.type === 'post' || item.type === 'reel' || item.type === 'story') && (
            <Field label="Hashtags">
              <input
                value={(item.hashtags ?? []).join(' ')}
                onChange={e => set('hashtags', e.target.value.split(/\s+/).filter(Boolean))}
                placeholder="#contemporaryart #collector"
                className="input"
              />
            </Field>
          )}

          {/* Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Scheduled date & time">
              <input
                type="datetime-local"
                value={item.scheduledAt ? new Date(item.scheduledAt).toISOString().slice(0, 16) : ''}
                onChange={e => set('scheduledAt', e.target.value ? new Date(e.target.value).toISOString() : null)}
                className="input"
              />
            </Field>
            {item.type === 'event_promo' && (
              <Field label="Event date">
                <input
                  type="date"
                  value={item.eventDate ?? ''}
                  onChange={e => set('eventDate', e.target.value)}
                  className="input"
                />
              </Field>
            )}
          </div>
          {item.type === 'event_promo' && (
            <Field label="Event location">
              <input
                value={item.eventLocation ?? ''}
                onChange={e => set('eventLocation', e.target.value)}
                placeholder="Gallery, city, online…"
                className="input"
              />
            </Field>
          )}

          {/* Cover image URL */}
          <Field label="Cover image URL">
            <input
              value={item.coverUrl ?? ''}
              onChange={e => set('coverUrl', e.target.value)}
              placeholder="https://…"
              className="input"
            />
          </Field>
          {item.coverUrl && (
            <img src={item.coverUrl} alt="cover" className="max-h-48 object-cover border border-line rounded-sm" />
          )}
        </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-meta uppercase tracking-[0.14em] text-ink-muted mb-1">{label}</span>
      {children}
    </label>
  )
}
