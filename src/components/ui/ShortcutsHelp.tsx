'use client'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Keyboard, X } from 'lucide-react'

interface Shortcut {
  keys: string[]
  description: string
}

const SHORTCUTS: { group: string; items: Shortcut[] }[] = [
  {
    group: 'General',
    items: [
      { keys: ['⌘', 'K'], description: 'Open command palette' },
      { keys: ['/'], description: 'Quick search (when not typing)' },
      { keys: ['?'], description: 'Show keyboard shortcuts (this dialog)' },
      { keys: ['Esc'], description: 'Close any modal / panel' },
    ],
  },
  {
    group: 'Navigation',
    items: [
      { keys: ['g', 'd'], description: 'Go to Dashboard' },
      { keys: ['g', 'a'], description: 'Go to Artworks' },
      { keys: ['g', 'p'], description: 'Go to Presentations' },
      { keys: ['g', 'c'], description: 'Go to Contacts' },
      { keys: ['g', 's'], description: 'Go to Social Calendar' },
    ],
  },
  {
    group: 'Within a list',
    items: [
      { keys: ['↑', '↓'], description: 'Move selection' },
      { keys: ['↵'], description: 'Open selected item' },
      { keys: ['⌫'], description: 'Delete (with confirmation)' },
    ],
  },
]

export default function ShortcutsHelp() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // '?' = shift+/
      if (e.key === '?' && !isTyping(e)) {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape' && open) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9997] bg-black/30 grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={e => e.stopPropagation()}
            className="bg-paper rounded-md shadow-pop w-full max-w-[520px] overflow-hidden"
          >
            <header className="px-6 h-14 flex items-center gap-2 border-b border-line">
              <Keyboard size={16} />
              <h2 className="font-display text-[14px] tracking-[0.18em] uppercase">Keyboard shortcuts</h2>
              <button onClick={() => setOpen(false)} className="ml-auto text-ink-muted hover:text-ink">
                <X size={16} />
              </button>
            </header>
            <div className="px-6 py-5 grid gap-4 max-h-[60vh] overflow-y-auto">
              {SHORTCUTS.map(g => (
                <section key={g.group}>
                  <p className="text-meta uppercase tracking-[0.14em] text-ink-muted font-bold mb-2">{g.group}</p>
                  <ul className="grid gap-1.5">
                    {g.items.map((s, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 text-body">
                        <span className="text-ink-soft">{s.description}</span>
                        <span className="flex items-center gap-1 shrink-0">
                          {s.keys.map((k, j) => (
                            <kbd key={j} className="text-meta tracking-[0.14em] uppercase text-ink border border-line rounded-xs px-1.5 py-0.5 bg-bg">
                              {k}
                            </kbd>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null
  if (!t) return false
  const tag = t.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (t.isContentEditable) return true
  return false
}
