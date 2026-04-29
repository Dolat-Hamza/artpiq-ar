'use client'
import { useState } from 'react'
import {
  signInWithGoogle,
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

  async function google() {
    setBusy(true)
    setErr(null)
    setMsg(null)
    try {
      const redirect =
        typeof window !== 'undefined'
          ? `${window.location.origin}/admin/artworks`
          : undefined
      await signInWithGoogle(redirect)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="text-xl font-medium mb-6">Sign in to manage artworks</h1>

      <button
        type="button"
        onClick={google}
        disabled={busy}
        className="w-full mb-4 flex items-center justify-center gap-2 border border-neutral-300 rounded px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
      >
        <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.3-.1-2.4-.4-3.5z"/>
        </svg>
        Continue with Google
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-neutral-200" />
        <span className="text-[11px] uppercase tracking-widest text-neutral-500">or</span>
        <div className="flex-1 h-px bg-neutral-200" />
      </div>

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
