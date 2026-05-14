import { NextResponse } from 'next/server'
import { rpcError, userClient } from '../_lib'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { client } = userClient(request)
  const { data, error } = await client.rpc('superadmin_list_admins')
  if (error) return rpcError(error)
  return NextResponse.json({ admins: data ?? [] })
}

export async function POST(request: Request) {
  const { email, role } = (await request.json().catch(() => ({}))) as { email?: string; role?: string }
  if (!email?.trim()) {
    return NextResponse.json({ error: 'email required' }, { status: 400 })
  }
  const { client } = userClient(request)
  const { error } = await client.rpc('superadmin_upsert_admin', {
    p_email: email.trim().toLowerCase(),
    p_role: role || 'super',
  })
  if (error) return rpcError(error)
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const url = new URL(request.url)
  const email = url.searchParams.get('email')?.trim().toLowerCase()
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })
  const { client } = userClient(request)
  const { error } = await client.rpc('superadmin_delete_admin', { p_email: email })
  if (error) return rpcError(error)
  return NextResponse.json({ ok: true })
}
