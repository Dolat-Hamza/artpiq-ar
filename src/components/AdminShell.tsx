'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  Briefcase,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  FileText,
  Frame,
  Home,
  Image as ImageIcon,
  LayoutGrid,
  Library,
  LogOut,
  Mail,
  Megaphone,
  Palette,
  PieChart,
  Plus,
  Search,
  Star,
  Users,
} from 'lucide-react'
import { signOut, useAuth } from '@/lib/db/auth'
import { ToastProvider } from './ui/toast'
import { ConfirmProvider } from './ui/ConfirmDialog'
import CommandPalette from './ui/CommandPalette'
import ShortcutsHelp from './ui/ShortcutsHelp'
import GlobalKeyboardNav from './ui/GlobalKeyboardNav'
import HelpFab from './ui/HelpFab'
import { TourProvider } from './ui/Tour'

// ArtPlacer-style sidebar: white bg, group headers, primary CTA pill, collapse
const TOP: { href: string; label: string; icon: typeof Home }[] = [
  { href: '/admin', label: 'Dashboard', icon: Home },
  { href: '/admin/artworks', label: 'Artworks', icon: Frame },
  { href: '/admin/rooms', label: 'Room Mockups', icon: Library },
]

type NavItem = { href: string; label: string; icon: typeof Home; tourId?: string }
const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Visualisation',
    items: [
      { href: '/admin/presentations', label: 'Presentations', icon: FileText, tourId: 'nav-presentations' },
      { href: '/admin/sequence', label: 'Artwork Sequence', icon: Star },
      { href: '/admin/designs', label: 'My Designs', icon: LayoutGrid },
      { href: '/sample-room', label: 'Sample Room', icon: ImageIcon },
    ],
  },
  {
    label: 'CRM',
    items: [
      { href: '/admin/contacts', label: 'Contacts', icon: Users, tourId: 'nav-contacts' },
      { href: '/admin/organizations', label: 'Organizations', icon: Briefcase },
      { href: '/admin/deals', label: 'Deals', icon: PieChart, tourId: 'nav-deals' },
      { href: '/admin/tasks', label: 'Tasks', icon: CheckSquare },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { href: '/admin/marketing', label: 'Marketing Portal', icon: PieChart, tourId: 'nav-marketing' },
      { href: '/admin/social', label: 'Social Calendar', icon: Calendar },
      { href: '/admin/blog', label: 'Blog', icon: Megaphone },
      { href: '/admin/inbox', label: 'Newsletter', icon: Mail },
      { href: '/admin/profile', label: 'Social Media Posts', icon: Palette },
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
    <ToastProvider>
    <ConfirmProvider>
    <TourProvider>
    <CommandPalette />
    <ShortcutsHelp />
    <GlobalKeyboardNav />
    <HelpFab />
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

        {/* Primary CTA — universal Create */}
        <div className="px-3 pt-3 pb-2">
          <CreateMenu collapsed={collapsed} />
        </div>

        {/* Search trigger */}
        <div className="px-3 pb-2">
          <button
            data-tour="cmd-k"
            onClick={() => window.dispatchEvent(new Event('artpiq:open-cmdk'))}
            title="Search (⌘K)"
            className="ap-nav w-full text-left"
          >
            <Search size={16} strokeWidth={1.6} />
            {!collapsed && (
              <span className="flex-1 flex items-center justify-between">
                <span className="text-ink-muted">Search</span>
                <kbd className="text-meta tracking-[0.14em] uppercase text-ink-muted border border-line rounded-xs px-1 py-0.5 bg-bg">⌘K</kbd>
              </span>
            )}
          </button>
        </div>

        {/* Top static items */}
        <nav className="overflow-y-auto flex-1 py-2">
          <ul>
            {TOP.map(it => {
              const active = it.href === '/admin' ? pathname === '/admin' : (pathname === it.href || pathname.startsWith(it.href + '/'))
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
                      const active = it.href === '/admin' ? pathname === '/admin' : (pathname === it.href || pathname.startsWith(it.href + '/'))
                      const Icon = it.icon
                      return (
                        <li key={it.href}>
                          <Link
                            href={it.href}
                            data-active={active}
                            data-tour={it.tourId}
                            className="ap-nav"
                            title={it.label}
                          >
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
          const active = href === '/admin' ? pathname === '/admin' : (pathname === href || pathname.startsWith(href + '/'))
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
    </TourProvider>
    </ConfirmProvider>
    </ToastProvider>
  )
}

// ──────────────────────────────────────────────────────────────
// Universal Create menu — single entry point for new entities.
// Routes to the relevant list page with ?new=1 query so the
// destination can auto-open its add modal. Falls back to the list
// page even if the route ignores the query param.
// ──────────────────────────────────────────────────────────────
const CREATE_ITEMS: { label: string; href: string; icon: typeof Home; shortcut?: string }[] = [
  { label: 'Artwork', href: '/admin/artworks?new=1', icon: Frame, shortcut: 'A' },
  { label: 'Contact', href: '/admin/contacts?new=1', icon: Users, shortcut: 'C' },
  { label: 'Deal', href: '/admin/deals?new=1', icon: PieChart, shortcut: 'D' },
  { label: 'Task', href: '/admin/tasks?new=1', icon: CheckSquare, shortcut: 'T' },
  { label: 'Presentation', href: '/admin/presentations?new=1', icon: FileText, shortcut: 'P' },
  { label: 'Social post', href: '/admin/social?new=1', icon: Megaphone, shortcut: 'S' },
  { label: 'Room design', href: '/sample-room', icon: ImageIcon, shortcut: 'R' },
]

function CreateMenu({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
      // Letter shortcut while menu open
      const match = CREATE_ITEMS.find(i => i.shortcut?.toLowerCase() === e.key.toLowerCase())
      if (match) {
        e.preventDefault()
        setOpen(false)
        router.push(match.href)
      }
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, router])

  return (
    <div className="relative" ref={ref}>
      <button
        data-tour="create-menu"
        onClick={() => setOpen(o => !o)}
        className="btn-primary w-full"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Plus size={14} strokeWidth={2.5} />
        {!collapsed && (
          <span className="inline-flex items-center gap-1">
            Create
            <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </span>
        )}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 right-0 mt-2 bg-paper border border-line rounded-md shadow-pop py-1 z-50 max-h-[70vh] overflow-y-auto"
        >
          {CREATE_ITEMS.map(i => {
            const Icon = i.icon
            return (
              <Link
                key={i.label}
                href={i.href}
                onClick={() => setOpen(false)}
                role="menuitem"
                className="flex items-center gap-2 px-3 py-2 text-body hover:bg-bg group"
              >
                <Icon size={14} strokeWidth={1.6} className="text-ink-muted group-hover:text-ink" />
                <span className="flex-1">{i.label}</span>
                {i.shortcut && (
                  <kbd className="text-meta tracking-[0.12em] uppercase text-ink-muted border border-line rounded-xs px-1 py-0.5 bg-bg">
                    {i.shortcut}
                  </kbd>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
