'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  Megaphone,
  TrendingUp,
  Twitter,
  Youtube,
} from 'lucide-react'
import { useAuth } from '@/lib/db/auth'
import { listContent, updateContent } from '@/lib/db/social'
import type { ContentItem, ContentStatus } from '@/types'
import LoginForm from './LoginForm'
import AdminPageHeader from './ui/AdminPageHeader'
import { useToast } from './ui/toast'

// ============================================================
// Marketing matrix (Thomas's framework)
// ============================================================
const PILLARS = ['Artist Story', 'Behind the Scenes', 'New Work', 'Sales', 'Education', 'Community'] as const
const FUNNEL_STAGES = ['awareness', 'consideration', 'conversion', 'retention'] as const
const FORMATS = ['carousel', 'reel', 'static', 'video', 'story', 'article', 'email'] as const
const AUDIENCES = ['collectors', 'first-time buyers', 'press', 'curators', 'investors', 'general'] as const
const KPIS = ['reach', 'engagement', 'leads', 'sales', 'website-clicks', 'subscribers'] as const
const PLATFORMS = ['instagram', 'facebook', 'x', 'linkedin', 'tiktok', 'youtube', 'pinterest', 'threads'] as const

const PLATFORM_ICON: Record<string, typeof Instagram> = {
  instagram: Instagram,
  facebook: Facebook,
  x: Twitter,
  linkedin: Linkedin,
  tiktok: Megaphone,
  youtube: Youtube,
  pinterest: Megaphone,
  threads: Megaphone,
}

