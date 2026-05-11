'use client'
import { createContext, useCallback, useContext, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface ConfirmOpts {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

type ConfirmFn = (opts: ConfirmOpts) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (ctx) return ctx
  // Fallback to browser confirm if used outside provider
  return async (opts) => window.confirm(`${opts.title}${opts.description ? '\n\n' + opts.description : ''}`)
}

interface Pending {
  opts: ConfirmOpts
  resolve: (v: boolean) => void
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>(resolve => setPending({ opts, resolve }))
  }, [])

  function settle(v: boolean) {
    if (pending) {
      pending.resolve(v)
      setPending(null)
    }
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {pending && (
          <motion.div
            className="fixed inset-0 z-[10000] bg-black/40 grid place-items-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => settle(false)}
            onKeyDown={e => {
              if (e.key === 'Escape') settle(false)
              if (e.key === 'Enter') settle(true)
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
              className="bg-paper rounded-md shadow-pop w-full max-w-[400px] p-6"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="font-display text-[16px] tracking-[0.04em] mb-1">{pending.opts.title}</h3>
              {pending.opts.description && (
                <p className="text-body text-ink-muted leading-relaxed">{pending.opts.description}</p>
              )}
              <div className="flex justify-end gap-2 mt-5">
                <button
                  onClick={() => settle(false)}
                  className="btn-outline"
                  autoFocus
                >
                  {pending.opts.cancelLabel ?? 'Cancel'}
                </button>
                <button
                  onClick={() => settle(true)}
                  className={pending.opts.destructive
                    ? 'btn-primary !bg-red-600 hover:!bg-red-700'
                    : 'btn-primary'}
                >
                  {pending.opts.confirmLabel ?? 'Confirm'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  )
}
