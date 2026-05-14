import { NextResponse } from 'next/server'
import { assertSuperAdmin, serviceClient } from '../_lib'

export const runtime = 'nodejs'

// Aggregate per-user app footprint so the super-admin sees activity at a glance.
export async function GET(request: Request) {
  try {
    await assertSuperAdmin(request)
  } catch (resp) {
    if (resp instanceof NextResponse) return resp
    throw resp
  }

  const svc = serviceClient()

  // Pull auth users + per-table counts in parallel.
  const [usersRes, featRes, artworksRes, contactsRes, dealsRes, contentRes, presRes] = await Promise.all([
    svc.auth.admin.listUsers({ perPage: 200, page: 1 }),
    svc.from('user_features').select('*'),
    svc.from('artworks').select('owner_id'),
    svc.from('contacts').select('owner_id'),
    svc.from('deals').select('owner_id'),
    svc.from('content_items').select('owner_id'),
    svc.from('presentations').select('owner_id'),
  ])

  if (usersRes.error) {
    return NextResponse.json({ error: usersRes.error.message }, { status: 500 })
  }

  const count = (rows: Array<{ owner_id?: string | null }> | null | undefined, uid: string) =>
    (rows ?? []).filter(r => r.owner_id === uid).length

  const featMap = new Map<string, { features: string[]; plan: string; notes: string | null; updated_at: string }>()
  for (const row of (featRes.data ?? []) as Array<{ owner_id: string; features: string[]; plan: string; notes: string | null; updated_at: string }>) {
    featMap.set(row.owner_id, row)
  }

  const users = usersRes.data.users.map(u => {
    const f = featMap.get(u.id)
    return {
      id: u.id,
      email: u.email ?? '',
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
      features: f?.features ?? ['visualise', 'crm', 'marketing', 'ar'],
      plan: f?.plan ?? 'full',
      notes: f?.notes ?? null,
      counts: {
        artworks: count(artworksRes.data, u.id),
        contacts: count(contactsRes.data, u.id),
        deals: count(dealsRes.data, u.id),
        content: count(contentRes.data, u.id),
        presentations: count(presRes.data, u.id),
      },
    }
  })
  users.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))

  return NextResponse.json({ users })
}