const STATUS_LABEL: Record<ContentStatus, string> = {
  draft: 'Draft',
  in_progress: 'In progress',
  submitted_for_review: 'Awaiting review',
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

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function monthLabel(d: Date): string {
  return d.toLocaleString('en', { month: 'long', year: 'numeric' })
}

export default function MarketingPortal() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const toast = useToast()
  const [list, setList] = useState<ContentItem[]>([])
  const [busy, setBusy] = useState(false)
  const [cursor, setCursor] = useState<Date>(() => new Date())
  const [filterPlatform, setFilterPlatform] = useState<string>('all')

  useEffect(() => { if (user) refresh() }, [user])
  async function refresh() {
    if (!user) return
    setBusy(true)
    try {
      setList(await listContent(user.id))
    } finally { setBusy(false) }
  }

  if (loading) return <div className="p-8 text-body text-ink-muted">Loading…</div>
  if (!user) return <div className="min-h-dvh flex items-center justify-center p-6"><LoginForm /></div>

  const mk = monthKey(cursor)
  const thisMonth = list.filter(c =>
    (c.monthKey === mk) ||
    (!c.monthKey && c.scheduledAt && c.scheduledAt.slice(0, 7) === mk)
  )

  const platformFiltered = filterPlatform === 'all'
    ? thisMonth
    : thisMonth.filter(c => c.platform === filterPlatform || (!c.platform && filterPlatform === 'unset'))

  // Approval queue: submitted_for_review across all months
  const approvalQueue = list.filter(c => c.status === 'submitted_for_review')

  async function approve(id: string) {
    await updateContent(id, { status: 'approved', approvedAt: new Date().toISOString() })
    toast.success('Approved')
    refresh()
  }
  async function requestChanges(id: string) {
    await updateContent(id, { status: 'changes_requested' })
    toast.info('Changes requested')
    refresh()
  }

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <AdminPageHeader
        title="Marketing Portal"
        actions={
          <button
            onClick={() => router.push('/admin/social')}
            className="btn-primary"
          >
            Open social calendar
          </button>
        }
        subBar={
          <>
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="w-6 h-6 grid place-items-center hover:text-ink">
              <ChevronLeft size={14} />
            </button>
            <span className="text-ink font-bold text-body">{monthLabel(cursor)}</span>
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="w-6 h-6 grid place-items-center hover:text-ink">
              <ChevronRight size={14} />
            </button>
            <button onClick={() => setCursor(new Date())} className="ml-2 text-meta uppercase tracking-[0.14em] text-ink-muted hover:text-ink">
              Today
            </button>
            <span className="text-ink-muted">·</span>
            <span>{thisMonth.length} pieces this month</span>
            {approvalQueue.length > 0 && (
              <>
                <span className="text-ink-muted">·</span>
                <span className="inline-flex items-center gap-1 text-amber-700">
                  <Clock size={11} /> {approvalQueue.length} awaiting review
                </span>
              </>
            )}
          </>
        }
      />

      <main className="px-6 md:px-10 py-6 grid gap-6">
        {/* Stat row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile label="Total pieces" value={thisMonth.length} hint="all content types" tone="indigo" />
          <StatTile
            label="Approved"
            value={thisMonth.filter(c => c.status === 'approved' || c.status === 'scheduled' || c.status === 'published').length}
            hint="ready to publish"
            tone="green"
          />
          <StatTile
            label="In review"
            value={thisMonth.filter(c => c.status === 'submitted_for_review').length}
            hint="awaiting client"
            tone="amber"
          />
          <StatTile
            label="Draft"
            value={thisMonth.filter(c => c.status === 'draft' || c.status === 'in_progress').length}
            hint="not yet submitted"
            tone="grey"
          />
        </div>

        {/* Approval queue */}
        {approvalQueue.length > 0 && (
          <section className="bg-paper border border-line rounded-md p-5">
            <div className="flex items-baseline mb-3">
              <p className="font-display text-[14px] inline-flex items-center gap-2">
                <Clock size={13} className="text-amber-700" /> Awaiting your approval
              </p>
              <span className="ml-auto text-meta uppercase tracking-[0.14em] text-ink-muted">{approvalQueue.length} items</span>
            </div>
            <div className="grid gap-2">
              {approvalQueue.map(c => {
                const Icon = c.platform ? PLATFORM_ICON[c.platform] ?? Megaphone : Megaphone
                return (
                  <div key={c.id} className="border border-amber-200 bg-amber-50/50 rounded-md p-3 flex items-start gap-3">
                    <Icon size={18} className="text-amber-700 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-meta tracking-[0.12em] uppercase font-bold text-ink">{c.type}</span>
                        {c.pillar && <span className="text-meta text-ink-muted">· {c.pillar}</span>}
                        {c.platform && <span className="text-meta text-ink-muted">· {c.platform}</span>}
                      </div>
                      <p className="font-bold text-body truncate mt-0.5">{c.title || '(untitled)'}</p>
                      {c.copy && <p className="text-meta text-ink-muted line-clamp-2 mt-1">{c.copy}</p>}
                      {c.scheduledAt && (
                        <p className="text-meta text-ink-muted mt-1">
                          Scheduled · {new Date(c.scheduledAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => approve(c.id)}
                        className="btn-primary !h-7 !text-[10px] !px-2 !bg-emerald-700 hover:!bg-emerald-800"
                      >
                        <Check size={11} /> Approve
                      </button>
                      <button
                        onClick={() => requestChanges(c.id)}
                        className="btn-outline !h-7 !text-[10px] !px-2"
                      >
                        Request changes
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Distribution dashboard — matrix scorecard */}
        <section className="bg-paper border border-line rounded-md p-5">
          <div className="flex items-baseline mb-4">
            <p className="font-display text-[14px] inline-flex items-center gap-2">
              <TrendingUp size={13} className="text-ink-muted" /> Monthly distribution score
            </p>
            <p className="ml-auto text-meta text-ink-muted">{monthLabel(cursor)}</p>
          </div>
          <DistributionScorecard items={thisMonth} />
        </section>

        {/* Platform tabs */}
        <section className="bg-paper border border-line rounded-md overflow-hidden">
          <div className="flex border-b border-line overflow-x-auto no-scrollbar">
            <PlatformTab label="All" active={filterPlatform === 'all'} onClick={() => setFilterPlatform('all')} count={thisMonth.length} />
            {PLATFORMS.map(p => {
              const count = thisMonth.filter(c => c.platform === p).length
              if (count === 0) return null
              return (
                <PlatformTab
                  key={p}
                  label={p}
                  icon={PLATFORM_ICON[p] ? <span>{(() => { const I = PLATFORM_ICON[p]; return <I size={11} /> })()}</span> : undefined}
                  active={filterPlatform === p}
                  onClick={() => setFilterPlatform(p)}
                  count={count}
                />
              )
            })}
            {thisMonth.some(c => !c.platform) && (
              <PlatformTab
                label="Unset"
                active={filterPlatform === 'unset'}
                onClick={() => setFilterPlatform('unset')}
                count={thisMonth.filter(c => !c.platform).length}
              />
            )}
          </div>
          <div className="p-4">
            {platformFiltered.length === 0 ? (
              <p className="text-body text-ink-muted text-center py-8">
                No content for this filter. <button onClick={() => router.push('/admin/social')} className="underline text-accent">Create some</button>
              </p>
            ) : (
              <div className="grid gap-2">
                {platformFiltered.map(c => {
                  const Icon = c.platform ? (PLATFORM_ICON[c.platform] ?? Megaphone) : (c.type === 'newsletter' ? Mail : c.type === 'blog' ? Megaphone : Calendar)
                  return (
                    <div
                      key={c.id}
                      className="border border-line/60 rounded-md p-3 flex items-start gap-3 hover:bg-bg cursor-pointer"
                      onClick={() => router.push(`/admin/social`)}
                    >
                      <Icon size={16} className="text-ink-muted shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-meta tracking-[0.12em] uppercase px-1.5 py-0.5 rounded-xs ${STATUS_COLOR[c.status]}`}>
                            {STATUS_LABEL[c.status]}
                          </span>
                          <span className="text-meta tracking-[0.12em] uppercase text-ink-muted">{c.type}</span>
                          {c.pillar && <span className="text-meta text-ink-muted">· {c.pillar}</span>}
                          {c.format && <span className="text-meta text-ink-muted">· {c.format}</span>}
                          {c.funnelStage && <span className="text-meta text-ink-muted">· {c.funnelStage}</span>}
                        </div>
                        <p className="font-bold text-body truncate mt-1">{c.title || '(untitled)'}</p>
                        {c.purpose && <p className="text-meta text-ink-muted truncate">{c.purpose}</p>}
                      </div>
                      {c.scheduledAt && (
                        <span className="text-meta text-ink-muted text-[11px] shrink-0 ml-auto">
                          {new Date(c.scheduledAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

// ============================================================
// Matrix scorecard
// ============================================================
function DistributionScorecard({ items }: { items: ContentItem[] }) {
  const total = items.length

  function bucketPct<T extends string>(field: keyof ContentItem, values: readonly T[]): Record<T, number> {
    const result = {} as Record<T, number>
    for (const v of values) {
      const n = items.filter(c => c[field] === v).length
      result[v] = total > 0 ? Math.round((n / total) * 100) : 0
    }
    return result
  }

  const pillarPct = bucketPct('pillar', PILLARS)
  const funnelPct = bucketPct('funnelStage', FUNNEL_STAGES)
  const formatPct = bucketPct('format', FORMATS)
  const audiencePct = bucketPct('audienceSegment', AUDIENCES)
  const kpiPct = bucketPct('kpi', KPIS)

  // Diversity score: how evenly distributed across each dimension.
  // 100 = perfect distribution, 0 = single bucket.
  function diversity(pcts: Record<string, number>, expected: number): number {
    const target = 100 / expected
    const deviations = Object.values(pcts).reduce((acc, p) => acc + Math.abs(p - target), 0)
    return Math.max(0, Math.round(100 - deviations / 2))
  }

  const pillarDiv = diversity(pillarPct, PILLARS.length)
  const funnelDiv = diversity(funnelPct, FUNNEL_STAGES.length)
  const formatDiv = diversity(formatPct, FORMATS.length)
  const overallScore = Math.round((pillarDiv + funnelDiv + formatDiv) / 3)

  return (
    <div className="grid gap-5">
      {/* Overall score */}
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 shrink-0">
          <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
            <circle cx="20" cy="20" r="16" fill="none" stroke="#F2F2F2" strokeWidth="3" />
            <circle
              cx="20"
              cy="20"
              r="16"
              fill="none"
              stroke={overallScore >= 75 ? '#10B981' : overallScore >= 50 ? '#F59E0B' : '#EF4444'}
              strokeWidth="3"
              strokeDasharray={`${(overallScore / 100) * 100.5} 100.5`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-[18px] font-display font-bold">
            {overallScore}
          </span>
        </div>
        <div>
          <p className="font-display text-[15px]">Distribution score</p>
          <p className="text-meta text-ink-muted leading-relaxed">
            How evenly your content covers pillars, funnel stages, and formats this month.
            Higher = more variety. {overallScore >= 75 ? 'Great balance.' : overallScore >= 50 ? 'Decent — diversify a bit more.' : 'Heavily skewed — mix more content types.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <BucketBar title="Brand pillars" pcts={pillarPct} score={pillarDiv} />
        <BucketBar title="Funnel stages" pcts={funnelPct} score={funnelDiv} />
        <BucketBar title="Formats" pcts={formatPct} score={formatDiv} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BucketBar title="Audience segments" pcts={audiencePct} score={diversity(audiencePct, AUDIENCES.length)} />
        <BucketBar title="KPI targets" pcts={kpiPct} score={diversity(kpiPct, KPIS.length)} />
      </div>
    </div>
  )
}

function BucketBar({ title, pcts, score }: { title: string; pcts: Record<string, number>; score: number }) {
  return (
    <div>
      <div className="flex items-baseline mb-2">
        <p className="text-meta uppercase tracking-[0.14em] text-ink-muted font-bold">{title}</p>
        <span className="ml-auto text-meta text-ink-muted">{score} / 100</span>
      </div>
      <div className="space-y-1.5">
        {Object.entries(pcts).map(([k, v]) => (
          <div key={k} className="flex items-center gap-2 text-meta">
            <span className="w-20 text-ink-muted truncate" title={k}>{k}</span>
            <div className="flex-1 h-1.5 bg-bg rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${v}%` }}
              />
            </div>
            <span className="w-9 text-right tabular-nums text-ink-muted">{v}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatTile({
  label, value, hint, tone,
}: { label: string; value: number; hint?: string; tone: 'indigo' | 'green' | 'amber' | 'grey' }) {
  const toneClass = {
    indigo: 'bg-accent-soft text-accent',
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    grey: 'bg-line text-ink-muted',
  }[tone]
  return (
    <div className="bg-paper border border-line rounded-md p-4">
      <p className="text-meta uppercase tracking-[0.14em] text-ink-muted">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="font-display text-[24px] tabular-nums">{value}</span>
        <span className={`text-meta tracking-[0.12em] uppercase px-1.5 py-0.5 rounded-xs ${toneClass}`}>
          {hint}
        </span>
      </div>
    </div>
  )
}

function PlatformTab({
  label, icon, active, onClick, count,
}: { label: string; icon?: React.ReactNode; active: boolean; onClick: () => void; count: number }) {
  return (
    <button
      onClick={onClick}
      data-active={active}
      className="dock-tab !text-ink-muted data-[active=true]:!text-ink data-[active=true]:after:!bg-ink !h-10 !text-meta whitespace-nowrap"
    >
      {icon && <span className="mr-1">{icon}</span>}
      <span className="capitalize">{label}</span>
      <span className="ml-1 opacity-60">· {count}</span>
    </button>
  )
}

// suppress eslint about unused — kept for potential expansion to surface as content brief
void CheckCircle2
