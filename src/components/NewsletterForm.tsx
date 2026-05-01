'use client'
import { useState } from 'react'

export default function NewsletterForm({
  ownerId,
  source = 'NewsletterForm',
  label = 'Get updates',
  className = '',
}: {
  ownerId: string
  source?: string
  label?: string
  className?: string
}) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      const r = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId, email, name, website, source }),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.error || `HTTP ${r.status}`)
      }
      setDone(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <p className={`text-[13px] text-emerald-700 ${className}`}>
        Thanks — you’re on the list.
      </p>
    )
  }
  return (
    <form onSubmit={submit} className={`flex flex-col gap-2 max-w-sm ${className}`}>
      <p className="text-[11px] tracking-[0.18em] uppercase text-ink-muted">{label}</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name (optional)"
          className="flex-1 border border-line px-2 py-1.5 text-[13px]"
        />
      </div>
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 border border-line px-2 py-1.5 text-[13px]"
        />
        <button
          type="submit"
          disabled={busy}
          className="px-3 py-1.5 text-[11px] tracking-[0.16em] uppercase bg-ink text-paper disabled:opacity-40"
        >
          {busy ? '…' : 'Join'}
        </button>
      </div>
      {/* honeypot — keep visually hidden */}
      <input
        tabIndex={-1}
        autoComplete="off"
        type="text"
        value={website}
        onChange={e => setWebsite(e.target.value)}
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
        aria-hidden="true"
      />
      {err && <p className="text-[12px] text-red-600">{err}</p>}
    </form>
  )
}
