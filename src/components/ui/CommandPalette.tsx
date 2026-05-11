'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Briefcase,
  Calendar,
  CheckSquare,
  Compass,
  FileText,
  Frame,
  Home,
  Image as ImageIcon,
  LayoutGrid,
  Library,
  Mail,
  Megaphone,
  Palette,
  PieChart,
  Search,
  Star,
  Users,
} from 'lucide-react'
import { useAuth } from '@/lib/db/auth'
import { listMyArtworks } from '@/lib/db/artworks'
import { listContacts } from '@/lib/db/contacts'
import { listDeals, listOrganizations } from '@/lib/db/crm'
import type { Artwork, Contact, Deal, Organization } from '@/types'

interface Item {
  id: string
  label: string
  sublabel?: string
  group: string
  icon?: React.ReactNode
  href?: string
  action?: () => void
}

const NAV_ITEMS: Item[] = [
  { id: 'nav-dashboard', label: 'Dashboard', group: 'Go to', href: '/admin', icon: <Home size={14} /> },
  { id: 'nav-artworks', label: 'Artworks', group: 'Go to', href: '/admin/artworks', icon: <Frame size={14} /> },
  { id: 'nav-presentations', label: 'Presentations', group: 'Go to', href: '/admin/presentations', icon: <FileText size={14} /> },
  { id: 'nav-sequence', label: 'Artwork Sequence', group: 'Go to', href: '/admin/sequence', icon: <Star size={14} /> },
  { id: 'nav-designs', label: 'My Designs', group: 'Go to', href: '/admin/designs', icon: <LayoutGrid size={14} /> },
  { id: 'nav-sample', label: 'Sample Room', group: 'Go to', href: '/sample-room', icon: <ImageIcon size={14} /> },
  { id: 'nav-rooms', label: 'Room Mockups', group: 'Go to', href: '/admin/rooms', icon: <Library size={14} /> },
  { id: 'nav-contacts', label: 'Contacts', group: 'Go to', href: '/admin/contacts', icon: <Users size={14} /> },
  { id: 'nav-orgs', label: 'Organizations', group: 'Go to', href: '/admin/organizations', icon: <Briefcase size={14} /> },
  { id: 'nav-deals', label: 'Deals', group: 'Go to', href: '/admin/deals', icon: <PieChart size={14} /> },
  { id: 'nav-tasks', label: 'Tasks', group: 'Go to', href: '/admin/tasks', icon: <CheckSquare size={14} /> },
  { id: 'nav-social', label: 'Social Calendar', group: 'Go to', href: '/admin/social', icon: <Calendar size={14} /> },
  { id: 'nav-blog', label: 'Blog', group: 'Go to', href: '/admin/blog', icon: <Megaphone size={14} /> },
  { id: 'nav-newsletter', label: 'Newsletter', group: 'Go to', href: '/admin/inbox', icon: <Mail size={14} /> },
  { id: 'nav-profile', label: 'Social Media Posts', group: 'Go to', href: '/admin/profile', icon: <Palette size={14} /> },
]

const ACTIONS: Item[] = [
  { id: 'act-new-artwork', label: 'New artwork', group: 'Create', href: '/admin/artworks', icon: <Frame size={14} /> },
  { id: 'act-new-contact', label: 'New contact', group: 'Create', href: '/admin/contacts', icon: <Users size={14} /> },
  { id: 'act-new-deal', label: 'New deal', group: 'Create', href: '/admin/deals', icon: <PieChart size={14} /> },
  { id: 'act-new-task', label: 'New task', group: 'Create', href: '/admin/tasks', icon: <CheckSquare size={14} /> },
  { id: 'act-new-post', label: 'New social post', group: 'Create', href: '/admin/social', icon: <Calendar size={14} /> },
  { id: 'act-new-blog', label: 'New blog post', group: 'Create', href: '/admin/blog', icon: <Megaphone size={14} /> },
  { id: 'act-new-pdf', label: 'New presentation PDF', group: 'Create', href: '/admin/presentations', icon: <FileText size={14} /> },
]

