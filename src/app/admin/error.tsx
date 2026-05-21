'use client'

// Admin-scoped error boundary. Keeps the admin shell chrome intact when a
// single page crashes, with a reset button that lets the user retry without
// a full page reload.
import { useEffect } from 'react'
import Link from 'next/link'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[admin error]', error)
  }, [error])

  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <div className="max-w-[420px] text-center">
        <h2 className="font-display text-[14px] tracking-[0.18em] uppercase mb-2">Page crashed</h2>
        <p className="text-body text-ink-muted mb-4 leading-relaxed">
          Something in this page threw an error. Reset to recover, or open another section from the nav.
        </p>
        <div className="flex justify-center gap-2">
          <button onClick={reset} className="btn-primary">Reset page</button>
          <Link href="/admin" className="btn-outline">Back to dashboard</Link>
        </div>
        {error.digest && (
          <p className="mt-4 text-meta uppercase tracking-[0.12em] text-ink-muted/70">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
