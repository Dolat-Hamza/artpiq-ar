'use client'
import Link from 'next/link'
import { useState } from 'react'
import {
  signInWithGoogle,
  signInWithMagicLink,
  signInWithPassword,
  signUpWithPassword,
} from '@/lib/db/auth'
import Chip from './ui/Chip'
import Button from './ui/Button'

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
            ? `${window.location.origin}/admin`
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
          ? `${window.location.origin}/admin`
          : undefined
      await signInWithGoogle(redirect)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-[420px] w-full p-8 bg-paper border border-line rounded-md shadow-card">
      <Link href="/" className="inline-flex items-center gap-2 mb-6">
        <span className="font-display text-[18px] tracking-[0.04em] leading-none">artpiq</span>
        <span className="w-2.5 h-2.5 bg-accent rounded-[2px] inline-block" />
      </Link>
      <h1 className="font-display text-h3 mb-1">Sign in</h1>
      <p className="text-body text-ink-muted mb-6">
        Manage artworks, compose mockups, share viewing rooms.
      </p>

      <Button
        variant="secondary"
        size="lg"
        fullWidth
        onClick={google}
        loading={busy}
        iconBefore={
          <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.6 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.3-.1-2.4-.4-3.5z" />
          </svg>
        }
      >
        Continue with Google
      </Button>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-line" />
        <span className="text-[10px] tracking-[0.20em] uppercase text-ink-muted">or</span>
        <div className="flex-1 h-px bg-line" />
      </div>

      <div className="flex gap-1.5 mb-4">
        {(['password', 'magic', 'signup'] as Mode[]).map(m => (
          <Chip
            key={m}
            active={mode === m}
            size="sm"
            onClick={() => {
              setMode(m)
              setErr(null)
              setMsg(null)
            }}
          >
            {m === 'password' ? 'Sign in' : m === 'magic' ? 'Magic link' : 'Sign up'}
          </Chip>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-3">
        <FieldLabel label="Email">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full h-10 border border-line rounded-sm px-3 text-body bg-paper hover:border-line-strong focus:border-accent"
          />
        </FieldLabel>
        {mode !== 'magic' && (
          <FieldLabel
            label="Password"
            hint={mode === 'password' ? 'Forgot?' : undefined}
            hintHref="/login/forgot"
          >
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder="At least 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full h-10 border border-line rounded-sm px-3 text-body bg-paper hover:border-line-strong focus:border-accent"
            />
          </FieldLabel>
        )}
        <Button type="submit" variant="primary" size="lg" fullWidth loading={busy}>
          {mode === 'password' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send magic link'}
        </Button>
      </form>

      {msg && (
        <p className="mt-4 text-body text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-sm px-3 py-2">
          {msg}
        </p>
      )}
      {err && (
        <p className="mt-4 text-body text-red-700 bg-red-50 border border-red-200 rounded-sm px-3 py-2">
          {err}
        </p>
      )}
    </div>
  )
}

function FieldLabel({
  label,
  children,
  hint,
  hintHref,
}: {
  label: string
  children: React.ReactNode
  hint?: string
  hintHref?: string
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-meta uppercase text-ink-muted">{label}</span>
        {hint && hintHref && (
          <Link href={hintHref} className="text-[11px] text-ink-muted hover:text-accent underline">
            {hint}
          </Link>
        )}
      </div>
      {children}
    </label>
  )
}
