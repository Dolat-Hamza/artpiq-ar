'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Frame,
  Home,
  Image as ImageIcon,
  LayoutGrid,
  Library,
  LogOut,
  Mail,
  MapPin,
  Palette,
  Star,
  Users,
} from 'lucide-react'
import { signOut, useAuth } from '@/lib/db/auth'

const SECTIONS: Array<{
  label: string
  items: { href: string; label: string; icon: typeof Home }[]
}> = [
  {
    label: 'Work',
    items: [
      { href: '/admin/artworks', label: 'Artworks', icon: Frame },
      { href: '/admin/designs', label: 'Saved Designs', icon: LayoutGrid },
    ],
  },
  {
    label: 'Compose',
    items: [
      { href: '/sample-room', label: 'Sample Room', icon: ImageIcon },
      { href: '/admin/rooms', label: 'Rooms Library', icon: Library },
    ],
  },
  {
    label: 'Publish',
    items: [
      { href: '/admin/exhibitions', label: 'Virtual Exhibitions', icon: Star },
      { href: '/admin/shows', label: 'Art Show Planner', icon: MapPin },
      { href: '/admin/profile', label: 'Discover Profile', icon: Palette },
    ],
  },
  {
    label: 'Audience',
    items: [
      { href: '/admin/contacts', label: 'Contacts', icon: Users },
      { href: '/admin/inbox', label: 'Newsletter Inbox', icon: Mail },
    ],
  },
]

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  const W = collapsed ? 'md:w-[60px]' : 'md:w-[220px]'

  return (
    <div className="min-h-dvh flex bg-paper">
      <aside
        className={`hidden md:flex sticky top-0 h-dvh shrink-0 flex-col border-r border-line bg-paper ${W} transition-[width] duration-200`}
      >
        <Link href="/" className="h-[56px] px-4 flex items-center gap-2 border-b border-line">
          <span className="font-display text-[20px] tracking-tight leading-none">
            artpiq<span className="text-accent">.</span>
          </span>
          {!collapsed && (
            <span className="ml-auto text-[10px] tracking-[0.18em] uppercase text-ink-muted">
              admin
            </span>
          )}
        </Link>
        <nav className="flex-1 overflow-y-auto py-3">
          <Link
            href="/admin"
            className={`flex items-center gap-2.5 px-3 py-2 mx-2 mb-3 text-[12px] tracking-[0.06em] ${
              pathname === '/admin'
                ? 'bg-ink text-paper'
                : 'text-ink-muted hover:text-ink hover:bg-line/30'
            }`}
          >
            <Home size={14} />
            {!collapsed && <span>Dashboard</span>}
          </Link>
          {SECTIONS.map(sec => (
            <div key={sec.label} className="mb-3">
              {!collapsed && (
                <p className="px-4 mb-1 text-[10px] tracking-[0.22em] uppercase text-ink-muted">
                  {sec.label}
                </p>
              )}
              <ul>
                {sec.items.map(it => {
                  const active = pathname === it.href || pathname.startsWith(it.href + '/')
                  const Icon = it.icon
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        className={`flex items-center gap-2.5 px-3 mx-2 my-0.5 py-2 text-[12px] ${
                          active
                            ? 'bg-ink text-paper'
                            : 'text-ink-muted hover:text-ink hover:bg-line/30'
                        }`}
                        title={it.label}
                      >
                        <Icon size={14} />
                        {!collapsed && <span className="truncate">{it.label}</span>}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-line p-3 flex items-center gap-2 text-[11px]">
          {user && !collapsed && (
            <span className="flex-1 truncate text-ink-muted">{user.email}</span>
          )}
          {user && (
            <button
              onClick={() => signOut()}
              title="Sign out"
              className="text-ink-muted hover:text-ink"
            >
              <LogOut size={13} />
            </button>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="text-ink-muted hover:text-ink"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav (priority pages only) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-paper border-t border-line flex items-center justify-around h-14">
        {[
          { href: '/admin', label: 'Home', icon: Home },
          { href: '/admin/artworks', label: 'Artworks', icon: Frame },
          { href: '/sample-room', label: 'Compose', icon: ImageIcon },
          { href: '/admin/designs', label: 'Designs', icon: LayoutGrid },
          { href: '/admin/contacts', label: 'CRM', icon: Users },
        ].map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`flex flex-col items-center justify-center px-2 py-1 text-[9px] tracking-[0.10em] uppercase ${
                active ? 'text-ink' : 'text-ink-muted'
              }`}
            >
              <Icon size={18} />
              <span className="mt-0.5">{label}</span>
            </Link>
          )
        })}
      </nav>

      <main className="flex-1 min-w-0 pb-14 md:pb-0">{children}</main>
    </div>
  )
}
