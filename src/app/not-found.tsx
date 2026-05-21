// 404 fallback. Default Next.js 404 is a bare "404 not found" — give it a
// branded shell so we don't ship something that looks broken.
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-bg text-ink grid place-items-center p-6">
      <div className="max-w-[420px] text-center">
        <p className="text-meta uppercase tracking-[0.18em] text-ink-muted mb-2">404</p>
        <h1 className="font-display text-[18px] tracking-[0.18em] uppercase mb-3">Not found</h1>
        <p className="text-body text-ink-muted mb-4 leading-relaxed">
          That page does not exist or has been moved.
        </p>
        <div className="flex justify-center gap-2">
          <Link href="/" className="btn-primary">Go home</Link>
          <Link href="/admin" className="btn-outline">Open ArtPiq</Link>
        </div>
      </div>
    </div>
  )
}
