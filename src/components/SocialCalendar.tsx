'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Mail,
  Megaphone,
  Copy,
  MessageSquare,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { uploadContentMediaBatch } from '@/lib/db/storage'
import { authedFetch } from '@/lib/db/authedFetch'
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
import type { Campaign, ContentComment, ContentItem, ContentStatus, ContentType } from '@/types'
import { createCampaign, deleteCampaign, listCampaigns, updateCampaign } from '@/lib/db/campaigns'
import LoginForm from './LoginForm'
import AdminPageHeader from './ui/AdminPageHeader'
import { useConfirm } from './ui/ConfirmDialog'
import { useToast } from './ui/toast'
import VideoPreview from './social/VideoPreview'

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
  const [view, setView] = useState<'platforms' | 'campaigns' | 'calendar' | 'kanban' | 'list'>('platforms')
  // Filters layered on top of every view
  const [filterType, setFilterType] = useState<ContentType | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<ContentStatus | 'all'>('all')
  const [filterCampaign, setFilterCampaign] = useState<string>('all')
  const [filterFrom, setFilterFrom] = useState<string>('')
  const [filterTo, setFilterTo] = useState<string>('')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [manageCampaigns, setManageCampaigns] = useState(false)
  const [duplicating, setDuplicating] = useState<ContentItem | null>(null)
  const [cursor, setCursor] = useState<Date>(startOfMonth(new Date()))
  const [editing, setEditing] = useState<ContentItem | null>(null)
  const [composing, setComposing] = useState<{ type: ContentType; date?: Date; platform?: string | null } | null>(null)
  const confirm = useConfirm()
  const toast = useToast()

  useEffect(() => {
    if (!user) return
    refresh()
    listCampaigns(user.id).then(setCampaigns).catch(() => {})
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

  async function refreshCampaigns() {
    if (!user) return
    setCampaigns(await listCampaigns(user.id))
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

  const fromTs = filterFrom ? new Date(filterFrom).getTime() : null
  const toTs = filterTo ? new Date(filterTo).getTime() + 86399999 : null
  const filteredList = list.filter(c => {
    if (filterType !== 'all' && c.type !== filterType) return false
    if (filterStatus !== 'all' && c.status !== filterStatus) return false
    if (filterCampaign !== 'all') {
      if (filterCampaign === 'none' ? !!c.campaignId : c.campaignId !== filterCampaign) return false
    }
    if (fromTs || toTs) {
      const t = c.scheduledAt ? new Date(c.scheduledAt).getTime() : null
      if (!t) return false
      if (fromTs && t < fromTs) return false
      if (toTs && t > toTs) return false
    }
    return true
  })

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <AdminPageHeader
        title="Social Calendar"
        actions={
          <>
            <div data-tour="social-views" className="hidden md:inline-flex items-center gap-1 mr-2">
              {(['platforms', 'campaigns', 'calendar', 'kanban', 'list'] as const).map(v => (
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
            <button onClick={() => setManageCampaigns(true)} className="btn-outline mr-2" title="Manage campaigns">
              Campaigns
            </button>
            <div data-tour="social-new" className="relative group">
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

      <main className="px-6 md:px-10 py-6 grid gap-4">
        {/* Filter bar — applies to every view */}
        <div className="bg-paper border border-line rounded-md px-4 py-2 flex items-center gap-3 flex-wrap text-meta">
          <span className="uppercase tracking-[0.14em] text-ink-muted">Filter:</span>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as ContentType | 'all')}
            className="input !w-auto !h-8 !py-1"
            aria-label="Filter by type"
          >
            <option value="all">All types</option>
            {(['post', 'reel', 'story', 'blog', 'newsletter', 'event_promo'] as ContentType[]).map(t => (
              <option key={t} value={t}>{TYPE_LABEL[t]}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as ContentStatus | 'all')}
            className="input !w-auto !h-8 !py-1"
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            {(['draft','in_progress','submitted_for_review','changes_requested','approved','scheduled','published','archived'] as ContentStatus[]).map(s => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
          <select
            value={filterCampaign}
            onChange={e => setFilterCampaign(e.target.value)}
            className="input !w-auto !h-8 !py-1"
            aria-label="Filter by campaign"
          >
            <option value="all">All campaigns</option>
            <option value="none">No campaign</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <span className="inline-flex items-center gap-1 text-meta uppercase tracking-[0.14em] text-ink-muted">From</span>
          <input
            type="date"
            value={filterFrom}
            onChange={e => setFilterFrom(e.target.value)}
            className="input !w-auto !h-8 !py-1 text-[11px]"
            aria-label="From date"
          />
          <span className="text-meta uppercase tracking-[0.14em] text-ink-muted">To</span>
          <input
            type="date"
            value={filterTo}
            onChange={e => setFilterTo(e.target.value)}
            className="input !w-auto !h-8 !py-1 text-[11px]"
            aria-label="To date"
          />
          {(filterType !== 'all' || filterStatus !== 'all' || filterCampaign !== 'all' || filterFrom || filterTo) && (
            <button
              onClick={() => {
                setFilterType('all'); setFilterStatus('all')
                setFilterCampaign('all'); setFilterFrom(''); setFilterTo('')
              }}
              className="text-meta uppercase tracking-[0.14em] text-ink-muted hover:text-ink underline"
            >
              Clear
            </button>
          )}
          <span className="ml-auto text-ink-muted">{filteredList.length} of {list.length}</span>
        </div>

        {view === 'platforms' && (
          <PlatformView
            items={filteredList}
            onItemClick={item => setEditing(item)}
            onNew={type => setComposing({ type })}
            onNewForGroup={g => setComposing({ type: g.newType, platform: g.newPlatform ?? null })}
            onDuplicate={item => setDuplicating(item)}
          />
        )}
        {view === 'campaigns' && (
          <CampaignView
            items={filteredList}
            campaigns={campaigns}
            onItemClick={item => setEditing(item)}
            onManage={() => setManageCampaigns(true)}
          />
        )}
        {view === 'calendar' && (
          <CalendarView
            cursor={cursor}
            setCursor={setCursor}
            items={filteredList}
            onCellClick={(date, type) => setComposing({ type, date })}
            onItemClick={item => setEditing(item)}
          />
        )}
        {view === 'kanban' && (
          <KanbanView
            items={filteredList}
            onItemClick={item => setEditing(item)}
            onStatus={quickStatus}
            onDuplicate={item => setDuplicating(item)}
          />
        )}
        {view === 'list' && (
          <ListView
            items={filteredList}
            onItemClick={item => setEditing(item)}
            onDelete={remove}
            onDuplicate={item => setDuplicating(item)}
          />
        )}
      </main>

      {composing && (
        <ComposerModal
          ownerId={user.id}
          campaigns={campaigns}
          initial={{
            type: composing.type,
            scheduledAt: composing.date?.toISOString() ?? null,
            platform: composing.platform ?? null,
          }}
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
          campaigns={campaigns}
          existing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            refresh()
          }}
        />
      )}
      {manageCampaigns && (
        <ManageCampaignsModal
          ownerId={user.id}
          campaigns={campaigns}
          onClose={() => setManageCampaigns(false)}
          onChange={refreshCampaigns}
        />
      )}
      {duplicating && (
        <DuplicateModal
          source={duplicating}
          ownerId={user.id}
          onClose={() => setDuplicating(null)}
          onDone={() => { setDuplicating(null); refresh() }}
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
// Platforms view — DEFAULT: posts grouped by source (each platform,
// Blog, Newsletter, Events). Reads like a publication board: one
// column per channel, scannable images + status at a glance.
// ============================================================
interface PlatformGroup {
  id: string
  label: string
  matches: (c: ContentItem) => boolean
  // Defaults used when the user clicks the "+" on this column.
  // Lets each column spawn the right kind of post pre-tagged with its
  // platform so the approver sees it in the same column.
  newType: ContentType
  newPlatform?: string | null
}
const PLATFORM_GROUPS: PlatformGroup[] = [
  { id: 'instagram', label: 'Instagram', matches: c => c.platform === 'instagram', newType: 'post', newPlatform: 'instagram' },
  { id: 'tiktok',    label: 'TikTok',    matches: c => c.platform === 'tiktok',    newType: 'reel', newPlatform: 'tiktok' },
  { id: 'facebook',  label: 'Facebook',  matches: c => c.platform === 'facebook',  newType: 'post', newPlatform: 'facebook' },
  { id: 'x',         label: 'X',         matches: c => c.platform === 'x',         newType: 'post', newPlatform: 'x' },
  { id: 'linkedin',  label: 'LinkedIn',  matches: c => c.platform === 'linkedin',  newType: 'post', newPlatform: 'linkedin' },
  { id: 'youtube',   label: 'YouTube',   matches: c => c.platform === 'youtube',   newType: 'reel', newPlatform: 'youtube' },
  { id: 'pinterest', label: 'Pinterest', matches: c => c.platform === 'pinterest', newType: 'post', newPlatform: 'pinterest' },
  { id: 'threads',   label: 'Threads',   matches: c => c.platform === 'threads',   newType: 'post', newPlatform: 'threads' },
  { id: 'blog',      label: 'Blog',      matches: c => c.type === 'blog' && !c.platform, newType: 'blog' },
  { id: 'newsletter', label: 'Newsletter', matches: c => c.type === 'newsletter' && !c.platform, newType: 'newsletter' },
  { id: 'events',    label: 'Events',    matches: c => c.type === 'event_promo' && !c.platform, newType: 'event_promo' },
  { id: 'unassigned', label: 'Unassigned', matches: c =>
      !c.platform && c.type !== 'blog' && c.type !== 'newsletter' && c.type !== 'event_promo', newType: 'post' },
]

function PlatformView({
  items,
  onItemClick,
  onNew,
  onNewForGroup,
  onDuplicate,
}: {
  items: ContentItem[]
  onItemClick: (item: ContentItem) => void
  onNew: (type: ContentType) => void
  onNewForGroup: (group: PlatformGroup) => void
  onDuplicate: (item: ContentItem) => void
}) {
  // Show every group whose match function ever triggers OR that has
  // items. Empty columns stay visible when they're "primary" platforms
  // so the user can use the column's + button to seed the first post.
  const PRIMARY_IDS = new Set([
    'instagram','tiktok','facebook','x','linkedin','youtube','pinterest','threads',
    'blog','newsletter','events',
  ])
  const groups = PLATFORM_GROUPS
    .map(g => ({ ...g, items: items.filter(g.matches) }))
    .filter(g => g.items.length > 0 || PRIMARY_IDS.has(g.id))
  if (items.length === 0) {
    return (
      <div className="bg-paper border border-line rounded-md p-8 text-center">
        <p className="text-body text-ink-muted">No content matches the current filter.</p>
        <button onClick={() => onNew('post')} className="btn-primary mt-3">
          <Plus size={14} strokeWidth={2.5} /> New post
        </button>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {groups.map(g => (
        <section key={g.id} className="bg-paper border border-line rounded-md p-3 min-h-[240px]">
          <div className="flex items-center justify-between mb-3 gap-2">
            <p className="font-display text-meta uppercase tracking-[0.14em]">{g.label}</p>
            <span className="text-meta tracking-[0.14em] text-ink-muted ml-auto">{g.items.length}</span>
            <button
              onClick={() => onNewForGroup(g)}
              title={`New ${g.label} post`}
              aria-label={`New ${g.label} post`}
              className="w-6 h-6 grid place-items-center rounded-sm border border-line text-ink-muted hover:border-ink hover:text-ink transition-colors"
            >
              <Plus size={12} strokeWidth={2.5} />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {g.items
              .slice()
              .sort((a, b) => (b.scheduledAt ?? '').localeCompare(a.scheduledAt ?? ''))
              .map(c => (
                <article
                  key={c.id}
                  className="border border-line rounded-sm p-2 bg-paper hover:border-ink hover:shadow-sm transition-all group relative"
                >
                  <div
                    className="flex items-start gap-2 cursor-pointer"
                    onClick={() => onItemClick(c)}
                  >
                    {c.coverUrl && (
                      <img
                        src={c.coverUrl}
                        alt=""
                        className="w-12 h-12 object-cover border border-line/60 rounded-xs shrink-0 bg-bg"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-bold truncate">{c.title || <span className="text-ink-muted italic">(untitled)</span>}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className={`text-[9px] tracking-[0.12em] uppercase font-bold px-1.5 py-0.5 rounded-xs ${STATUS_COLOR[c.status] ?? 'bg-line text-ink-muted'}`}>
                          {STATUS_LABEL[c.status] ?? c.status}
                        </span>
                        {c.scheduledAt && (
                          <span className="text-meta text-ink-muted">
                            {new Date(c.scheduledAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Always-visible duplicate-to-other-platforms action */}
                  <button
                    data-tour="social-duplicate"
                    onClick={e => { e.stopPropagation(); onDuplicate(c) }}
                    title="Duplicate to other platforms"
                    className="absolute top-1 right-1 w-6 h-6 grid place-items-center rounded-sm bg-paper/90 backdrop-blur border border-line text-ink-muted hover:text-ink hover:border-ink transition-colors"
                  >
                    <Copy size={11} />
                  </button>
                </article>
              ))}
          </div>
          <button
            onClick={() => onNewForGroup(g)}
            className="mt-2 w-full inline-flex items-center justify-center gap-1 text-meta uppercase tracking-[0.14em] text-ink-muted hover:text-ink py-1.5 border border-dashed border-line rounded-sm hover:border-ink transition-colors"
            title={`New ${g.label} post`}
          >
            <Plus size={11} /> Add
          </button>
        </section>
      ))}
    </div>
  )
}

// ============================================================
// Kanban (status pipeline — Buffer / ContentCal style)
// ============================================================
function KanbanView({
  items,
  onItemClick,
  onStatus,
  onDuplicate,
}: {
  items: ContentItem[]
  onItemClick: (item: ContentItem) => void
  onStatus: (item: ContentItem, status: ContentStatus) => void
  onDuplicate?: (item: ContentItem) => void
}) {
  const cols: ContentStatus[] = ['draft', 'in_progress', 'submitted_for_review', 'approved', 'scheduled', 'published']
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<ContentStatus | null>(null)

  function onDragStart(e: React.DragEvent, it: ContentItem) {
    setDragId(it.id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', it.id)
  }
  function onDragOver(e: React.DragEvent, col: ContentStatus) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverCol !== col) setDragOverCol(col)
  }
  function onDrop(e: React.DragEvent, col: ContentStatus) {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain') || dragId
    setDragId(null)
    setDragOverCol(null)
    if (!id) return
    const item = items.find(i => i.id === id)
    if (!item || item.status === col) return
    onStatus(item, col)
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
      {cols.map(col => {
        const colItems = items.filter(i => i.status === col)
        const isOver = dragOverCol === col
        return (
          <section
            key={col}
            onDragOver={e => onDragOver(e, col)}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={e => onDrop(e, col)}
            className={`bg-paper border rounded-md p-3 min-h-[200px] transition-colors ${
              isOver ? 'border-accent bg-accent-soft' : 'border-line'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="font-display text-meta uppercase tracking-[0.14em]">
                {STATUS_LABEL[col]}
              </p>
              <span className="text-meta tracking-[0.14em] text-ink-muted">{colItems.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {colItems.map(it => {
                const Icon = TYPE_ICON[it.type]
                const isDragging = dragId === it.id
                return (
                  <article
                    key={it.id}
                    draggable
                    onDragStart={e => onDragStart(e, it)}
                    onDragEnd={() => { setDragId(null); setDragOverCol(null) }}
                    onClick={() => onItemClick(it)}
                    className={`relative border border-line rounded-sm p-2 bg-bg/50 cursor-grab active:cursor-grabbing hover:border-ink transition-opacity ${
                      isDragging ? 'opacity-40' : ''
                    }`}
                  >
                    {onDuplicate && (
                      <button
                        onClick={e => { e.stopPropagation(); onDuplicate(it) }}
                        title="Duplicate to other platforms"
                        className="absolute top-1 right-1 w-5 h-5 grid place-items-center rounded-sm bg-paper/90 border border-line text-ink-muted hover:text-ink hover:border-ink"
                      >
                        <Copy size={10} />
                      </button>
                    )}
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap pr-6">
                      <Icon size={11} className="text-ink-muted" />
                      <span className="text-meta uppercase tracking-[0.14em] text-ink-muted">
                        {TYPE_LABEL[it.type]}
                      </span>
                      {it.platform && (
                        <span className="text-meta tracking-[0.12em] uppercase bg-bg border border-line/80 px-1 rounded-xs text-ink-muted">
                          {it.platform}
                        </span>
                      )}
                    </div>
                    <p className="text-body font-bold truncate">{it.title || '(untitled)'}</p>
                    {(it.pillar || it.format) && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {it.pillar && (
                          <span className="text-[9px] tracking-[0.12em] uppercase text-ink-muted">{it.pillar}</span>
                        )}
                        {it.pillar && it.format && <span className="text-ink-muted">·</span>}
                        {it.format && (
                          <span className="text-[9px] tracking-[0.12em] uppercase text-accent">{it.format}</span>
                        )}
                      </div>
                    )}
                    {it.scheduledAt && (
                      <p className="text-meta text-ink-muted mt-1 inline-flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(it.scheduledAt).toLocaleString('en', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    )}
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
  onDuplicate,
}: {
  items: ContentItem[]
  onItemClick: (item: ContentItem) => void
  onDelete: (id: string) => void
  onDuplicate?: (item: ContentItem) => void
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
            <th className="text-left py-2 px-3 hidden md:table-cell">Platform</th>
            <th className="text-left py-2 px-3 hidden lg:table-cell">Pillar</th>
            <th className="text-left py-2 px-3 hidden lg:table-cell">Format</th>
            <th className="text-left py-2 px-3 hidden xl:table-cell">Funnel</th>
            <th className="text-left py-2 px-3 hidden xl:table-cell">Audience</th>
            <th className="text-left py-2 px-3">Status</th>
            <th className="text-left py-2 px-3 hidden md:table-cell">Scheduled</th>
            <th className="text-right py-2 px-3"></th>
          </tr>
        </thead>
        <tbody>
          {items.map(it => (
            <tr key={it.id} className="border-b border-line/60 hover:bg-bg cursor-pointer" onClick={() => onItemClick(it)}>
              <td className="py-2 px-3">
                <p className="font-bold truncate max-w-[280px]">{it.title || '(untitled)'}</p>
                {it.purpose && <p className="text-meta text-ink-muted truncate max-w-[280px]">{it.purpose}</p>}
              </td>
              <td className="py-2 px-3 text-ink-muted text-meta uppercase tracking-[0.12em]">{TYPE_LABEL[it.type]}</td>
              <td className="py-2 px-3 hidden md:table-cell">
                {it.platform ? (
                  <span className="text-meta tracking-[0.12em] uppercase bg-bg border border-line px-1.5 py-0.5 rounded-xs">{it.platform}</span>
                ) : <span className="text-ink-muted">—</span>}
              </td>
              <td className="py-2 px-3 hidden lg:table-cell text-meta text-ink-muted truncate max-w-[140px]">{it.pillar || '—'}</td>
              <td className="py-2 px-3 hidden lg:table-cell">
                {it.format ? (
                  <span className="text-meta tracking-[0.12em] uppercase text-accent">{it.format}</span>
                ) : <span className="text-ink-muted">—</span>}
              </td>
              <td className="py-2 px-3 hidden xl:table-cell text-meta text-ink-muted">{it.funnelStage || '—'}</td>
              <td className="py-2 px-3 hidden xl:table-cell text-meta text-ink-muted truncate max-w-[120px]">{it.audienceSegment || '—'}</td>
              <td className="py-2 px-3">
                <span className={`inline-block px-2 py-0.5 rounded-xs text-meta tracking-[0.14em] uppercase ${STATUS_COLOR[it.status]}`}>
                  {STATUS_LABEL[it.status]}
                </span>
              </td>
              <td className="py-2 px-3 hidden md:table-cell text-ink-muted text-[11px]">
                {it.scheduledAt ? new Date(it.scheduledAt).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
              </td>
              <td className="py-2 px-3 text-right">
                <div className="inline-flex items-center gap-2">
                  {onDuplicate && (
                    <button
                      onClick={e => { e.stopPropagation(); onDuplicate(it) }}
                      className="text-ink-muted hover:text-ink"
                      title="Duplicate to other platforms"
                    >
                      <Copy size={14} />
                    </button>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(it.id) }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
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

export function ComposerModal({
  ownerId,
  initial,
  existing,
  campaigns,
  onClose,
  onSaved,
}: {
  ownerId: string
  initial?: Partial<ContentItem> & { type: ContentType }
  existing?: ContentItem
  campaigns: Campaign[]
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
  // Composer is itself split into two tabs: the approver-friendly
  // 'content' (title + caption + hashtags + images) and 'details'
  // (type, brief, matrix, campaign, schedule).
  const [composerTab, setComposerTab] = useState<'content' | 'details'>('content')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  // Image-upload state. We need a stable contentId for the storage path even
  // before the row is saved; for unsaved drafts we mint a short nonce.
  const [uploadBusy, setUploadBusy] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const draftIdRef = useRef<string>(existing?.id ?? `draft-${Math.random().toString(36).slice(2, 10)}`)

  async function generateWithAI() {
    setAiBusy(true)
    setAiError(null)
    try {
      const res = await authedFetch('/api/ai/generate-content', {
        method: 'POST',
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

  async function handleFileUpload(filesList: FileList | File[]): Promise<void> {
    const files = Array.from(filesList).filter(f => f.size > 0)
    if (!files.length) return
    const currentMedia = item.mediaUrls ?? []
    const remainingSlots = 10 - currentMedia.length - (item.coverUrl ? 1 : 0)
    if (remainingSlots <= 0) {
      setUploadError('Max 10 images per post. Remove one to add more.')
      return
    }
    const toUpload = files.slice(0, remainingSlots)
    if (files.length > remainingSlots) {
      setUploadError(`Only uploaded ${remainingSlots} of ${files.length} (10-image cap).`)
    } else {
      setUploadError(null)
    }
    setUploadBusy(true)
    try {
      const results = await uploadContentMediaBatch(toUpload, ownerId, draftIdRef.current)
      const ok = results.filter(r => r.url).map(r => r.url!)
      const failed = results.filter(r => r.error)
      if (failed.length) {
        setUploadError(`${failed.length} of ${results.length} failed: ${failed[0].error}`)
      }
      if (!ok.length) return
      // First uploaded image becomes cover if there isn't one yet.
      setItem(s => {
        const nextCover = s.coverUrl ?? ok[0]
        const rest = s.coverUrl ? ok : ok.slice(1)
        const merged = [...(s.mediaUrls ?? []), ...rest]
        return { ...s, coverUrl: nextCover, mediaUrls: merged }
      })
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e))
    } finally {
      setUploadBusy(false)
    }
  }

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
          {/* Preview-live — opens the externally-hosted URL the management team uploaded. */}
          {existing && existing.publishedUrl &&
            (existing.type === 'blog' || existing.type === 'newsletter') && (
              <a
                href={existing.publishedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-meta uppercase tracking-[0.12em] text-accent underline hover:text-accent/80"
                title="Open the published page in a new tab"
              >
                Preview live →
              </a>
            )
          }
          {existing && (
            <div className="flex gap-1 ml-2 bg-bg/60 rounded-md p-0.5">
              {(['edit', 'comments'] as const).map(t => {
                const isActive = modalTab === t
                return (
                  <button
                    key={t}
                    onClick={() => setModalTab(t)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`!rounded-md !py-1 !px-3 text-meta uppercase tracking-[0.12em] font-bold transition-colors ${
                      isActive
                        ? 'bg-ink text-paper'
                        : 'text-ink-muted hover:text-ink hover:bg-paper'
                    }`}
                  >
                    {t === 'comments' ? (
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare size={11} /> {comments.length > 0 ? comments.length : ''}
                        {t}
                      </span>
                    ) : t}
                  </button>
                )
              })}
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
          {/* Composer tabs: Content for the approver (image / title /
              caption / hashtags / variant images); Details for matrix,
              brief, campaign, schedule — all the planning metadata. */}
          <div className="border-b border-line -mx-6 px-6">
            <nav className="flex gap-1 -mb-px" aria-label="Composer sections">
              {(['content', 'details'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setComposerTab(t)}
                  className={`inline-flex items-center gap-1.5 px-4 h-10 text-meta uppercase tracking-[0.14em] transition-colors border-b-2 -mb-px ${
                    composerTab === t
                      ? 'border-ink text-ink font-bold bg-bg/40'
                      : 'border-transparent text-ink-muted hover:text-ink hover:border-line hover:bg-bg/20'
                  }`}
                  aria-current={composerTab === t ? 'page' : undefined}
                >
                  {t === 'content' ? 'Content' : 'Details'}
                </button>
              ))}
              <span className="ml-auto self-center inline-flex items-center gap-2 text-meta">
                <select
                  value={item.status ?? 'draft'}
                  onChange={e => setStatus(e.target.value as ContentStatus)}
                  className="input !h-8 !py-1 !w-auto text-[11px]"
                  aria-label="Status"
                >
                  {(['draft','in_progress','submitted_for_review','changes_requested','approved','scheduled','published','archived'] as ContentStatus[]).map(s => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </span>
            </nav>
          </div>

        {composerTab === 'content' && (
          <>
            {/* Brief-at-a-glance strip — read-only mirror of planning fields
                so the approver sees platform / hook / schedule / post type
                without leaving the Content tab. Click 'Edit in Details' to
                modify any of them. */}
            <div className="bg-bg/40 border border-line rounded-md p-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-meta">
              <div>
                <p className="uppercase tracking-[0.14em] text-ink-muted">Platform</p>
                <p className="font-bold text-ink mt-0.5">{item.platform || <span className="text-ink-muted font-normal">— not set</span>}</p>
              </div>
              <div>
                <p className="uppercase tracking-[0.14em] text-ink-muted">Schedule</p>
                <p className="font-bold text-ink mt-0.5">
                  {item.scheduledAt
                    ? new Date(item.scheduledAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : <span className="text-ink-muted font-normal">— not scheduled</span>}
                </p>
              </div>
              <div>
                <p className="uppercase tracking-[0.14em] text-ink-muted">Post type</p>
                <p className="font-bold text-ink mt-0.5">{item.postType || <span className="text-ink-muted font-normal">—</span>}</p>
              </div>
              <div>
                <p className="uppercase tracking-[0.14em] text-ink-muted">Hook</p>
                <p className="font-bold text-ink mt-0.5 truncate" title={item.hook ?? ''}>{item.hook || <span className="text-ink-muted font-normal">—</span>}</p>
              </div>
              <button
                type="button"
                onClick={() => setComposerTab('details')}
                className="md:col-span-4 text-left text-meta uppercase tracking-[0.12em] text-accent underline hover:text-accent/80"
              >
                Edit any of these in Details →
              </button>
            </div>

            {/* Title — top of the approver view */}
            <Field label="Title">
              <input
                value={item.title ?? ''}
                onChange={e => set('title', e.target.value)}
                placeholder="What is this content about"
                className="input"
              />
            </Field>
          </>
        )}
        {composerTab === 'details' && (<>
          {/* Type only — status moved up to the tab bar so it lives
              alongside the approver-visible controls. */}
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
          </div>

          {/* Loomly Brief — Thomas's Google Sheets framework */}
          <fieldset className="border border-line rounded-md p-4 grid gap-3">
            <legend className="text-meta uppercase tracking-[0.14em] text-ink-muted px-2 font-bold">
              Brief
            </legend>
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

          {/* Matrix — planning metadata, stays in Details tab */}
          <fieldset data-matrix-fieldset className="border border-line rounded-md p-4 grid gap-3">
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
        </>)}

        {composerTab === 'content' && (<>
          {/* Blog + newsletter live on external sites (Squarespace, Substack,
              Mailchimp). Management team pastes the public URL — approver
              clicks 'Preview live' to view it. No in-app render. */}
          {(item.type === 'blog' || item.type === 'newsletter') && (
            <fieldset className="border border-line rounded-md p-4 grid gap-3">
              <legend className="text-meta uppercase tracking-[0.14em] text-ink-muted px-2 font-bold">
                Published URL
              </legend>
              <Field label={item.type === 'blog' ? 'Live blog post URL' : 'Live newsletter URL'}>
                <input
                  value={item.publishedUrl ?? ''}
                  onChange={e => set('publishedUrl', e.target.value || null)}
                  placeholder="https://yoursite.com/journal/spring-show"
                  className="input"
                  type="url"
                />
                <p className="mt-1 text-meta text-ink-muted">
                  Paste the public URL from your blog / newsletter provider. Approver clicks &ldquo;Preview live&rdquo; to review.
                </p>
              </Field>
              {item.publishedUrl && (
                <a
                  href={item.publishedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center self-start text-meta uppercase tracking-[0.12em] text-accent underline hover:text-accent/80"
                >
                  Open published page →
                </a>
              )}
            </fieldset>
          )}
          {/* Type-specific extras shown above the caption/body */}
          {item.type === 'newsletter' && (
            <div className="grid gap-3">
              <Field label="Subject line">
                <input
                  value={item.subjectLine ?? ''}
                  onChange={e => set('subjectLine', e.target.value || null)}
                  placeholder="What lands in the inbox subject"
                  className="input"
                  maxLength={120}
                />
                <p className="mt-1 text-meta text-ink-muted">
                  {(item.subjectLine?.length ?? 0)} / 120 chars · keep under 60 for mobile previews
                </p>
              </Field>
              <Field label="Preview text">
                <input
                  value={item.previewText ?? ''}
                  onChange={e => set('previewText', e.target.value || null)}
                  placeholder="Inbox preview line — the one after the subject"
                  className="input"
                  maxLength={140}
                />
                <p className="mt-1 text-meta text-ink-muted">
                  {(item.previewText?.length ?? 0)} / 140 chars
                </p>
              </Field>
            </div>
          )}
          {(item.type === 'reel' || (item.type === 'post' && item.platform === 'youtube')) && (
            <Field label="Video URL">
              <input
                value={item.videoUrl ?? ''}
                onChange={e => set('videoUrl', e.target.value || null)}
                placeholder="https://… (mp4, YouTube, Vimeo)"
                className="input"
              />
              {item.videoUrl && <VideoPreview url={item.videoUrl} />}
            </Field>
          )}
          {item.type === 'blog' && (
            <Field label="Tags">
              <input
                value={(item.tags ?? []).join(', ')}
                onChange={e => set('tags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder="contemporary art, sculpture, collector"
                className="input"
              />
              <p className="mt-1 text-meta text-ink-muted">
                Comma-separated · {(item.tags ?? []).length} tag{(item.tags ?? []).length === 1 ? '' : 's'}
              </p>
            </Field>
          )}

          {/* Copy / body — type & platform-aware: each social network has
              its own ceiling and tone. Composer shows the limit + a live
              counter so the approver knows it'll publish cleanly. */}
          {(() => {
            const platform = item.platform ?? null
            const type = item.type ?? 'post'
            const isLong = type === 'blog' || type === 'newsletter'
            // Platform-specific copy ceilings, drawn from each network's
            // public limit. Null when no meaningful cap.
            const PLATFORM_LIMIT: Record<string, { max: number; label: string }> = {
              x:         { max: 280,   label: 'X — 280 chars' },
              threads:   { max: 500,   label: 'Threads — 500 chars' },
              instagram: { max: 2200,  label: 'Instagram caption — 2,200 chars' },
              facebook:  { max: 63206, label: 'Facebook — up to 63k chars' },
              linkedin:  { max: 3000,  label: 'LinkedIn — 3,000 chars' },
              tiktok:    { max: 2200,  label: 'TikTok caption — 2,200 chars' },
              youtube:   { max: 5000,  label: 'YouTube description — 5,000 chars' },
              pinterest: { max: 500,   label: 'Pinterest — 500 chars' },
            }
            const limit = platform ? PLATFORM_LIMIT[platform] : null
            const label =
              type === 'blog' ? 'Internal notes (the published version lives at the URL above)'
              : type === 'newsletter' ? 'Internal notes (the published version lives at the URL above)'
              : type === 'event_promo' ? 'Event description'
              : type === 'story' ? 'Story caption'
              : type === 'reel' ? 'Reel caption'
              : 'Caption'
            const placeholder =
              type === 'blog' ? 'Brief, angle, draft notes — for the team only'
              : type === 'newsletter' ? 'Brief, angle, draft notes — for the team only'
              : platform === 'x' ? 'Keep it tight. Hook + link.'
              : platform === 'linkedin' ? 'Lead with insight. Short paragraphs read better.'
              : platform === 'tiktok' ? 'Hook in the first line. Add a clear CTA.'
              : platform === 'youtube' ? 'Hook in line one; details below; timestamps + links at the bottom.'
              : platform === 'instagram' ? 'Caption. Line breaks help readability.'
              : 'Caption…'
            const value = (isLong ? item.bodyMd : item.copy) ?? ''
            const count = value.length
            const over = limit && count > limit.max
            return (
              <div>
                <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                  <label className="block text-meta uppercase tracking-[0.14em] text-ink-muted">{label}</label>
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
                  value={value}
                  onChange={e =>
                    isLong ? set('bodyMd', e.target.value) : set('copy', e.target.value)
                  }
                  rows={isLong ? 12 : (platform === 'x' || platform === 'threads' ? 4 : 6)}
                  className={`input ${over ? '!border-red-400' : ''}`}
                  placeholder={placeholder}
                />
                <div className="flex items-center justify-between mt-1 text-meta text-ink-muted">
                  {aiError ? <span className="text-red-600">{aiError}</span> : <span />}
                  {limit && (
                    <span className={over ? 'text-red-600 font-bold' : ''}>
                      {count.toLocaleString()} / {limit.max.toLocaleString()} · {limit.label}
                    </span>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Hashtags — count hint scales to the platform's sweet spot */}
          {(item.type === 'post' || item.type === 'reel' || item.type === 'story') && (() => {
            const platform = item.platform ?? null
            const HASHTAG_MAX: Record<string, number> = {
              instagram: 30,
              tiktok: 30,
              x: 5,
              linkedin: 5,
              facebook: 10,
              threads: 10,
              pinterest: 20,
              youtube: 15,
            }
            const max = platform ? HASHTAG_MAX[platform] : null
            const tags = item.hashtags ?? []
            const over = max != null && tags.length > max
            // Pull #word tokens from the caption / body, surface ones not
            // already in the dedicated hashtags field as one-click chips.
            const normaliseTag = (t: string) => t.replace(/^#+/, '').toLowerCase()
            const captionSources = [item.copy, item.bodyMd].filter(Boolean) as string[]
            const inCaption = Array.from(new Set(
              captionSources
                .flatMap(text => text.match(/(?:^|\s)#([\p{L}\p{N}_]{2,40})/gu) ?? [])
                .map(s => s.trim().replace(/^#/, '').toLowerCase()),
            ))
            const existingNorm = new Set(tags.map(normaliseTag))
            const suggestions = inCaption.filter(t => !existingNorm.has(t)).slice(0, 8)
            return (
              <Field label="Hashtags">
                <input
                  value={tags.join(' ')}
                  onChange={e => set('hashtags', e.target.value.split(/\s+/).filter(Boolean))}
                  placeholder={
                    platform === 'x' ? '1–2 well-placed tags work best on X'
                    : platform === 'linkedin' ? 'Up to 5 niche tags'
                    : '#contemporaryart #collector'
                  }
                  className={`input ${over ? '!border-red-400' : ''}`}
                />
                {max != null && (
                  <p className={`mt-1 text-meta ${over ? 'text-red-600 font-bold' : 'text-ink-muted'}`}>
                    {tags.length} / {max} on {platform}
                  </p>
                )}
                {suggestions.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                    <span className="text-meta uppercase tracking-[0.12em] text-ink-muted/70">From caption:</span>
                    {suggestions.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => set('hashtags', [...tags, `#${t}`])}
                        className="text-meta text-accent hover:text-accent/80 border border-line hover:border-ink px-1.5 py-0.5 rounded-xs"
                      >
                        + #{t}
                      </button>
                    ))}
                  </div>
                )}
              </Field>
            )
          })()}
        </>)}

        {composerTab === 'details' && (<>
          {/* Campaign — Upfluence-style grouping */}
          <Field label="Campaign">
            <select
              value={item.campaignId ?? ''}
              onChange={e => set('campaignId', e.target.value || null)}
              className="input"
            >
              <option value="">— No campaign —</option>
              {campaigns.filter(c => c.status !== 'archived').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

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
        </>)}

        {composerTab === 'content' && (<>
          {/* Images — hero cover above with prominent preview, variants
              underneath as a thumb grid with promote-to-cover affordance. */}
          <fieldset className="border border-line rounded-md p-4 grid gap-3">
            <legend className="text-meta uppercase tracking-[0.14em] text-ink-muted px-2 font-bold">Images</legend>

            {/* Hero cover preview — what the approver sees first */}
            {item.coverUrl ? (
              <div className="relative bg-bg border border-line rounded-md overflow-hidden">
                <img src={item.coverUrl} alt="cover" className="w-full max-h-[360px] object-contain bg-black/5" />
                <span className="absolute top-2 left-2 text-[9px] tracking-[0.14em] uppercase font-bold px-1.5 py-0.5 rounded-xs bg-ink text-paper">
                  Cover
                </span>
                <button
                  onClick={() => set('coverUrl', null)}
                  className="absolute top-2 right-2 w-7 h-7 grid place-items-center rounded-sm bg-paper/90 backdrop-blur border border-line text-ink-muted hover:text-ink hover:border-ink"
                  title="Remove cover"
                  type="button"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div className="border border-dashed border-line rounded-md p-6 text-center grid gap-2 place-items-center">
                <p className="text-meta text-ink-muted">No cover image yet.</p>
                <button
                  type="button"
                  onClick={() => uploadInputRef.current?.click()}
                  disabled={uploadBusy}
                  className="btn-outline disabled:opacity-40"
                >
                  <Upload size={12} /> {uploadBusy ? 'Uploading…' : 'Upload photos'}
                </button>
                <p className="text-meta text-ink-muted/70">JPEG, PNG, WebP or GIF · up to 5 MB each · max 10 per post</p>
              </div>
            )}
            <Field label="Cover image URL">
              <input
                value={item.coverUrl ?? ''}
                onChange={e => set('coverUrl', e.target.value)}
                placeholder="https://…"
                className="input"
              />
            </Field>

            {/* Hidden file input for the upload buttons below */}
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={e => {
                if (e.target.files) handleFileUpload(e.target.files)
                e.target.value = ''
              }}
            />

            {/* Variant gallery — 3-up thumbs with promote/remove */}
            <div>
              <div className="flex items-baseline justify-between mb-2 gap-2 flex-wrap">
                <label className="block text-meta uppercase tracking-[0.14em] text-ink-muted font-bold">
                  Variants ({(item.mediaUrls ?? []).length})
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
                    disabled={uploadBusy}
                    className="inline-flex items-center gap-1 text-meta uppercase tracking-[0.14em] text-accent hover:text-accent/80 disabled:opacity-40"
                  >
                    <Upload size={11} /> {uploadBusy ? 'Uploading…' : 'Upload photos'}
                  </button>
                  <button
                    type="button"
                    onClick={() => set('mediaUrls', [...(item.mediaUrls ?? []), ''])}
                    className="inline-flex items-center gap-1 text-meta uppercase tracking-[0.14em] text-ink-muted hover:text-ink"
                  >
                    <Plus size={11} /> Paste URL
                  </button>
                </div>
              </div>
              {uploadError && (
                <p className="text-meta text-red-600 mb-2">· {uploadError}</p>
              )}
              {(item.mediaUrls ?? []).length === 0 ? (
                <p className="text-meta text-ink-muted text-center py-3 border border-dashed border-line rounded-md">
                  No variants yet. Click <b>Add image</b> to paste an alternative cover for review.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {(item.mediaUrls ?? []).map((url, i) => (
                    <div key={i} className="border border-line rounded-md p-2 bg-paper grid gap-1.5">
                      {url ? (
                        <img
                          src={url}
                          alt={`variant ${i + 1}`}
                          className="w-full aspect-square object-cover border border-line/60 rounded-xs bg-bg"
                        />
                      ) : (
                        <div className="w-full aspect-square border border-dashed border-line rounded-xs grid place-items-center text-ink-muted text-meta">
                          paste URL
                        </div>
                      )}
                      <input
                        value={url}
                        onChange={e => {
                          const arr = [...(item.mediaUrls ?? [])]
                          arr[i] = e.target.value
                          set('mediaUrls', arr)
                        }}
                        placeholder="https://…"
                        className="input !h-7 !px-1.5 text-[10px]"
                      />
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (!url) return
                            // Promote variant → cover. Demote current cover into the variant list.
                            const arr = [...(item.mediaUrls ?? [])]
                            arr.splice(i, 1)
                            if (item.coverUrl) arr.unshift(item.coverUrl)
                            set('coverUrl', url)
                            set('mediaUrls', arr)
                          }}
                          disabled={!url}
                          className="flex-1 text-[9px] tracking-[0.12em] uppercase font-bold border border-line rounded-xs px-1.5 py-1 hover:border-ink hover:text-ink disabled:opacity-30"
                        >
                          Set as cover
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const arr = [...(item.mediaUrls ?? [])]
                            arr.splice(i, 1)
                            set('mediaUrls', arr)
                          }}
                          title="Remove"
                          className="w-7 h-7 grid place-items-center text-red-600 hover:text-red-700 border border-line rounded-xs"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-meta text-ink-muted mt-2">
                Upload photos straight from your device, or paste public URLs. Reviewer can comment on each variant.
              </p>
            </div>
          </fieldset>
        </>)}
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

// ============================================================
// Campaign view — groups posts under campaigns (Upfluence-style)
// ============================================================
function CampaignView({
  items,
  campaigns,
  onItemClick,
  onManage,
}: {
  items: ContentItem[]
  campaigns: Campaign[]
  onItemClick: (item: ContentItem) => void
  onManage: () => void
}) {
  if (campaigns.length === 0) {
    return (
      <div className="bg-paper border border-line rounded-md p-8 text-center">
        <p className="text-body text-ink-muted">No campaigns yet.</p>
        <button onClick={onManage} className="btn-primary mt-3">
          <Plus size={14} strokeWidth={2.5} /> Create your first campaign
        </button>
      </div>
    )
  }
  const grouped = campaigns.map(c => ({
    campaign: c,
    items: items.filter(i => i.campaignId === c.id),
  }))
  const unassigned = items.filter(i => !i.campaignId)
  return (
    <div className="grid gap-4">
      {grouped.map(g => (
        <CampaignCard
          key={g.campaign.id}
          campaign={g.campaign}
          items={g.items}
          onItemClick={onItemClick}
        />
      ))}
      {unassigned.length > 0 && (
        <CampaignCard
          campaign={null}
          items={unassigned}
          onItemClick={onItemClick}
        />
      )}
    </div>
  )
}

function CampaignCard({
  campaign,
  items,
  onItemClick,
}: {
  campaign: Campaign | null
  items: ContentItem[]
  onItemClick: (item: ContentItem) => void
}) {
  const colour = campaign?.colour || '#94A3B8'
  return (
    <section className="bg-paper border border-line rounded-md p-4">
      <div className="flex items-baseline mb-3 gap-2 flex-wrap">
        <span className="w-3 h-3 rounded-full" style={{ background: colour }} aria-hidden />
        <p className="font-display text-[14px]">
          {campaign?.name ?? <span className="text-ink-muted italic">Unassigned</span>}
        </p>
        {campaign?.status && (
          <span className={`text-[9px] tracking-[0.14em] uppercase font-bold px-1.5 py-0.5 rounded-xs ${
            campaign.status === 'active' ? 'bg-emerald-100 text-emerald-700'
            : campaign.status === 'planned' ? 'bg-blue-100 text-blue-700'
            : campaign.status === 'completed' ? 'bg-line text-ink-muted'
            : 'bg-line text-ink-muted'
          }`}>
            {campaign.status}
          </span>
        )}
        {campaign?.startDate && (
          <span className="text-meta text-ink-muted">
            {new Date(campaign.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
            {campaign.endDate ? ` → ${new Date(campaign.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}` : ''}
          </span>
        )}
        <span className="ml-auto text-meta uppercase tracking-[0.14em] text-ink-muted">{items.length} item{items.length === 1 ? '' : 's'}</span>
      </div>
      {campaign?.description && (
        <p className="text-meta text-ink-muted mb-3 line-clamp-2">{campaign.description}</p>
      )}
      {items.length === 0 ? (
        <p className="text-meta text-ink-muted py-2">No content in this campaign yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
          {items.map(c => (
            <article
              key={c.id}
              onClick={() => onItemClick(c)}
              className="border border-line rounded-sm p-2 bg-paper hover:border-ink hover:shadow-sm transition-all cursor-pointer"
            >
              {c.coverUrl && (
                <img src={c.coverUrl} alt="" className="w-full aspect-square object-cover border border-line/60 rounded-xs mb-1 bg-bg" />
              )}
              <p className="text-meta font-bold truncate">{c.title || <span className="text-ink-muted italic">(untitled)</span>}</p>
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                <span className={`text-[9px] tracking-[0.12em] uppercase font-bold px-1 py-0.5 rounded-xs ${STATUS_COLOR[c.status] ?? 'bg-line text-ink-muted'}`}>
                  {STATUS_LABEL[c.status] ?? c.status}
                </span>
                {c.platform && <span className="text-[9px] text-ink-muted">· {c.platform}</span>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

// ============================================================
// Manage campaigns modal — minimal CRUD
// ============================================================
function ManageCampaignsModal({
  ownerId,
  campaigns,
  onClose,
  onChange,
}: {
  ownerId: string
  campaigns: Campaign[]
  onClose: () => void
  onChange: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [colour, setColour] = useState('#2563EB')
  const [busy, setBusy] = useState(false)

  async function add() {
    if (!name.trim()) return
    setBusy(true)
    try {
      await createCampaign({
        ownerId,
        name: name.trim(),
        description: description || null,
        startDate: startDate || null,
        endDate: endDate || null,
        status: 'active',
        colour,
      })
      setName(''); setDescription(''); setStartDate(''); setEndDate('')
      onChange()
    } finally { setBusy(false) }
  }

  async function setStatus(id: string, status: Campaign['status']) {
    await updateCampaign(id, { status })
    onChange()
  }
  async function rename(id: string, name: string) {
    await updateCampaign(id, { name })
    onChange()
  }
  async function remove(id: string) {
    if (!confirm('Delete campaign? Linked posts will be unassigned.')) return
    await deleteCampaign(id)
    onChange()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-paper rounded-md shadow-pop w-full max-w-[640px] max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <header className="px-6 h-14 flex items-center gap-3 border-b border-line">
          <h2 className="font-display text-[14px] tracking-[0.18em] uppercase">Campaigns</h2>
          <button onClick={onClose} className="ml-auto text-ink-muted hover:text-ink"><X size={16} /></button>
        </header>
        <div className="px-6 py-5 grid gap-5">
          <div className="grid gap-2">
            <p className="text-meta uppercase tracking-[0.14em] text-ink-muted font-bold">New campaign</p>
            <div className="grid gap-2">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Campaign name"
                className="input"
              />
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Brief / objective"
                rows={2}
                className="input"
              />
              <div className="grid grid-cols-3 gap-2">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" aria-label="Start date" />
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input" aria-label="End date" />
                <div className="flex items-center gap-2">
                  <input type="color" value={colour} onChange={e => setColour(e.target.value)} className="w-10 h-9 border border-line rounded" aria-label="Colour" />
                  <span className="text-meta text-ink-muted">{colour}</span>
                </div>
              </div>
              <button onClick={add} disabled={!name.trim() || busy} className="btn-primary self-start disabled:opacity-40">
                <Plus size={13} strokeWidth={2.5} /> Add campaign
              </button>
            </div>
          </div>

          <div className="grid gap-2">
            <p className="text-meta uppercase tracking-[0.14em] text-ink-muted font-bold">Existing · {campaigns.length}</p>
            {campaigns.length === 0 && (
              <p className="text-meta text-ink-muted">No campaigns yet.</p>
            )}
            {campaigns.map(c => (
              <div key={c.id} className="border border-line rounded-md p-3 flex items-center gap-3">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: c.colour ?? '#94A3B8' }} aria-hidden />
                <input
                  defaultValue={c.name}
                  onBlur={e => { if (e.target.value !== c.name) rename(c.id, e.target.value) }}
                  className="flex-1 bg-transparent text-body font-bold border-none outline-none focus:bg-bg px-1 rounded-sm"
                />
                <select
                  value={c.status}
                  onChange={e => setStatus(c.id, e.target.value as Campaign['status'])}
                  className="input !w-auto !h-8 !py-1 text-[11px]"
                >
                  {(['planned', 'active', 'completed', 'archived'] as Campaign['status'][]).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button
                  onClick={() => remove(c.id)}
                  className="text-red-600 hover:text-red-700"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Duplicate modal — clone a post into one or more other platforms.
// Same content (title, copy, hashtags, images), new platform tag,
// status reset to draft so the approver re-reviews per channel.
// ============================================================
const DUPLICATE_TARGETS: { id: string; label: string; type: ContentType }[] = [
  { id: 'instagram', label: 'Instagram', type: 'post' },
  { id: 'facebook',  label: 'Facebook',  type: 'post' },
  { id: 'x',         label: 'X',         type: 'post' },
  { id: 'linkedin',  label: 'LinkedIn',  type: 'post' },
  { id: 'threads',   label: 'Threads',   type: 'post' },
  { id: 'pinterest', label: 'Pinterest', type: 'post' },
  { id: 'tiktok',    label: 'TikTok',    type: 'reel' },
  { id: 'youtube',   label: 'YouTube',   type: 'reel' },
]
export function DuplicateModal({
  source,
  ownerId,
  onClose,
  onDone,
}: {
  source: ContentItem
  ownerId: string
  onClose: () => void
  onDone: () => void
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  function toggle(id: string) {
    const next = new Set(picked)
    if (next.has(id)) next.delete(id); else next.add(id)
    setPicked(next)
  }
  async function go() {
    if (picked.size === 0) return
    setBusy(true)
    try {
      await Promise.all(
        Array.from(picked).map(id => {
          const tgt = DUPLICATE_TARGETS.find(t => t.id === id)
          if (!tgt) return Promise.resolve()
          return createContent({
            ownerId,
            type: tgt.type,
            status: 'draft',
            title: source.title,
            copy: source.copy,
            hashtags: source.hashtags,
            purpose: source.purpose,
            postType: source.postType,
            targetAudience: source.targetAudience,
            hook: source.hook,
            cta: source.cta,
            ctaUrl: source.ctaUrl,
            coverUrl: source.coverUrl,
            mediaUrls: source.mediaUrls,
            pillar: source.pillar,
            funnelStage: source.funnelStage,
            audienceSegment: source.audienceSegment,
            format: source.format,
            kpi: source.kpi,
            campaignId: source.campaignId,
            platform: tgt.id,
          })
        })
      )
      onDone()
    } finally { setBusy(false) }
  }
  // Skip the platform the source already targets — duplicating to self
  // would just create a confusing duplicate in the same column.
  const targets = DUPLICATE_TARGETS.filter(t => t.id !== source.platform)
  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-paper rounded-md shadow-pop w-full max-w-[520px] overflow-hidden" onClick={e => e.stopPropagation()}>
        <header className="px-6 h-14 flex items-center gap-3 border-b border-line">
          <Copy size={14} className="text-ink-muted" />
          <h2 className="font-display text-[14px] tracking-[0.18em] uppercase">Duplicate post</h2>
          <button onClick={onClose} className="ml-auto text-ink-muted hover:text-ink"><X size={16} /></button>
        </header>
        <div className="px-6 py-5 grid gap-4">
          <div className="text-body">
            <p className="text-meta uppercase tracking-[0.14em] text-ink-muted">Source</p>
            <p className="font-bold truncate">{source.title || <span className="text-ink-muted italic">(untitled)</span>}</p>
            {source.platform && (
              <p className="text-meta text-ink-muted mt-0.5">From <b className="capitalize">{source.platform}</b></p>
            )}
          </div>
          <div>
            <p className="text-meta uppercase tracking-[0.14em] text-ink-muted font-bold mb-2">
              Duplicate to · {picked.size} selected
            </p>
            <div className="grid grid-cols-2 gap-2">
              {targets.map(t => {
                const on = picked.has(t.id)
                return (
                  <button
                    key={t.id}
                    onClick={() => toggle(t.id)}
                    aria-pressed={on}
                    className={`flex items-center gap-2 border rounded-md px-3 h-10 transition-colors ${
                      on
                        ? 'border-accent bg-accent-soft text-ink'
                        : 'border-line text-ink-muted hover:text-ink hover:border-ink'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-xs border ${on ? 'bg-accent border-accent' : 'border-line'} grid place-items-center`}>
                      {on && <Check size={11} className="text-paper" />}
                    </span>
                    <span className="text-body font-bold">{t.label}</span>
                    <span className="text-meta text-ink-muted ml-auto">{t.type}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <p className="text-meta text-ink-muted">
            Each copy starts as <b>Draft</b> with the same caption, hashtags and images. Status resets so the approver can review per channel.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="btn-outline">Cancel</button>
            <button onClick={go} disabled={picked.size === 0 || busy} className="btn-primary disabled:opacity-40">
              {busy ? 'Duplicating…' : `Duplicate to ${picked.size || ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
