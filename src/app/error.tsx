'use client'

// Root error boundary. Catches any uncaught render error in the app tree
// and replaces it with a friendly fallback instead of the raw stack trace.
// Logs to console so we can grab the stack from Vercel logs during triage.
import { useEffect } from 'react'
import Link from 'next/link'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[root error]', error)
  }, [error])

  return (
    <html lang="en">
      <body className="min-h-dvh bg-bg text-ink grid place-items-center p-6">
        <div className="max-w-[420px] text-center">
          <h1 className="font-display text-[18px] tracking-[0.18em] uppercase mb-3">Something went wrong</h1>
          <p className="text-body text-ink-muted mb-4 leading-relaxed">
            We hit an unexpected error. Try reloading — if it keeps happening, ping support.
          </p>
          <div className="flex justify-center gap-2">
            <button onClick={reset} className="btn-primary">Try again</button>
            <Link href="/" className="btn-outline">Go home</Link>
          </div>
          {error.digest && (
            <p className="mt-4 text-meta uppercase tracking-[0.12em] text-ink-muted/70">
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
