'use client'
import { AnimatePresence, motion } from 'framer-motion'
import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { AlertCircle, Check, Info, X } from 'lucide-react'

type ToastKind = 'success' | 'error' | 'info'
interface Toast {
  id: number
  kind: ToastKind
  message: string
  description?: string
  action?: { label: string; onClick: () => void }
}

interface ToastApi {
  show: (t: Omit<Toast, 'id'> | string) => void
  success: (msg: string, description?: string) => void
  error: (msg: string, description?: string) => void
  info: (msg: string, description?: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (ctx) return ctx
  // Graceful fallback when used outside provider — log to console
  return {
    show: (t) => console.warn('[Toast outside provider]', t),
    success: (m) => console.log('[Toast]', m),
    error: (m) => console.error('[Toast]', m),
    info: (m) => console.log('[Toast]', m),
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: number) => {
    setToasts(s => s.filter(t => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const show = useCallback((input: Omit<Toast, 'id'> | string) => {
    const id = ++counter.current
    const toast: Toast = typeof input === 'string'
      ? { id, kind: 'info', message: input }
      : { id, ...input }
    setToasts(s => [...s.slice(-3), toast]) // keep at most 4
    const ttl = toast.kind === 'error' ? 6000 : 3500
    timers.current.set(id, setTimeout(() => dismiss(id), ttl))
  }, [dismiss])

  const api: ToastApi = {
    show,
    success: (m, d) => show({ kind: 'success', message: m, description: d }),
    error: (m, d) => show({ kind: 'error', message: m, description: d }),
    info: (m, d) => show({ kind: 'info', message: m, description: d }),
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col-reverse gap-2 max-w-[360px] pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
              className="pointer-events-auto bg-paper border border-line rounded-md shadow-pop overflow-hidden"
            >
              <div className="flex items-start gap-3 p-3">
                <span className="shrink-0 mt-0.5">
                  {t.kind === 'success' && <Check size={16} className="text-emerald-600" />}
                  {t.kind === 'error' && <AlertCircle size={16} className="text-red-600" />}
                  {t.kind === 'info' && <Info size={16} className="text-accent" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-body font-bold text-ink">{t.message}</p>
                  {t.description && (
                    <p className="text-meta text-ink-muted mt-0.5">{t.description}</p>
                  )}
                  {t.action && (
                    <button
                      onClick={() => { t.action!.onClick(); dismiss(t.id) }}
                      className="mt-1.5 text-meta uppercase tracking-[0.14em] text-accent underline"
                    >
                      {t.action.label}
                    </button>
                  )}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  className="shrink-0 text-ink-muted hover:text-ink"
                  aria-label="Dismiss"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
