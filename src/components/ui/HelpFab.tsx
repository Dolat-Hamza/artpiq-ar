'use client'
import { useEffect, useRef, useState } from 'react'
import { HelpCircle, Keyboard, Sparkles, X } from 'lucide-react'
import { useTour } from './Tour'

/**
 * Floating help affordance pinned to bottom-right.
 * Click → menu with: Replay tour, Show shortcuts, Close.
 * Provides a *visible* entry point for the `?` shortcut help —
 * essential because most users won't discover the keyboard shortcut.
 */
export default function HelpFab() {
  const [open, setOpen] = useState(false)
  const { startById } = useTour()
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function openShortcuts() {
    setOpen(false)
    // Synthesize the '?' keystroke so ShortcutsHelp opens
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))
  }

  function replayTour() {
    setOpen(false)
    startById('welcome')
  }

  return (
    <div
      ref={ref}
      className="fixed bottom-5 right-5 z-[9994] hidden md:block"
      aria-label="Help and tour menu"
    >
      {open && (
        <div
          role="menu"
          className="absolute bottom-12 right-0 w-[220px] bg-paper border border-line rounded-md shadow-pop py-1 mb-1"
        >
          <button
            role="menuitem"
            onClick={replayTour}
            className="w-full flex items-center gap-2 px-3 py-2 text-body hover:bg-bg text-left"
          >
            <Sparkles size={14} className="text-accent" />
            <span className="flex-1">Replay welcome tour</span>
          </button>
          <button
            role="menuitem"
            onClick={openShortcuts}
            className="w-full flex items-center gap-2 px-3 py-2 text-body hover:bg-bg text-left"
          >
            <Keyboard size={14} className="text-ink-muted" />
            <span className="flex-1">Keyboard shortcuts</span>
            <kbd className="text-meta tracking-[0.12em] uppercase text-ink-muted border border-line rounded-xs px-1 py-0.5 bg-bg">
              ?
            </kbd>
          </button>
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        title="Help"
        aria-label={open ? 'Close help menu' : 'Open help menu'}
        className="w-10 h-10 rounded-full bg-ink text-paper grid place-items-center shadow-pop hover:bg-accent transition-colors"
      >
        {open ? <X size={16} /> : <HelpCircle size={16} />}
      </button>
    </div>
  )
}
