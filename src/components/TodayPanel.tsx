'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, CheckSquare, MessageSquare, PieChart, Sparkles, UserPlus } from 'lucide-react'
import { useAuth } from '@/lib/db/auth'
import { listTasks, listDeals } from '@/lib/db/crm'
import { listContacts } from '@/lib/db/contacts'
import { listContent } from '@/lib/db/social'
import { useTour } from './ui/Tour'

/**
 * Action-oriented "what to do now" strip shown on /admin.
 *
 * Surfaces four buckets of urgent work:
 *   - tasks due today / overdue
 *   - deals in negotiation / proposal needing follow-up
 *   - posts awaiting approval
 *   - new leads (last 7d)
 *
 * Each cell is a deep link. If everything is empty, we hide the panel
 * and (for first-run users) show a Quick start instead.
 */
export default function TodayPanel({ onQuickStart }: { onQuickStart?: () => void }) {
  const { user } = useAuth()
  const { startById } = useTour()
  const [tasksDue, setTasksDue] = useState<number | null>(null)
  const [tasksOverdue, setTasksOverdue] = useState(0)
  const [dealsAttention, setDealsAttention] = useState<number | null>(null)
  const [pipelineEur, setPipelineEur] = useState(0)
  const [approvalCount, setApprovalCount] = useState<number | null>(null)
  const [newLeads, setNewLeads] = useState<number | null>(null)
  const [contactsCount, setContactsCount] = useState<number | null>(null)
  const [contentCount, setContentCount] = useState<number | null>(null)
  const [dealsCount, setDealsCount] = useState<number | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    Promise.all([
      listTasks(user.id).catch(() => []),
      listDeals(user.id).catch(() => []),
      listContent(user.id).catch(() => []),
      listContacts(user.id).catch(() => []),
    ]).then(([tasks, deals, content, contacts]) => {
      if (cancelled) return
      const now = new Date()
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const endOfToday = new Date(startOfToday.getTime() + 86400000)

      const dueToday = tasks.filter(t => !t.doneAt && t.dueAt && (() => {
        const d = new Date(t.dueAt)
        return d >= startOfToday && d < endOfToday
      })())
      const overdue = tasks.filter(t => !t.doneAt && t.dueAt && new Date(t.dueAt) < startOfToday)
      setTasksDue(dueToday.length)
      setTasksOverdue(overdue.length)

      const open = deals.filter(d => d.stage === 'proposal' || d.stage === 'negotiation' || d.stage === 'qualified')
      setDealsAttention(open.length)
      setPipelineEur(open.reduce((s, d) => s + (d.amount ?? 0), 0))

      setApprovalCount(content.filter(c => c.status === 'submitted_for_review').length)
      setContentCount(content.length)
      setDealsCount(deals.length)
      setContactsCount(contacts.length)

      const weekAgo = new Date(now.getTime() - 7 * 86400000)
      setNewLeads(
        contacts.filter(c => c.lifecycleStage === 'lead' && c.createdAt && new Date(c.createdAt) >= weekAgo).length
      )
    })
    return () => { cancelled = true }
  }, [user])

  // First-run user: brand-new account with nothing in any module
  const isFirstRun =
    contactsCount === 0 &&
    contentCount === 0 &&
    dealsCount === 0 &&
    tasksDue === 0 &&
    tasksOverdue === 0

  if (isFirstRun) {
    return <QuickStart onTour={() => startById('welcome')} onCustom={onQuickStart} />
  }

  return (
    <section className="bg-paper border border-line rounded-md p-5">
      <div className="flex items-baseline mb-4">
        <p className="font-display text-[14px] inline-flex items-center gap-2">
          <Sparkles size={13} className="text-accent" /> Today
        </p>
        <p className="ml-auto text-meta uppercase tracking-[0.14em] text-ink-muted">
          What needs your attention
        </p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <TodayTile
          href="/admin/tasks"
          icon={<CheckSquare size={16} />}
          label="Tasks due today"
          value={tasksDue}
          subline={tasksOverdue > 0 ? `${tasksOverdue} overdue` : 'On track'}
          tone={tasksOverdue > 0 ? 'warn' : (tasksDue && tasksDue > 0 ? 'accent' : 'muted')}
        />
        <TodayTile
          href="/admin/deals"
          icon={<PieChart size={16} />}
          label="Deals to follow up"
          value={dealsAttention}
          subline={pipelineEur > 0 ? `€ ${pipelineEur.toLocaleString()} pipeline` : '—'}
          tone={dealsAttention && dealsAttention > 0 ? 'accent' : 'muted'}
        />
        <TodayTile
          href="/admin/marketing"
          icon={<MessageSquare size={16} />}
          label="Awaiting approval"
          value={approvalCount}
          subline={approvalCount && approvalCount > 0 ? 'Review queue' : 'Nothing pending'}
          tone={approvalCount && approvalCount > 0 ? 'warn' : 'muted'}
        />
        <TodayTile
          href="/admin/contacts"
          icon={<UserPlus size={16} />}
          label="New leads (7d)"
          value={newLeads}
          subline="Lifecycle: lead"
          tone={newLeads && newLeads > 0 ? 'accent' : 'muted'}
        />
      </div>
    </section>
  )
}

