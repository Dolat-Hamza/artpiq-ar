import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * Service-role client. Bypasses RLS. ONLY use after verifying the
 * caller is in public.app_admins via assertSuperAdmin().
 */
export function serviceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

/**
 * Verifies the request's bearer JWT, returns the caller email if they
 * are in public.app_admins. Throws a NextResponse on failure for
 * direct return from a route handler.
 */
export async function assertSuperAdmin(request: Request): Promise<{ email: string }> {
  const auth = request.headers.get('authorization') ?? request.headers.get('Authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    throw NextResponse.json({ error: 'Missing token' }, { status: 401 })
  }

  // Verify token via the public client (anon key is fine for getUser)
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data: userRes, error } = await anon.auth.getUser(token)
  if (error || !userRes.user?.email) {
    throw NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const email = userRes.user.email.toLowerCase()
  const svc = serviceClient()
  const { data: adminRow } = await svc
    .from('app_admins')
    .select('email')
    .ilike('email', email)
    .maybeSingle()
  if (!adminRow) {
    throw NextResponse.json({ error: 'Not a super-admin' }, { status: 403 })
  }
  return { email }
}
