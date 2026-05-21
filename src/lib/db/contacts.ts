import { Contact } from '@/types'
import { Database } from './types'
import { supabase } from './client'

type Row = Database['public']['Tables']['contacts']['Row']
type Ins = Database['public']['Tables']['contacts']['Insert']
type Upd = Database['public']['Tables']['contacts']['Update']

function rowToContact(r: Row): Contact {
  return {
    id: r.id,
    ownerId: r.owner_id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    country: r.country,
    category: r.category,
    tags: r.tags,
    source: r.source,
    notes: r.notes,
    lastSeenAt: r.last_seen_at,
    organizationId: r.organization_id,
    role: r.role,
    lifecycleStage: r.lifecycle_stage,
    interestedArtworkIds: r.interested_artwork_ids,
    isArtist: r.is_artist ?? false,
    artistContactIds: r.artist_contact_ids,
    interestsMediums: r.interests_mediums ?? [],
    interestsStyles: r.interests_styles ?? [],
    interestsArtists: r.interests_artists ?? [],
    budgetMinEur: r.budget_min_eur,
    budgetMaxEur: r.budget_max_eur,
    preferredCurrency: r.preferred_currency ?? 'EUR',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function listContacts(ownerId: string): Promise<Contact[]> {
  const { data, error } = await supabase()
    .from('contacts')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(rowToContact)
}

export async function createContact(
  c: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Contact> {
  const row: Ins = {
    owner_id: c.ownerId,
    name: c.name ?? null,
    email: c.email ?? null,
    phone: c.phone ?? null,
    country: c.country ?? null,
    category: c.category ?? 'Prospect',
    tags: c.tags ?? null,
    source: c.source ?? 'Manual',
    notes: c.notes ?? null,
    organization_id: c.organizationId ?? null,
    role: c.role ?? null,
    lifecycle_stage: c.lifecycleStage ?? null,
    interested_artwork_ids: c.interestedArtworkIds ?? null,
    is_artist: c.isArtist ?? false,
    artist_contact_ids: c.artistContactIds ?? null,
    interests_mediums: c.interestsMediums ?? [],
    interests_styles: c.interestsStyles ?? [],
    interests_artists: c.interestsArtists ?? [],
    budget_min_eur: c.budgetMinEur ?? null,
    budget_max_eur: c.budgetMaxEur ?? null,
    preferred_currency: c.preferredCurrency ?? 'EUR',
  }
  const { data, error } = await supabase().from('contacts').insert(row).select('*').single()
  if (error) throw error
  return rowToContact(data)
}

export async function updateContactRow(
  id: string,
  patch: Partial<Omit<Contact, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>>,
): Promise<void> {
  const row: Upd = {}
  if (patch.name !== undefined) row.name = patch.name
  if (patch.email !== undefined) row.email = patch.email
  if (patch.phone !== undefined) row.phone = patch.phone
  if (patch.country !== undefined) row.country = patch.country
  if (patch.category !== undefined) row.category = patch.category
  if (patch.tags !== undefined) row.tags = patch.tags
  if (patch.source !== undefined) row.source = patch.source
  if (patch.notes !== undefined) row.notes = patch.notes
  if (patch.organizationId !== undefined) row.organization_id = patch.organizationId
  if (patch.lifecycleStage !== undefined) row.lifecycle_stage = patch.lifecycleStage
  if (patch.role !== undefined) row.role = patch.role
  if (patch.interestedArtworkIds !== undefined) row.interested_artwork_ids = patch.interestedArtworkIds
  if (patch.isArtist !== undefined) row.is_artist = patch.isArtist
  if (patch.artistContactIds !== undefined) row.artist_contact_ids = patch.artistContactIds
  if (patch.interestsMediums !== undefined) row.interests_mediums = patch.interestsMediums ?? []
  if (patch.interestsStyles !== undefined) row.interests_styles = patch.interestsStyles ?? []
  if (patch.interestsArtists !== undefined) row.interests_artists = patch.interestsArtists ?? []
  if (patch.budgetMinEur !== undefined) row.budget_min_eur = patch.budgetMinEur
  if (patch.budgetMaxEur !== undefined) row.budget_max_eur = patch.budgetMaxEur
  if (patch.preferredCurrency !== undefined) row.preferred_currency = patch.preferredCurrency ?? 'EUR'
  row.updated_at = new Date().toISOString()
  const { error } = await supabase().from('contacts').update(row).eq('id', id)
  if (error) throw error
}

export async function deleteContact(id: string): Promise<void> {
  const { error } = await supabase().from('contacts').delete().eq('id', id)
  if (error) throw error
}

export async function bulkDeleteContacts(ids: string[]): Promise<void> {
  if (!ids.length) return
  const { error } = await supabase().from('contacts').delete().in('id', ids)
  if (error) throw error
}

export function contactsToCsv(list: Contact[]): string {
  const head = [
    'Name', 'Email', 'Phone', 'Country', 'Category', 'Lifecycle', 'Source',
    'Tags', 'Mediums', 'Styles', 'Favourite Artists',
    'Budget Min EUR', 'Budget Max EUR', 'Notes', 'Created',
  ]
  const esc = (v: unknown): string => {
    if (v == null) return ''
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const rows = list.map(c =>
    [
      c.name, c.email, c.phone, c.country, c.category, c.lifecycleStage, c.source,
      (c.tags ?? []).join('|'),
      (c.interestsMediums ?? []).join('|'),
      (c.interestsStyles ?? []).join('|'),
      (c.interestsArtists ?? []).join('|'),
      c.budgetMinEur, c.budgetMaxEur,
      c.notes, c.createdAt,
    ].map(esc).join(','),
  )
  return [head.join(','), ...rows].join('\n')
}

export function downloadContactsCsv(list: Contact[]) {
  const csv = contactsToCsv(list)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// Look up a contact by email within an owner. Used by artwork CSV import to resolve
// `ownerContactEmail` → `owner_contact_id`. Returns null if not found.
export async function findContactIdByEmail(ownerId: string, email: string): Promise<string | null> {
  const trimmed = email.trim().toLowerCase()
  if (!trimmed) return null
  const { data, error } = await supabase()
    .from('contacts')
    .select('id, email')
    .eq('owner_id', ownerId)
    .ilike('email', trimmed)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.id ?? null
}
