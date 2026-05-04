'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Frame,
  Home,
  Image as ImageIcon,
  LayoutGrid,
  Library,
  LogOut,
  Mail,
  MapPin,
  Palette,
  Plus,
  Star,
  Users,
} from 'lucide-react'
import { signOut, useAuth } from '@/lib/db/auth'

// ArtPlacer-style sidebar: white bg, group headers, primary CTA pill, collapse
const TOP: { href: string; label: string; icon: typeof Home }[] = [
  { href: '/admin', label: 'Dashboard', icon: Home },
  { href: '/admin/artworks', label: 'Artworks', icon: Frame },
  { href: '/admin/rooms', label: 'Room Mockups', icon: Library },
]

const GROUPS: { label: string; items: { href: string; label: string; icon: typeof Home }[] }[] = [
  {
    label: 'My Creations',
    items: [
      { href: '/admin/designs', label: 'My Designs', icon: LayoutGrid },
      { href: '/sample-room', label: 'Sample Room', icon: ImageIcon },
      { href: '/admin/exhibitions', label: 'Virtual Exhibitions', icon: Star },
      { href: '/admin/shows', label: 'Art Show Planner', icon: MapPin },
    ],
  },
  {
    label: 'Lead Generation',
    items: [
      { href: '/admin/contacts', label: 'Contacts', icon: Users },
      { href: '/admin/inbox', label: 'Newsletter', icon: Mail },
      { href: '/admin/profile', label: 'Discover Profile', icon: Palette },
    ],
  },
]

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'My Creations': true,
    'Lead Generation': true,
  })

  return (
    <div className="min-h-dvh flex bg-bg text-ink">
      <aside
        className={`hidden md:flex sticky top-0 h-dvh shrink-0 flex-col border-r border-line bg-paper transition-[width] duration-200 ease-snap ${
          collapsed ? 'w-[60px]' : 'w-[232px]'
        }`}
      >
        {/* Brand row */}
        <Link href="/" className="h-[64px] px-5 flex items-center gap-2.5 border-b border-line">
          <span className="font-display tracking-[0.04em] text-[18px] leading-none">
            artpiq
          </span>
          <span className="w-3 h-3 bg-accent rounded-[2px] inline-block" />
        </Link>

        {/* Primary CTA */}
        <div className="px-3 pt-3 pb-2">
          <Link href="/sample-room" className="btn-primary w-full">
            <Plus size={14} strokeWidth={2.5} />
            {!collapsed && 'Start Creating'}
          </Link>
        </div>

        {/* Top static items */}
        <nav className="overflow-y-auto flex-1 py-2">
          <ul>
            {TOP.map(it => {
              const active = pathname === it.href || pathname.startsWith(it.href + '/')
              const Icon = it.icon
              return (
                <li key={it.href}>
                  <Link href={it.href} data-active={active} className="ap-nav" title={it.label}>
                    <Icon size={16} strokeWidth={1.6} />
                    {!collapsed && <span className="truncate">{it.label}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Groups */}
          {GROUPS.map(g => {
            const open = openGroups[g.label]
            return (
              <div key={g.label} className="mt-1">
                {!collapsed && (
                  <button
                    onClick={() => setOpenGroups(s => ({ ...s, [g.label]: !s[g.label] }))}
                    className="ap-nav-section w-full flex items-center justify-between hover:text-ink transition-colors"
                  >
                    {g.label}
                    {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                )}
                {open && (
                  <ul>
                    {g.items.map(it => {
                      const active = pathname === it.href || pathname.startsWith(it.href + '/')
                      const Icon = it.icon
                      return (
                        <li key={it.href}>
                          <Link href={it.href} data-active={active} className="ap-nav" title={it.label}>
                            <Icon size={16} strokeWidth={1.6} />
                            {!collapsed && <span className="truncate">{it.label}</span>}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </nav>

        {/* Bottom utilities */}
        <div className="border-t border-line py-2">
          <button
            onClick={() => signOut()}
            className="ap-nav w-full"
            title="Sign out"
          >
            <LogOut size={16} strokeWidth={1.6} />
            {!collapsed && <span>Sign out</span>}
          </button>
          <button
            onClick={() => setCollapsed(c => !c)}
            className="ap-nav w-full"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
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
