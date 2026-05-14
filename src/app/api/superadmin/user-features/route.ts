import { NextResponse } from 'next/server'
import { rpcError, userClient } from '../_lib'

export const runtime = 'nodejs'

interface PatchBody {
  ownerId: string
  features?: string[] | null
  plan?: string | null
  notes?: string | null
}

const KNOWN_FEATURES = new Set(['visualise', 'crm', 'marketing', 'ar'])

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as PatchBody | null
  if (!body?.ownerId) {
    return NextResponse.json({ error: 'ownerId required' }, { status: 400 })
  }
  const features = Array.isArray(body.features)
    ? body.features.filter(f => KNOWN_FEATURES.has(f))
    : null

  const { client } = userClient(request)
  const { error } = await client.rpc('superadmin_set_user_features', {
    p_owner: body.ownerId,
    p_features: features,
    p_plan: body.plan ?? null,
    p_notes: body.notes ?? null,
  })
  if (error) return rpcError(error)
  return NextResponse.json({ ok: true })
}
