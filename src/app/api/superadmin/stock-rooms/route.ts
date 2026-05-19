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
