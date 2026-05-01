'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
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
  const [counts, setCounts] = useState<Counts>({
    artworks: 0,
    collections: 0,
    designs: 0,
    shows: 0,
    exhibitions: 0,
    contacts: 0,
    subscribers: 0,
  })

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
    })
  }, [user])

  if (loading) return <div className="p-8 text-[13px] text-ink-muted">Loading…</div>
  if (!user)
    return (
      <div className="min-h-dvh flex items-center justify-center p-6">
        <LoginForm />
      </div>
    )

  const cards: Array<{
    href: string
    label: string
    sub: string
    icon: typeof Frame
    count: number
  }> = [
    { href: '/admin/artworks', label: 'Artworks', sub: 'CRUD + collections + filters', icon: Frame, count: counts.artworks },
    { href: '/admin/designs', label: 'Saved Designs', sub: 'Compositions + folders', icon: LayoutGrid, count: counts.designs },
    { href: '/sample-room', label: 'Sample Room', sub: 'Multi-artwork composer', icon: ImageIcon, count: 0 },
    { href: '/admin/rooms', label: 'Rooms Library', sub: '20 rooms · 4 filters', icon: Library, count: 20 },
    { href: '/admin/exhibitions', label: 'Virtual Exhibitions', sub: '3D walkable galleries', icon: Star, count: counts.exhibitions },
    { href: '/admin/shows', label: 'Art Show Planner', sub: 'Floor plan + walls', icon: MapPin, count: counts.shows },
    { href: '/admin/profile', label: 'Discover Profile', sub: 'Public artist page', icon: Palette, count: 0 },
    { href: '/admin/contacts', label: 'Contacts (CRM)', sub: 'Leads + categories', icon: Users, count: counts.contacts },
    { href: '/admin/inbox', label: 'Newsletter Inbox', sub: 'Subscribers + Mailchimp CSV', icon: Mail, count: counts.subscribers },
  ]

  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line px-6 md:px-10 h-[56px] flex items-center">
        <div>
          <p className="text-[11px] tracking-[0.22em] uppercase text-ink-muted">Dashboard</p>
        </div>
        <div className="ml-auto text-[12px] text-ink-muted">{user.email}</div>
      </header>
      <main className="px-6 md:px-10 py-8">
        <h1 className="font-display text-[28px] tracking-tight">Welcome back</h1>
        <p className="text-[13px] text-ink-muted mt-1">
          {counts.artworks} works · {counts.collections} collections · {counts.designs} designs · {counts.contacts} contacts
        </p>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cards.map(c => {
            const Icon = c.icon
            return (
              <Link
                key={c.href}
                href={c.href}
                className="border border-line p-5 hover:border-ink transition-colors group"
              >
                <div className="flex items-center justify-between mb-3">
                  <Icon size={18} className="text-ink-muted group-hover:text-ink" />
                  <span className="text-[22px] font-display tabular-nums">{c.count}</span>
                </div>
                <p className="font-display text-[15px]">{c.label}</p>
                <p className="text-[11px] tracking-[0.10em] uppercase text-ink-muted mt-1">
                  {c.sub}
                </p>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}
