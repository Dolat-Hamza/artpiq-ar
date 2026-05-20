import { NextResponse } from 'next/server'
import { rpcError, userClient } from '../_lib'

export const runtime = 'nodejs'

interface BulkRoom {
  id?: string
  name: string
  category: string
  image_url: string
  thumb_url?: string | null
  wall_quad?: number[][] | null
  wall_width_cm?: number | null
  orientation?: string | null
  perspective?: string | null
  smart?: boolean
}

// Cast rpc to a loose signature — the generated Database['Functions']
// list is one migration behind; safe since both functions are admin-gated.
type LooseRpc = {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
}

export async function GET(request: Request) {
  const { client } = userClient(request)
  const loose = client as unknown as LooseRpc
  const { data, error } = await loose.rpc('superadmin_list_stock_rooms')
  if (error) return rpcError(error)
  return NextResponse.json({ rooms: data ?? [] })
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as { id?: string; wall_quad?: number[][] } | null
  if (!body?.id || !Array.isArray(body.wall_quad)) {
    return NextResponse.json({ error: 'id + wall_quad required' }, { status: 400 })
  }
  const { client } = userClient(request)
  const loose = client as unknown as LooseRpc
  const { error } = await loose.rpc('superadmin_update_stock_room_quad', {
    p_id: body.id,
    p_quad: body.wall_quad,
  })
  if (error) return rpcError(error)
  return NextResponse.json({ ok: true })
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { rooms?: BulkRoom[] } | null
  if (!Array.isArray(body?.rooms) || body!.rooms.length === 0) {
    return NextResponse.json({ error: 'rooms array required' }, { status: 400 })
  }
  const { client } = userClient(request)
  const { data, error } = await client.rpc('superadmin_bulk_add_stock_rooms', {
    p_rooms: body!.rooms,
  })
  if (error) return rpcError(error)
  return NextResponse.json({ inserted: data })
}

export async function DELETE(request: Request) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { client } = userClient(request)
  const { error } = await client.rpc('superadmin_delete_stock_room', { p_id: id })
  if (error) return rpcError(error)
  return NextResponse.json({ ok: true })
}
