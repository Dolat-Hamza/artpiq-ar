'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Bell,
  Calendar,
  Frame,
  Gift,
  Image as ImageIcon,
  LayoutGrid,
  Library,
  Mail,
  MapPin,
  Palette,
  PlayCircle,
  Star,
  Users,
} from 'lucide-react'
import { useAuth } from '@/lib/db/auth'
import { listMyArtworks } from '@/lib/db/artworks'
import { listMyCollections } from '@/lib/db/collections'
import { listDesigns } from '@/lib/db/savedDesigns'
import { listShows } from '@/lib/db/artShows'
import { listExhibitions } from '@/lib/db/exhibitions'
import { listContacts } from '@/lib/db/contacts'
import { listSubscribers } from '@/lib/db/subscribers'
import LoginForm from '@/components/LoginForm'
import { SavedDesign } from '@/types'

interface Counts {
  artworks: number
  collections: number
  designs: number
  shows: number
  exhibitions: number
  contacts: number
  subscribers: number
}

const QUOTA = { artworks: 1500, designs: 500, shows: 50 }

export default function AdminDashboard() {
  const { user, loading } = useAuth()
  const [counts, setCounts] = useState<Counts | null>(null)
  const [recentDesigns, setRecentDesigns] = useState<SavedDesign[]>([])

  useEffect(() => {
    if (!user) return
    Promise.all([
      listMyArtworks(user.id).catch(() => []),
      listMyCollections(user.id).catch(() => []),
      listDesigns(user.id).catch(() => []),
      listShows(user.id).catch(() => []),
      listExhibitions(user.id).catch(() => []),
      listContacts(user.id).catch(() => []),
      listSubscribers(user.id).catch(() => []),
    ]).then(([a, c, d, s, e, ct, sub]) => {
      setCounts({
        artworks: a.length,
        collections: c.length,
        designs: d.length,
        shows: s.length,
        exhibitions: e.length,
        contacts: ct.length,
        subscribers: sub.length,
      })
      setRecentDesigns(d.slice(0, 6))
    })
  }, [user])

  if (loading) return <div className="p-8 text-body text-ink-muted">Loading…</div>
  if (!user)
    return (
      <div className="min-h-dvh flex items-center justify-center p-6">
        <LoginForm />
      </div>
    )

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  })()
  const name = (user.email || '').split('@')[0]

  return (
    <div className="min-h-dvh bg-bg">
      {/* Top bar — ArtPlacer style */}
      <header className="bg-paper border-b border-line h-topbar flex items-center px-6 md:px-10 sticky top-0 z-20">
        <div className="ml-auto flex items-center gap-3">
          <button aria-label="Refer and earn" className="relative w-9 h-9 grid place-items-center rounded hover:bg-line/60">
            <Gift size={18} strokeWidth={1.6} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
          </button>
          <button aria-label="Notifications" className="relative w-9 h-9 grid place-items-center rounded hover:bg-line/60">
            <Bell size={18} strokeWidth={1.6} />
            <span className="absolute top-1 right-1 min-w-4 h-4 px-1 text-[10px] grid place-items-center bg-accent text-paper rounded-full font-bold">
              1
            </span>
          </button>
          <div className="w-9 h-9 grid place-items-center rounded-full bg-ink text-paper text-[12px] font-bold uppercase">
            {(name[0] || '?').toUpperCase()}
            {(name[1] || '').toUpperCase()}
          </div>
        </div>
      </header>

      <main className="px-6 md:px-10 py-8 max-w-content mx-auto">
        <h1 className="font-display text-h2">
          {greeting}, <span className="capitalize">{name}</span>
        </h1>

        {/* Activity overview — ArtPlacer panels */}
        <section className="mt-6 bg-paper border border-line rounded-md p-5">
          <p className="font-display text-[14px] mb-4">Activity overview</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Stat
              label="Artworks"
              value={counts?.artworks}
              quota={QUOTA.artworks}
              accent="ring-accent"
            />
            <Stat label="Saved Designs" value={counts?.designs} quota={QUOTA.designs} />
            <Stat label="Personal Spaces" value={counts?.shows} quota={QUOTA.shows} />
          </div>
        </section>

        {/* Hero row: Account Manager + Demo */}
        <section className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-ink text-paper rounded-md p-6 flex flex-col">
            <p className="text-meta uppercase tracking-[0.18em] opacity-60">Account Manager</p>
            <p className="font-display text-h2 mt-2 leading-tight">
              Book your one-on-one meeting
            </p>
            <p className="text-body opacity-70 mt-3 flex-1">
              We&rsquo;d love to learn about your goals and explore how artpiq&rsquo;s full range
              of tools can support your growth.
            </p>
            <Link
              href="/admin/profile"
              className="mt-4 self-start inline-flex items-center gap-2 px-4 h-9 bg-paper text-ink rounded-full text-[11px] font-bold uppercase tracking-[0.06em] hover:bg-accent hover:text-paper transition-colors"
            >
              <Calendar size={13} strokeWidth={2} /> Let&rsquo;s meet
            </Link>
          </div>
          <Link
            href="/sample-room"
            className="relative bg-paper border border-line rounded-md overflow-hidden group min-h-[220px] grid place-items-center"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#FFFFFF_0%,#EDEDEA_70%)]" />
            <div className="relative z-10 flex flex-col items-center gap-3 text-ink">
              <div className="w-14 h-14 grid place-items-center rounded-full bg-paper border border-line shadow-pop group-hover:scale-110 transition-transform ease-snap">
                <PlayCircle size={26} strokeWidth={1.4} />
              </div>
              <p className="text-meta uppercase tracking-[0.18em] text-ink-muted">
                Watch on-demand demo
              </p>
            </div>
          </Link>
        </section>

        {/* Recent designs */}
        {recentDesigns.length > 0 && (
          <section className="mt-6 bg-paper border border-line rounded-md p-5">
            <div className="flex items-baseline mb-3">
              <p className="font-display text-[14px]">Recent designs</p>
              <Link
                href="/admin/designs"
                className="ml-auto text-meta uppercase tracking-[0.18em] text-ink-muted hover:text-ink underline"
              >
                View all
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {recentDesigns.map(d => (
                <Link
                  key={d.id}
                  href={`/sample-room?design=${d.id}`}
                  className="block aspect-[4/3] bg-line/40 border border-line rounded overflow-hidden hover:border-ink hover:shadow-card transition-all ease-snap"
                  title={d.name}
                >
                  {d.thumbUrl && (
                    <img src={d.thumbUrl} alt={d.name} className="w-full h-full object-cover" />
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Modules grid */}
        <section className="mt-6 bg-paper border border-line rounded-md p-5">
          <p className="font-display text-[14px] mb-4">Modules</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <ModuleCard href="/admin/artworks" label="Artworks" icon={Frame} count={counts?.artworks} />
            <ModuleCard href="/admin/designs" label="My Designs" icon={LayoutGrid} count={counts?.designs} />
            <ModuleCard href="/sample-room" label="Sample Room" icon={ImageIcon} />
            <ModuleCard href="/admin/rooms" label="Room Mockups" icon={Library} count={20} />
            <ModuleCard href="/admin/exhibitions" label="Virtual Exhibitions" icon={Star} count={counts?.exhibitions} />
            <ModuleCard href="/admin/shows" label="Art Show Planner" icon={MapPin} count={counts?.shows} />
            <ModuleCard href="/admin/profile" label="Discover Profile" icon={Palette} />
            <ModuleCard href="/admin/contacts" label="Contacts" icon={Users} count={counts?.contacts} />
            <ModuleCard href="/admin/inbox" label="Newsletter" icon={Mail} count={counts?.subscribers} />
          </div>
        </section>
      </main>
    </div>
  )
}

function Stat({
  label,
  value,
  quota,
  accent,
}: {
  label: string
  value?: number
  quota?: number
  accent?: string
}) {
  const pct = value !== undefined && quota ? Math.min(100, (value / quota) * 100) : 0
  return (
    <div className="border border-line rounded-md p-4">
      <p className="text-meta uppercase tracking-[0.18em] text-ink-muted">{label}</p>
      <div className="flex items-baseline gap-2 mt-2">
        {value !== undefined ? (
          <>
            <span className="font-display text-[28px] leading-none">{value}</span>
            {quota && <span className="text-[13px] text-ink-muted">/ {quota}</span>}
          </>
        ) : (
          <span className="h-7 w-16 skel-shimmer rounded-sm" />
        )}
        {quota && value !== undefined && (
          <svg viewBox="0 0 36 36" className={`w-7 h-7 ml-auto ${accent || 'text-ink-muted'}`}>
            <circle cx="18" cy="18" r="14" fill="none" stroke="#F2F2F2" strokeWidth="3" />
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${pct * 0.88} 88`}
              transform="rotate(-90 18 18)"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
    </div>
  )
}

function ModuleCard({
  href,
  label,
  icon: Icon,
  count,
}: {
  href: string
  label: string
  icon: typeof Frame
  count?: number
}) {
  return (
    <Link
      href={href}
      className="border border-line rounded-md p-3 bg-paper hover:border-ink hover:shadow-card transition-all ease-snap group block"
    >
      <div className="flex items-center justify-between mb-2">
        <Icon size={16} strokeWidth={1.6} className="text-ink-muted group-hover:text-ink" />
        {count !== undefined ? (
          <span className="font-display text-[18px] leading-none tabular-nums">{count}</span>
        ) : (
          <span className="w-8 h-4 skel-shimmer rounded-sm" />
        )}
      </div>
      <p className="font-display text-[13px]">{label}</p>
    </Link>
  )
}
