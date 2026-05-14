import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * Returns a Supabase client authenticated as the caller (Bearer JWT
 * from the request). All super-admin RPCs check public.app_admins
 * internally via SECURITY DEFINER, so no service-role key is needed.
 */
export function userClient(request: Request): { client: SupabaseClient; token: string } {
  const auth = request.headers.get('authorization') ?? request.headers.get('Authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  )
  return { client, token }
}

export function rpcError(error: { message?: string } | null) {
  const msg = error?.message || 'unknown'
  // Differentiate auth from generic errors so the client can react.
  if (msg.toLowerCase().includes('super-admin') || msg.toLowerCase().includes('jwt')) {
    return NextResponse.json({ error: msg }, { status: 403 })
  }
  return NextResponse.json({ error: msg }, { status: 500 })
}
