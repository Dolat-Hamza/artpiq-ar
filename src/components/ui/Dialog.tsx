'use client'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  maxWidth?: string
  hideClose?: boolean
}

export default function Dialog({
  open,
  onClose,
  title,
  children,
  maxWidth = '520px',
  hideClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    // Focus first interactive element inside dialog
    requestAnimationFrame(() => {
      const focusable = ref.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      focusable?.focus()
    })
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previouslyFocused.current?.focus?.()
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'dialog-title' : undefined}
      className="fixed inset-0 z-[300] grid place-items-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={ref}
        onClick={e => e.stopPropagation()}
        style={{ maxWidth }}
        className="relative w-full bg-paper shadow-pop rounded-md border border-line max-h-[90vh] overflow-y-auto"
      >
        {(title || !hideClose) && (
          <header className="sticky top-0 bg-paper z-10 flex items-center gap-3 px-5 h-14 border-b border-line">
            {title && (
              <h2 id="dialog-title" className="font-display text-[15px] flex-1 truncate">
                {title}
              </h2>
            )}
            {!hideClose && (
              <button
                onClick={onClose}
                aria-label="Close"
                className="grid place-items-center w-8 h-8 text-ink-muted hover:text-ink"
              >
                <X size={16} />
              </button>
            )}
          </header>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
