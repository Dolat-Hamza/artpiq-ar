'use client'
import { Share2 } from 'lucide-react'
import { useStore } from '@/store'

export default function Header() {
  const { current, showToast, activeFilter, setFilter } = useStore()

  async function shareOrCopy(aw: typeof current) {
    const base = window.location.origin + window.location.pathname
    const url = aw ? `${base}?artwork=${aw.id}` : base
    const title = `${aw?.title ?? 'ArtPiq'} — View in AR`
    if (navigator.share) {
      try { await navigator.share({ title, url }); return } catch {}
    }
    try { await navigator.clipboard.writeText(url); showToast('Link copied!') }
    catch { showToast('Copy: ' + url) }
  }

  const tabs = [
    { label: 'All', value: 'all' },
    { label: 'Paintings', value: 'painting' },
    { label: 'Sculptures', value: 'sculpture' },
  ]

  return (
    <header className="sticky top-0 z-50 bg-[rgba(12,12,12,.92)] backdrop-blur-md border-b border-[--border]">
      <div className="flex items-center gap-2.5 px-[18px] pt-3 pb-2">
        <div className="text-xl font-extrabold tracking-tight">
          Art<span className="text-[--accent]">Piq</span>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => shareOrCopy(current)}
            className="bg-transparent border-none text-[--muted] cursor-pointer text-lg p-1.5 rounded-lg hover:text-[--text] transition-colors"
            title="Share"
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>
      <div className="flex gap-1 px-[18px] pb-2.5 overflow-x-auto scrollbar-none">
        {tabs.map(t => (
          <button
            key={t.value}
            onClick={() => setFilter(t.value)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all ${
              activeFilter === t.value
                ? 'bg-[--accent] border-[--accent] text-[#0c0c0c]'
                : 'bg-transparent border-[--border] text-[--muted] hover:text-[--text]'
            }`}
          >
            {t.label}
          </button>
        ))}
        <SelectToggle />
      </div>
    </header>
  )
}

function SelectToggle() {
  const { isSelectMode, enterSelectMode, exitSelectMode } = useStore()
  return (
    <button
      onClick={isSelectMode ? exitSelectMode : enterSelectMode}
      className={`flex-shrink-0 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all whitespace-nowrap ${
        isSelectMode
          ? 'bg-[--accent] border-[--accent] text-[#0c0c0c]'
          : 'bg-transparent border-[--border] text-[--muted]'
      }`}
    >
      {isSelectMode ? '✓ Done' : '🖼 Select'}
    </button>
  )
}
