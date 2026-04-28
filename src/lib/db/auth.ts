'use client'
import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { hasSupabase, supabase } from './client'

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  configured: boolean
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    configured: hasSupabase(),
  })

  useEffect(() => {
    if (!hasSupabase()) {
      setState(s => ({ ...s, loading: false }))
      return
    }
    const sb = supabase()
    let mounted = true
    sb.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setState({
        user: data.session?.user ?? null,
        session: data.session,
        loading: false,
        configured: true,
      })
    })
    const { data: sub } = sb.auth.onAuthStateChange((_evt, session) => {
      setState({ user: session?.user ?? null, session, loading: false, configured: true })
    })
    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return state
}

export async function signInWithMagicLink(email: string, redirectTo?: string) {
  const { error } = await supabase().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  })
  if (error) throw error
}

export async function signInWithPassword(email: string, password: string) {
  const { error } = await supabase().auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signUpWithPassword(email: string, password: string) {
  const { error } = await supabase().auth.signUp({ email, password })
  if (error) throw error
}

export async function signOut() {
  await supabase().auth.signOut()
}
