import { NextResponse } from 'next/server'
import { rpcError, userClient } from '../_lib'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { client } = userClient(request)
  const { data, error } = await client.rpc('superadmin_list_users')
  if (error) return rpcError(error)
  const rows = (data as Array<{
    id: string
    email: string
    created_at: string
    last_sign_in_at: string | null
    features: string[]
    plan: string
    notes: string | null
    c_artworks: number
    c_contacts: number
    c_deals: number
    c_content: number
    c_pres: number
  }>) ?? []
  return NextResponse.json({
    users: rows.map(r => ({
      id: r.id,
      email: r.email,
      createdAt: r.created_at,
      lastSignInAt: r.last_sign_in_at,
      features: r.features,
      plan: r.plan,
      notes: r.notes,
      counts: {
        artworks: Number(r.c_artworks),
        contacts: Number(r.c_contacts),
        deals: Number(r.c_deals),
        content: Number(r.c_content),
        presentations: Number(r.c_pres),
      },
    })),
  })
}
