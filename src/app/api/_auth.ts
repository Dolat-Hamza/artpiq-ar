import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * Verify the request carries a valid Supabase auth JWT. Used by AI routes
 * and the newsletter sender to prevent unauthenticated calls that would
 * either leak CRM data (summarise-contact) or drain budget / spam
 * subscribers (generate-content, newsletter/send).
 *
 * Returns:
 * - `{ user }` on success — the authenticated Supabase user.
 * - `NextResponse` on failure — already shaped as a 401/403; the caller
 *   should just return it.
 *
 * Optional `requireOwner` enforces user.id === ownerId. Use this when the
 * route accepts an `ownerId` param so a logged-in user can't run actions
 * scoped to a different gallery.
 */
export async function requireAuth(
  request: Request,
  options?: { requireOwner?: string },
): Promise<{ user: { id: string; email?: string } } | NextResponse> {
  const auth = request.headers.get('authorization') ?? request.headers.get('Authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }
  const client = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.auth.getUser(token)
  if (error || !data.user) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }
  if (options?.requireOwner && data.user.id !== options.requireOwner) {
    return NextResponse.json({ error: 'Not allowed for this owner' }, { status: 403 })
  }
  return { user: { id: data.user.id, email: data.user.email ?? undefined } }
}

// Minimal UUID v4-ish check. Accepts any reasonable UUID string. Used by
// API routes to reject malformed IDs before they hit the DB layer (avoids
// leaking schema details via Postgres error messages).
export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}
