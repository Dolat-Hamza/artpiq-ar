'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, Mail, Megaphone, Palette, PieChart } from 'lucide-react'

/**
 * Persistent secondary tab bar for the Marketing surface.
 * Replaces five sidebar entries with one (Marketing Portal) + this tab strip,
 * cutting top-level nav noise in half for that section.
 */
const TABS = [
  { href: '/admin/marketing', label: 'Portal', icon: PieChart },
  { href: '/admin/social', label: 'Social', icon: Calendar },
  { href: '/admin/blog', label: 'Blog', icon: Megaphone },
  { href: '/admin/inbox', label: 'Newsletter', icon: Mail },
  { href: '/admin/profile', label: 'Social posts', icon: Palette },
]

export default function MarketingTabs() {
  const pathname = usePathname()
  return (
    <div className="bg-paper border-b border-line px-6 md:px-10">
      <nav className="flex gap-1 -mb-px overflow-x-auto no-scrollbar" aria-label="Marketing sections">
        {TABS.map(t => {
          const active = pathname === t.href || pathname.startsWith(t.href + '/')
          const Icon = t.icon
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`inline-flex items-center gap-1.5 px-3 h-10 text-meta uppercase tracking-[0.14em] transition-colors border-b-2 ${
                active
                  ? 'border-ink text-ink font-bold'
                  : 'border-transparent text-ink-muted hover:text-ink hover:border-line'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={12} strokeWidth={1.6} />
              {t.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
