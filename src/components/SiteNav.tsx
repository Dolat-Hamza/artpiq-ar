'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowLeft,
  Home,
  Image as ImageIcon,
  LayoutGrid,
  Star,
  User,
} from 'lucide-react'

export default function SiteNav({ showBack = true }: { showBack?: boolean }) {
  const pathname = usePathname()

  const links = [
    { href: '/', label: 'Gallery', icon: Home },
    { href: '/sample-room', label: 'Sample room', icon: ImageIcon },
    { href: '/admin/exhibitions', label: 'Exhibitions', icon: Star },
    { href: '/admin', label: 'Admin', icon: LayoutGrid },
  ]

  return (
    <nav className="sticky top-0 z-40 bg-paper border-b border-line">
      <div className="px-6 md:px-10 h-topbar flex items-center gap-4">
        {showBack && (
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-meta uppercase tracking-[0.14em] text-ink-muted hover:text-ink"
          >
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">Back</span>
          </Link>
        )}
        <Link href="/" className="font-display text-[16px] tracking-[0.04em] leading-none inline-flex items-center gap-2">
          artpiq
          <span className="w-2.5 h-2.5 bg-accent rounded-[2px] inline-block" />
        </Link>
        <div className="ml-auto flex items-center gap-1 text-body">
          {links.map(l => {
            const active =
              l.href === '/' ? pathname === '/' : pathname.startsWith(l.href)
            const Icon = l.icon
            return (
              <Link
                key={l.href}
                href={l.href}
                data-active={active}
                className="ap-nav !rounded-md"
              >
                <Icon size={14} strokeWidth={1.6} />
                <span className="hidden sm:inline">{l.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
