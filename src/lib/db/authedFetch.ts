// Client-side fetch wrapper that automatically attaches the current
// Supabase auth Bearer token. Use this for any internal /api/* call that
// is gated by `requireAuth()` server-side (AI routes, newsletter send,
// super-admin endpoints).
//
// Falls through to a plain fetch when no session exists — the server will
// reject with 401, which is the correct outcome for a logged-out caller.

import { supabase } from './client'

export async function authedFetch(input: string, init?: RequestInit): Promise<Response> {
  const session = (await supabase().auth.getSession()).data.session
  const token = session?.access_token
  const headers = new Headers(init?.headers)
  if (!headers.has('Content-Type') && init?.body) headers.set('Content-Type', 'application/json')
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)
  return fetch(input, { ...init, headers })
}
