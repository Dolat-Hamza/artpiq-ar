'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Frame,
  Image as ImageIcon,
  LayoutGrid,
  Library,
  Mail,
  MapPin,
  Palette,
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

  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line px-6 md:px-10 h-[56px] flex items-center">
        <div>
          <p className="text-meta uppercase text-ink-muted">Dashboard</p>
        </div>
        <div className="ml-auto text-body text-ink-muted hidden sm:inline">{user.email}</div>
      </header>

      <main className="px-6 md:px-10 py-8 max-w-content mx-auto">
        <h1 className="font-display text-h3 sm:text-[28px]">Welcome back</h1>
        {counts ? (
          <p className="text-body text-ink-muted mt-1">
            {counts.artworks} works · {counts.collections} collections · {counts.designs} designs ·{' '}
            {counts.contacts} contacts
          </p>
        ) : (
          <div className="mt-2 h-4 w-72 skel-shimmer rounded-sm" />
        )}

        {/* Hero — two big primary CTAs */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3">
          <HeroCard
            href="/sample-room"
            title="Compose new"
            sub="Place artwork at scale on a stock or uploaded room"
            icon={ImageIcon}
            tone="dark"
          />
          <HeroCard
            href="/admin/rooms"
            title="Browse Library"
            sub="20 stock rooms, 4 filters, click to compose"
            icon={Library}
            tone="light"
          />
        </div>

        {/* Recent designs strip */}
        {recentDesigns.length > 0 && (
          <section className="mt-10">
            <div className="flex items-baseline mb-3">
              <p className="text-meta uppercase text-ink-muted">Recent designs</p>
              <Link
                href="/admin/designs"
                className="ml-auto text-meta uppercase text-ink-muted hover:text-ink"
              >
                See all
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {recentDesigns.map(d => (
                <Link
                  key={d.id}
                  href={`/sample-room?design=${d.id}`}
                  className="block aspect-[4/3] bg-line/40 border border-line rounded-md overflow-hidden hover:border-ink hover:shadow-card transition-all ease-snap"
                  title={d.name}
                >
                  {d.thumbUrl && <img src={d.thumbUrl} alt={d.name} className="w-full h-full object-cover" />}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Secondary tiles */}
        <section className="mt-10">
          <p className="text-meta uppercase text-ink-muted mb-3">Modules</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <ModuleCard href="/admin/artworks" label="Artworks" sub="CRUD + collections + filters" icon={Frame} count={counts?.artworks} />
            <ModuleCard href="/admin/designs" label="Saved Designs" sub="Compositions + folders" icon={LayoutGrid} count={counts?.designs} />
            <ModuleCard href="/admin/exhibitions" label="Virtual Exhibitions" sub="3D walkable galleries" icon={Star} count={counts?.exhibitions} />
            <ModuleCard href="/admin/shows" label="Art Show Planner" sub="Floor plan + walls" icon={MapPin} count={counts?.shows} />
            <ModuleCard href="/admin/profile" label="Discover Profile" sub="Public artist page" icon={Palette} />
            <ModuleCard href="/admin/contacts" label="Contacts" sub="CRM + leads" icon={Users} count={counts?.contacts} />
            <ModuleCard href="/admin/inbox" label="Newsletter" sub="Subscribers + CSV" icon={Mail} count={counts?.subscribers} />
            <ModuleCard href="/admin/rooms" label="Rooms Library" sub="20 rooms · filters" icon={Library} count={20} />
          </div>
        </section>
      </main>
    </div>
  )
}

function HeroCard({
  href,
  title,
  sub,
  icon: Icon,
  tone,
}: {
  href: string
  title: string
  sub: string
  icon: typeof ImageIcon
  tone: 'dark' | 'light'
}) {
  const cls =
    tone === 'dark'
      ? 'bg-ink text-paper'
      : 'bg-paper text-ink border border-line hover:border-ink'
  return (
    <Link
      href={href}
      className={`relative group flex flex-col justify-between p-6 rounded-md min-h-[160px] transition-all ease-snap hover:shadow-pop ${cls}`}
    >
      <Icon size={22} className={tone === 'dark' ? 'text-paper/60' : 'text-ink-muted'} />
      <div>
        <p className="font-display text-[20px] leading-tight">{title}</p>
        <p className={`text-body mt-1 ${tone === 'dark' ? 'text-paper/70' : 'text-ink-muted'}`}>
          {sub}
        </p>
        <div
          className={`mt-3 inline-flex items-center gap-1 text-meta uppercase tracking-[0.18em] ${
            tone === 'dark' ? 'text-paper' : 'text-ink'
          }`}
        >
          Open
          <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  )
}

function ModuleCard({
  href,
  label,
  sub,
  icon: Icon,
  count,
}: {
  href: string
  label: string
  sub: string
  icon: typeof Frame
  count?: number
}) {
  return (
    <Link
      href={href}
      className="border border-line rounded-md p-4 hover:border-ink hover:shadow-card transition-all ease-snap group"
    >
      <div className="flex items-center justify-between mb-2">
        <Icon size={16} className="text-ink-muted group-hover:text-ink" />
        {count !== undefined ? (
          <span className="font-display text-[20px] tabular-nums">{count}</span>
        ) : (
          <span className="w-8 h-4 skel-shimmer rounded-sm" />
        )}
      </div>
      <p className="font-display text-body">{label}</p>
      <p className="text-[11px] tracking-[0.06em] text-ink-muted mt-0.5">{sub}</p>
    </Link>
  )
}