type Tone = 'accent' | 'warn' | 'muted'
function TodayTile({
  href,
  icon,
  label,
  value,
  subline,
  tone,
}: {
  href: string
  icon: React.ReactNode
  label: string
  value: number | null
  subline: string
  tone: Tone
}) {
  const ring =
    tone === 'warn'
      ? 'border-amber-200 hover:border-amber-400'
      : tone === 'accent'
      ? 'border-line hover:border-ink'
      : 'border-line hover:border-line/80'
  const iconBg =
    tone === 'warn'
      ? 'bg-amber-100 text-amber-700'
      : tone === 'accent'
      ? 'bg-accent/15 text-accent'
      : 'bg-bg text-ink-muted'
  return (
    <Link
      href={href}
      className={`border rounded-md p-4 bg-paper hover:shadow-card transition-all ease-snap group block ${ring}`}
    >
      <div className="flex items-center gap-2">
        <span className={`w-7 h-7 rounded grid place-items-center ${iconBg}`}>{icon}</span>
        <p className="text-meta uppercase tracking-[0.14em] text-ink-muted">{label}</p>
      </div>
      <div className="flex items-baseline gap-2 mt-3">
        {value === null ? (
          <span className="h-8 w-12 skel-shimmer rounded-sm" />
        ) : (
          <span className="font-display text-[28px] leading-none tabular-nums">{value}</span>
        )}
      </div>
      <p className="text-meta text-ink-muted mt-1">{subline}</p>
    </Link>
  )
}

function QuickStart({ onTour }: { onTour: () => void; onCustom?: () => void }) {
  return (
    <section className="bg-paper border border-line rounded-md p-6">
      <div className="flex items-start gap-3 mb-5">
        <span className="w-8 h-8 rounded-full bg-accent text-paper grid place-items-center">
          <Sparkles size={14} />
        </span>
        <div>
          <p className="font-display text-h3">Welcome to artpiq</p>
          <p className="text-body text-ink-soft mt-1">
            Five things to do first. We&rsquo;ll keep this here until you&rsquo;re set up.
          </p>
        </div>
        <button
          onClick={onTour}
          className="ml-auto btn-outline !h-8 text-meta"
        >
          Replay tour
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <QuickStartTile href="/admin/artworks" step="1" label="Add your first artwork" />
        <QuickStartTile href="/sample-room" step="2" label="Place it in a room" />
        <QuickStartTile href="/admin/contacts" step="3" label="Import your contacts" />
        <QuickStartTile href="/admin/deals" step="4" label="Start a deal" />
        <QuickStartTile href="/admin/marketing" step="5" label="Plan a month of content" />
      </div>
      <div className="mt-4 flex items-start gap-2 text-meta text-ink-muted">
        <AlertCircle size={12} className="mt-0.5 shrink-0" />
        <p>
          Press ⌘K to jump anywhere, or ? to see all shortcuts and replay the tour.
        </p>
      </div>
    </section>
  )
}

function QuickStartTile({ href, step, label }: { href: string; step: string; label: string }) {
  return (
    <Link
      href={href}
      className="border border-line rounded-md p-4 bg-paper hover:border-ink hover:shadow-card transition-all ease-snap group block"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="w-6 h-6 rounded-full bg-bg text-ink-muted grid place-items-center text-meta font-bold tabular-nums group-hover:bg-accent group-hover:text-paper transition-colors">
          {step}
        </span>
      </div>
      <p className="font-display text-[13px] leading-snug">{label}</p>
    </Link>
  )
}
