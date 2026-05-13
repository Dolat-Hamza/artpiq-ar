'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Bell,
  Briefcase,
  Calendar,
  CheckSquare,
  FileText,
  Frame,
  Gift,
  Image as ImageIcon,
  LayoutGrid,
  Library,
  Mail,
  Megaphone,
  Palette,
  PieChart,
  PlayCircle,
  Star,
  Users,
} from 'lucide-react'
import { signOut, useAuth } from '@/lib/db/auth'
import { getRecent, type RecentItem } from '@/lib/recentlyViewed'
import { Clock } from 'lucide-react'
import { listMyArtworks } from '@/lib/db/artworks'
import { listMyCollections } from '@/lib/db/collections'
import { listDesigns } from '@/lib/db/savedDesigns'
import { listShows } from '@/lib/db/artShows'
import { listExhibitions } from '@/lib/db/exhibitions'
import { listContacts } from '@/lib/db/contacts'
import { listSubscribers } from '@/lib/db/subscribers'
import LoginForm from '@/components/LoginForm'
import TodayPanel from '@/components/TodayPanel'
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
  const [openMenu, setOpenMenu] = useState<'gift' | 'bell' | 'avatar' | null>(null)
  const [recent, setRecent] = useState<RecentItem[]>([])

  useEffect(() => {
    setRecent(getRecent())
  }, [])

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
        {/* Universal search trigger */}
        <button
          onClick={() => {
            const e = new KeyboardEvent('keydown', { key: 'k', metaKey: true })
            document.dispatchEvent(e)
          }}
          className="hidden md:inline-flex items-center gap-2 h-9 px-3 border border-line rounded-md text-meta text-ink-muted hover:border-ink hover:text-ink transition-colors"
        >
          <span>Search…</span>
          <kbd className="text-meta tracking-[0.14em] uppercase border border-line rounded-xs px-1.5 py-0.5 bg-bg">⌘ K</kbd>
        </button>
        <div className="ml-auto flex items-center gap-3 relative">
          <div className="relative">
            <button
              aria-label="Refer and earn"
              onClick={() => setOpenMenu(openMenu === 'gift' ? null : 'gift')}
              className="relative w-9 h-9 grid place-items-center rounded hover:bg-line/60"
            >
              <Gift size={18} strokeWidth={1.6} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
            </button>
            {openMenu === 'gift' && (
              <Menu onClose={() => setOpenMenu(null)} className="w-[280px]">
                <div className="px-4 py-3">
                  <p className="font-display text-[14px] mb-1">Refer & earn</p>
                  <p className="text-meta text-ink-muted">
                    Share artpiq with another artist or gallery and you both get a free month.
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/?ref=${user.id.slice(0, 8)}`)
                      setOpenMenu(null)
                    }}
                    className="btn-primary mt-3 w-full"
                  >
                    Copy referral link
                  </button>
                </div>
              </Menu>
            )}
          </div>

          <div className="relative">
            <button
              aria-label="Notifications"
              onClick={() => setOpenMenu(openMenu === 'bell' ? null : 'bell')}
              className="relative w-9 h-9 grid place-items-center rounded hover:bg-line/60"
            >
              <Bell size={18} strokeWidth={1.6} />
              {(counts?.contacts ?? 0) > 0 && (
                <span className="absolute top-1 right-1 min-w-4 h-4 px-1 text-[10px] grid place-items-center bg-accent text-paper rounded-full font-bold">
                  {counts?.contacts}
                </span>
              )}
            </button>
            {openMenu === 'bell' && (
              <Menu onClose={() => setOpenMenu(null)} className="w-[300px]">
                <p className="px-4 py-3 font-display text-[14px] border-b border-line">Notifications</p>
                {(counts?.contacts ?? 0) === 0 ? (
                  <p className="px-4 py-6 text-meta text-ink-muted text-center">No new notifications</p>
                ) : (
                  <Link
                    href="/admin/contacts"
                    onClick={() => setOpenMenu(null)}
                    className="block px-4 py-3 hover:bg-bg text-body"
                  >
                    <span className="font-bold">{counts?.contacts} new contact{counts?.contacts === 1 ? '' : 's'}</span>
                    <span className="block text-meta text-ink-muted mt-0.5">View CRM</span>
                  </Link>
                )}
              </Menu>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'avatar' ? null : 'avatar')}
              aria-label="Account menu"
              className="w-9 h-9 grid place-items-center rounded-full bg-ink text-paper text-[12px] font-bold uppercase hover:opacity-90"
            >
              {(name[0] || '?').toUpperCase()}
              {(name[1] || '').toUpperCase()}
            </button>
            {openMenu === 'avatar' && (
              <Menu onClose={() => setOpenMenu(null)} className="w-[220px]">
                <div className="px-4 py-3 border-b border-line">
                  <p className="font-bold text-body truncate">{name}</p>
                  <p className="text-meta text-ink-muted truncate">{user.email}</p>
                </div>
                <Link href="/admin/profile" onClick={() => setOpenMenu(null)} className="block px-4 py-2 text-body hover:bg-bg">
                  Discover Profile
                </Link>
                <Link href="/admin/inbox" onClick={() => setOpenMenu(null)} className="block px-4 py-2 text-body hover:bg-bg">
                  Newsletter
                </Link>
                <Link href="/admin/contacts" onClick={() => setOpenMenu(null)} className="block px-4 py-2 text-body hover:bg-bg">
                  Contacts
                </Link>
                <button
                  onClick={() => { setOpenMenu(null); signOut() }}
                  className="block w-full text-left px-4 py-2 text-body hover:bg-bg border-t border-line text-red-600"
                >
                  Sign out
                </button>
              </Menu>
            )}
          </div>
        </div>
      </header>

      <main className="px-6 md:px-10 py-8 max-w-content mx-auto">
        <h1 className="font-display text-h2">
          {greeting}, <span className="capitalize">{name}</span>
        </h1>

        {/* Today: action-oriented hero */}
        <div className="mt-6">
          <TodayPanel />
        </div>

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
            <Stat label="Curated Spaces" value={counts?.shows} quota={QUOTA.shows} />
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
            <a
              href="mailto:hello@artpiq.com?subject=Account%20Manager%20Meeting%20Request&body=Hi%20artpiq%20team%2C%0A%0AI%27d%20like%20to%20schedule%20a%20one-on-one%20meeting%20to%20discuss%20my%20goals%20and%20how%20artpiq%20can%20help.%0A%0AThanks%21"
              className="mt-4 self-start inline-flex items-center gap-2 px-4 h-9 bg-paper text-ink rounded-full text-[11px] font-bold uppercase tracking-[0.06em] hover:bg-accent hover:text-paper transition-colors"
            >
              <Calendar size={13} strokeWidth={2} /> Let&rsquo;s meet
            </a>
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
                Open sample room
              </p>
              <p className="text-[11px] text-ink-muted/70 mt-1">
                Try the composer with a stock room
              </p>
            </div>
          </Link>
        </section>

        {/* Recently viewed (cross-module) */}
        {recent.length > 0 && (
          <section className="mt-6 bg-paper border border-line rounded-md p-5">
            <div className="flex items-baseline mb-3">
              <p className="font-display text-[14px] inline-flex items-center gap-2">
                <Clock size={13} className="text-ink-muted" /> Recently viewed
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {recent.slice(0, 12).map(r => (
                <Link
                  key={`${r.kind}-${r.id}`}
                  href={r.href}
                  className="block aspect-[4/5] bg-bg border border-line rounded overflow-hidden hover:border-ink hover:shadow-card transition-all ease-snap relative group"
                  title={r.label}
                >
                  {r.thumbUrl ? (
                    <img src={r.thumbUrl} alt={r.label} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center">
                      <span className="text-meta uppercase tracking-[0.14em] text-ink-muted/60">{r.kind}</span>
                    </div>
                  )}
                  <span className="absolute inset-x-0 bottom-0 px-2 py-1 bg-paper/90 backdrop-blur text-[10px] font-bold truncate text-ink opacity-0 group-hover:opacity-100 transition-opacity">
                    {r.label}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

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
                  className="block aspect-[4/3] bg-bg border border-line rounded overflow-hidden hover:border-ink hover:shadow-card transition-all ease-snap relative group"
                  title={d.name}
                >
                  {d.thumbUrl ? (
                    <img src={d.thumbUrl} alt={d.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center">
                      <ImageIcon size={20} strokeWidth={1.4} className="text-ink-muted/60" />
                    </div>
                  )}
                  <span className="absolute inset-x-0 bottom-0 px-2 py-1 bg-paper/90 backdrop-blur text-[10px] font-bold truncate text-ink opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.name}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Modules grid */}
        {/* Presentations */}
        <section className="mt-6 bg-paper border border-line rounded-md p-5">
          <p className="font-display text-[14px] mb-4">Visualisation</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <ModuleCard href="/admin/artworks" label="Artworks" icon={Frame} count={counts?.artworks} />
            <ModuleCard href="/admin/presentations" label="Presentations" icon={FileText} />
            <ModuleCard href="/admin/sequence" label="Artwork Sequence" icon={Star} />
            <ModuleCard href="/admin/designs" label="My Designs" icon={LayoutGrid} count={counts?.designs} />
            <ModuleCard href="/sample-room" label="Sample Room" icon={ImageIcon} />
            <ModuleCard href="/admin/rooms" label="Room Mockups" icon={Library} count={20} />
          </div>
        </section>

        {/* CRM */}
        <section className="mt-4 bg-paper border border-line rounded-md p-5">
          <p className="font-display text-[14px] mb-4">CRM</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <ModuleCard href="/admin/contacts" label="Contacts" icon={Users} count={counts?.contacts} />
            <ModuleCard href="/admin/organizations" label="Organizations" icon={Briefcase} />
            <ModuleCard href="/admin/deals" label="Deals" icon={PieChart} />
            <ModuleCard href="/admin/tasks" label="Tasks" icon={CheckSquare} />
          </div>
        </section>

        {/* Marketing */}
        <section className="mt-4 bg-paper border border-line rounded-md p-5">
          <p className="font-display text-[14px] mb-4">Marketing</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <ModuleCard href="/admin/marketing" label="Marketing Portal" icon={PieChart} />
            <ModuleCard href="/admin/social" label="Social Calendar" icon={Calendar} />
            <ModuleCard href="/admin/blog" label="Blog" icon={Megaphone} />
            <ModuleCard href="/admin/inbox" label="Newsletter" icon={Mail} count={counts?.subscribers} />
            <ModuleCard href="/admin/profile" label="Social Media Posts" icon={Palette} />
          </div>
        </section>
      </main>
    </div>
  )
}

function Menu({
  children,
  onClose,
  className,
}: {
  children: React.ReactNode
  onClose: () => void
  className?: string
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className={`absolute right-0 top-full mt-2 bg-paper border border-line rounded-md shadow-pop py-1 z-50 ${className ?? ''}`}
      >
        {children}
      </div>
    </>
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
