import { Contact } from '@/types'
import { Database } from './types'
import { supabase } from './client'

type Row = Database['public']['Tables']['contacts']['Row']

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
  const row: Database['public']['Tables']['contacts']['Insert'] = {
    owner_id: c.ownerId,
    name: c.name ?? null,
    email: c.email ?? null,
    phone: c.phone ?? null,
    country: c.country ?? null,
    category: c.category ?? 'Prospect',
    tags: c.tags ?? null,
    source: c.source ?? 'Manual',
    notes: c.notes ?? null,
  }
  const { data, error } = await supabase().from('contacts').insert(row).select('*').single()
  if (error) throw error
  return rowToContact(data)
}

export async function updateContactRow(
  id: string,
  patch: Partial<Omit<Contact, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>>,
): Promise<void> {
  const row: Database['public']['Tables']['contacts']['Update'] = {}
  if (patch.name !== undefined) row.name = patch.name
  if (patch.email !== undefined) row.email = patch.email
  if (patch.phone !== undefined) row.phone = patch.phone
  if (patch.country !== undefined) row.country = patch.country
  if (patch.category !== undefined) row.category = patch.category
  if (patch.tags !== undefined) row.tags = patch.tags
  if (patch.source !== undefined) row.source = patch.source
  if (patch.notes !== undefined) row.notes = patch.notes
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
  const head = ['Name', 'Email', 'Phone', 'Country', 'Category', 'Source', 'Tags', 'Notes', 'Created']
  const esc = (v: unknown): string => {
    if (v == null) return ''
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const rows = list.map(c =>
    [c.name, c.email, c.phone, c.country, c.category, c.source, (c.tags ?? []).join('|'), c.notes, c.createdAt].map(esc).join(','),
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
