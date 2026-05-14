import { NextResponse } from 'next/server'
import { assertSuperAdmin, serviceClient } from '../_lib'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    await assertSuperAdmin(request)
  } catch (resp) {
    if (resp instanceof NextResponse) return resp
    throw resp
  }
  const { data, error } = await serviceClient().from('app_admins').select('*').order('created_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ admins: data ?? [] })
}

export async function POST(request: Request) {
  try {
    await assertSuperAdmin(request)
  } catch (resp) {
    if (resp instanceof NextResponse) return resp
    throw resp
  }
  const { email, role } = (await request.json().catch(() => ({}))) as { email?: string; role?: string }
  if (!email?.trim()) {
    return NextResponse.json({ error: 'email required' }, { status: 400 })
  }
  const { error } = await serviceClient()
    .from('app_admins')
    .upsert({ email: email.trim().toLowerCase(), role: role || 'super' }, { onConflict: 'email' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  try {
    await assertSuperAdmin(request)
  } catch (resp) {
    if (resp instanceof NextResponse) return resp
    throw resp
  }
  const url = new URL(request.url)
  const email = url.searchParams.get('email')?.trim().toLowerCase()
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })
  const { error } = await serviceClient().from('app_admins').delete().eq('email', email)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
