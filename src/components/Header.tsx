'use client'
import { LayoutGrid, Frame } from 'lucide-react'
import { useStore } from '@/store'

export default function Header() {
  const { activeFilter, setFilter, isSelectMode, enterSelectMode, exitSelectMode } = useStore()

  const tabs = [
    { label: 'All works', value: 'all' },
    { label: 'Paintings', value: 'painting' },
    { label: 'Sculptures', value: 'sculpture' },
  ]

  return (
    <header className="sticky top-0 z-50 bg-paper/90 backdrop-blur-sm border-b border-line">
      <div className="max-w-content mx-auto px-6 md:px-12 lg:px-20 h-[56px] flex items-center">
        <div className="flex-1">
          <span className="font-display text-[22px] tracking-tight leading-none">
            artpiq<span className="text-accent">.</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-[13px]">
          {tabs.map(t => (
            <button
              key={t.value}
              onClick={() => setFilter(t.value)}
              className={`transition-colors ${
                activeFilter === t.value ? 'text-ink' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 flex justify-end items-center gap-2">
          <button
            onClick={isSelectMode ? exitSelectMode : enterSelectMode}
            className={`hidden sm:inline-flex items-center gap-2 h-9 px-3 text-[12px] border transition-colors ${
              isSelectMode
                ? 'bg-ink text-paper border-ink'
                : 'bg-transparent text-ink border-line hover:border-ink'
            }`}
          >
            <Frame size={14} />
            {isSelectMode ? 'Done' : 'Curate wall'}
          </button>
          <button
            onClick={isSelectMode ? exitSelectMode : enterSelectMode}
            className="sm:hidden h-9 w-9 flex items-center justify-center border border-line text-ink"
            aria-label="Curate wall"
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      <div className="md:hidden max-w-content mx-auto px-6 pb-3 flex gap-5 text-[12px] overflow-x-auto no-scrollbar">
        {tabs.map(t => (
          <button
            key={t.value}
            onClick={() => setFilter(t.value)}
            className={`whitespace-nowrap transition-colors ${
              activeFilter === t.value ? 'text-ink border-b border-ink pb-1' : 'text-ink-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </header>
  )
}
