'use client'
import Link from 'next/link'
import { LayoutGrid, Frame, Image as ImageIcon, Settings } from 'lucide-react'
import { useStore } from '@/store'

export default function Header() {
  const { activeFilter, setFilter, isSelectMode, enterSelectMode, exitSelectMode } = useStore()

  const tabs = [
    { label: 'All works', value: 'all' },
    { label: 'Paintings', value: 'painting' },
    { label: 'Sculptures', value: 'sculpture' },
  ]

  return (
    <header className="sticky top-0 z-50 bg-paper border-b border-line">
      <div className="px-6 md:px-10 h-topbar flex items-center max-w-content mx-auto">
        <Link href="/" className="font-display text-[16px] tracking-[0.04em] leading-none inline-flex items-center gap-2">
          artpiq
          <span className="w-2.5 h-2.5 bg-accent rounded-[2px] inline-block" />
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-8 text-body">
          {tabs.map(t => (
            <button
              key={t.value}
              onClick={() => setFilter(t.value)}
              data-active={activeFilter === t.value}
              className="ap-nav !rounded-md"
            >
              {t.label}
            </button>
          ))}
          <Link href="/sample-room" className="ap-nav !rounded-md">
            <ImageIcon size={14} strokeWidth={1.6} /> Sample room
          </Link>
          <Link href="/admin" className="ap-nav !rounded-md">
            <Settings size={14} strokeWidth={1.6} /> Admin
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={isSelectMode ? exitSelectMode : enterSelectMode}
            className={`hidden sm:inline-flex items-center gap-2 h-9 px-4 rounded-md text-[11px] font-bold tracking-[0.06em] uppercase transition-colors ${
              isSelectMode
                ? 'bg-ink text-paper hover:bg-[#1a1a1a]'
                : 'btn-outline'
            }`}
          >
            <Frame size={14} strokeWidth={2} />
            {isSelectMode ? 'Done' : 'Curate wall'}
          </button>
          <button
            onClick={isSelectMode ? exitSelectMode : enterSelectMode}
            className="sm:hidden h-9 w-9 grid place-items-center rounded-md border border-line-strong text-ink"
            aria-label="Curate wall"
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      <div className="md:hidden px-6 pb-3 flex gap-5 text-body overflow-x-auto no-scrollbar border-t border-line pt-3">
        {tabs.map(t => (
          <button
            key={t.value}
            onClick={() => setFilter(t.value)}
            className={`whitespace-nowrap transition-colors ${
              activeFilter === t.value ? 'text-ink font-bold border-b border-ink pb-1' : 'text-ink-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
        <Link href="/sample-room" className="whitespace-nowrap text-ink-muted">
          Sample room
        </Link>
        <Link href="/admin" className="whitespace-nowrap text-ink-muted">
          Admin
        </Link>
      </div>
    </header>
  )
}
