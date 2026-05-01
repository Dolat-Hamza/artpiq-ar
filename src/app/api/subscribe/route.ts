import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

interface Body {
  ownerId?: string
  email?: string
  name?: string
  source?: string
  website?: string
}

const bucket = new Map<string, { n: number; t: number }>()
function rateLimitOk(ip: string, max = 5, windowMs = 60_000): boolean {
  const now = Date.now()
  const cur = bucket.get(ip)
  if (!cur || now - cur.t > windowMs) {
    bucket.set(ip, { n: 1, t: now })
    return true
  }
  cur.n++
  return cur.n <= max
}

export async function POST(req: Request) {
  if (!url || !key) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'anon'
  if (!rateLimitOk(ip)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  let body: Body
  try { body = (await req.json()) as Body } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (body.website) return NextResponse.json({ ok: true })
  if (!body.ownerId || !body.email) return NextResponse.json({ error: 'ownerId + email required' }, { status: 400 })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  const sb = createClient(url, key)
  const { data, error } = await sb.rpc('subscribe_newsletter', {
    p_owner: body.ownerId,
    p_email: body.email.slice(0, 200),
    p_name: body.name?.slice(0, 200) ?? null,
    p_source: body.source?.slice(0, 50) ?? 'NewsletterForm',
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data })
}
