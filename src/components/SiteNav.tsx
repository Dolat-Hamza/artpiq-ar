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
    <nav className="sticky top-0 z-40 bg-paper/90 backdrop-blur-sm border-b border-line">
      <div className="max-w-content mx-auto px-6 md:px-12 lg:px-20 h-[56px] flex items-center gap-6">
        {showBack && (
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[12px] tracking-[0.14em] uppercase text-ink-muted hover:text-ink"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Back</span>
          </Link>
        )}
        <Link href="/" className="font-display text-[20px] tracking-tight leading-none">
          artpiq<span className="text-accent">.</span>
        </Link>
        <div className="ml-auto flex items-center gap-1 sm:gap-3 text-[13px]">
          {links.map(l => {
            const active =
              l.href === '/' ? pathname === '/' : pathname.startsWith(l.href)
            const Icon = l.icon
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`inline-flex items-center gap-1.5 px-2 py-1 transition-colors ${
                  active ? 'text-ink' : 'text-ink-muted hover:text-ink'
                }`}
              >
                <Icon size={13} />
                <span className="hidden sm:inline">{l.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