export default function CommandPalette() {
  const router = useRouter()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  // Data
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [orgs, setOrgs] = useState<Organization[]>([])

  // Global ⌘K shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === '/' && !open && !isTyping(e)) {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape' && open) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // Load data lazily on first open
  useEffect(() => {
    if (!open || !user) return
    if (!artworks.length) listMyArtworks(user.id).then(setArtworks).catch(() => {})
    if (!contacts.length) listContacts(user.id).then(setContacts).catch(() => {})
    if (!deals.length) listDeals(user.id).then(setDeals).catch(() => {})
    if (!orgs.length) listOrganizations(user.id).then(setOrgs).catch(() => {})
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [open, user]) // eslint-disable-line

  // Reset when closing
  useEffect(() => {
    if (!open) {
      setQ('')
      setActiveIdx(0)
    }
  }, [open])

  const results: Item[] = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const items: Item[] = []

    // Always show nav + actions when no query
    if (!needle) {
      items.push(...NAV_ITEMS, ...ACTIONS)
    } else {
      const match = (s: string | null | undefined) => (s ?? '').toLowerCase().includes(needle)

      items.push(...NAV_ITEMS.filter(i => match(i.label)))
      items.push(...ACTIONS.filter(i => match(i.label)))

      // Artworks
      for (const a of artworks) {
        if (match(a.title) || match(a.artist) || match(a.medium)) {
          items.push({
            id: `art-${a.id}`,
            label: a.title,
            sublabel: `Artwork · ${a.artist || ''}`,
            group: 'Artworks',
            href: `/admin/artworks?edit=${a.id}`,
            icon: a.thumb
              ? <img src={a.thumb} alt="" className="w-5 h-5 object-cover rounded-xs" />
              : <Frame size={14} />,
          })
        }
        if (items.length > 60) break
      }

      // Contacts
      for (const c of contacts) {
        if (match(c.name) || match(c.email) || match(c.country)) {
          items.push({
            id: `con-${c.id}`,
            label: c.name || c.email || '—',
            sublabel: `Contact · ${c.email ?? ''}`,
            group: 'Contacts',
            href: `/admin/contacts?id=${c.id}`,
            icon: <Users size={14} />,
          })
        }
        if (items.length > 60) break
      }

      // Deals
      for (const d of deals) {
        if (match(d.title)) {
          items.push({
            id: `deal-${d.id}`,
            label: d.title,
            sublabel: `Deal · ${d.stage}${d.amount ? ` · €${d.amount.toLocaleString()}` : ''}`,
            group: 'Deals',
            href: `/admin/deals?id=${d.id}`,
            icon: <PieChart size={14} />,
          })
        }
      }

      // Organizations
      for (const o of orgs) {
        if (match(o.name) || match(o.country)) {
          items.push({
            id: `org-${o.id}`,
            label: o.name,
            sublabel: `Organization · ${o.type}`,
            group: 'Organizations',
            href: `/admin/organizations?id=${o.id}`,
            icon: <Briefcase size={14} />,
          })
        }
      }
    }

    return items.slice(0, 60)
  }, [q, artworks, contacts, deals, orgs])

  // Reset active index when results change
  useEffect(() => { setActiveIdx(0) }, [q])

  function runItem(item: Item) {
    setOpen(false)
    if (item.action) item.action()
    else if (item.href) router.push(item.href)
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[activeIdx]) runItem(results[activeIdx])
    }
  }

  // Group items by their group label, preserving order
  const grouped: { group: string; items: Item[] }[] = []
  for (const item of results) {
    const last = grouped[grouped.length - 1]
    if (last && last.group === item.group) last.items.push(item)
    else grouped.push({ group: item.group, items: [item] })
  }

  // Cumulative offset for active highlighting
  let cursor = 0

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9998] bg-black/30 grid place-items-start justify-center pt-[12vh] p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: -10 }}
            transition={{ duration: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
            className="bg-paper rounded-md shadow-pop w-full max-w-[620px] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-4 border-b border-line h-12">
              <Search size={16} className="text-ink-muted" />
              <input
                ref={inputRef}
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={onKey}
                placeholder="Search artworks, contacts, deals, pages…"
                className="flex-1 outline-none bg-transparent text-body placeholder:text-ink-muted"
              />
              <kbd className="text-meta tracking-[0.14em] uppercase text-ink-muted border border-line rounded-xs px-1.5 py-0.5">
                Esc
              </kbd>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {results.length === 0 ? (
                <p className="text-body text-ink-muted py-8 text-center">No results.</p>
              ) : (
                grouped.map(g => (
                  <div key={g.group}>
                    <p className="px-4 py-1.5 text-meta uppercase tracking-[0.14em] text-ink-muted bg-bg">
                      {g.group}
                    </p>
                    {g.items.map(it => {
                      const idx = cursor++
                      const isActive = idx === activeIdx
                      return (
                        <button
                          key={it.id}
                          onMouseEnter={() => setActiveIdx(idx)}
                          onClick={() => runItem(it)}
                          className={`w-full flex items-center gap-3 px-4 py-2 text-left ${
                            isActive ? 'bg-accent-soft' : 'hover:bg-bg'
                          }`}
                        >
                          <span className="shrink-0 text-ink-muted">{it.icon}</span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-body font-bold truncate">{it.label}</span>
                            {it.sublabel && (
                              <span className="block text-meta text-ink-muted truncate">{it.sublabel}</span>
                            )}
                          </span>
                          {isActive && (
                            <kbd className="shrink-0 text-meta tracking-[0.14em] uppercase text-ink-muted border border-line rounded-xs px-1.5 py-0.5">
                              ↵
                            </kbd>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ))
              )}
            </div>
            <div className="px-4 py-2 border-t border-line bg-bg flex items-center gap-3 text-meta text-ink-muted">
              <span><kbd className="border border-line rounded-xs px-1 mr-1">↑</kbd><kbd className="border border-line rounded-xs px-1">↓</kbd> navigate</span>
              <span><kbd className="border border-line rounded-xs px-1">↵</kbd> select</span>
              <span className="ml-auto">
                <span className="inline-flex items-center gap-1">
                  <Compass size={11} /> Command palette
                </span>
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null
  if (!t) return false
  const tag = t.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (t.isContentEditable) return true
  return false
}
