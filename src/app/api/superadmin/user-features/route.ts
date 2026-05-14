import { NextResponse } from 'next/server'
import { assertSuperAdmin, serviceClient } from '../_lib'

export const runtime = 'nodejs'

interface PatchBody {
  ownerId: string
  features?: string[]
  plan?: string
  notes?: string | null
}

const KNOWN_FEATURES = new Set(['visualise', 'crm', 'marketing', 'ar'])

export async function POST(request: Request) {
  try {
    await assertSuperAdmin(request)
  } catch (resp) {
    if (resp instanceof NextResponse) return resp
    throw resp
  }

  const body = (await request.json().catch(() => null)) as PatchBody | null
  if (!body?.ownerId) {
    return NextResponse.json({ error: 'ownerId required' }, { status: 400 })
  }

  // Sanitise the features array against the known allowlist to keep
  // unknown strings out of the column.
  const features = Array.isArray(body.features)
    ? body.features.filter(f => KNOWN_FEATURES.has(f))
    : undefined

  const svc = serviceClient()
  const row: Record<string, unknown> = {
    owner_id: body.ownerId,
    updated_at: new Date().toISOString(),
  }
  if (features !== undefined) row.features = features
  if (body.plan !== undefined) row.plan = body.plan
  if (body.notes !== undefined) row.notes = body.notes

  const { error } = await svc.from('user_features').upsert(row, { onConflict: 'owner_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
