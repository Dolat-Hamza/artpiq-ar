'use client'
import { useState } from 'react'
import {
  signInWithMagicLink,
  signInWithPassword,
  signUpWithPassword,
} from '@/lib/db/auth'

type Mode = 'password' | 'magic' | 'signup'

export default function LoginForm() {
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    setMsg(null)
    try {
      if (mode === 'password') {
        await signInWithPassword(email, password)
      } else if (mode === 'signup') {
        await signUpWithPassword(email, password)
        setMsg('Check your inbox to confirm the email.')
      } else {
        const redirect =
          typeof window !== 'undefined'
            ? `${window.location.origin}/admin/artworks`
            : undefined
        await signInWithMagicLink(email, redirect)
        setMsg('Magic link sent. Check your inbox.')
      }
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e)
      setErr(m)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="text-xl font-medium mb-6">Sign in to manage artworks</h1>

      <div className="flex gap-2 mb-4 text-xs">
        {(['password', 'magic', 'signup'] as Mode[]).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m)
              setErr(null)
              setMsg(null)
            }}
            className={`px-3 py-1.5 rounded-full border ${
              mode === m
                ? 'bg-black text-white border-black'
                : 'border-neutral-300'
            }`}
          >
            {m === 'password'
              ? 'Sign in'
              : m === 'magic'
                ? 'Magic link'
                : 'Sign up'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-3">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm"
        />
        {mode !== 'magic' && (
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-black text-white text-sm py-2 rounded disabled:opacity-50"
        >
          {busy
            ? 'Working…'
            : mode === 'password'
              ? 'Sign in'
              : mode === 'signup'
                ? 'Create account'
                : 'Send magic link'}
        </button>
      </form>

      {msg && <p className="mt-3 text-sm text-emerald-700">{msg}</p>}
      {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
    </div>
  )
}
