import { supabase } from './client'
import type { Database } from './types'
import type { Activity, Deal, Organization, Task } from '@/types'

type Tables = Database['public']['Tables']
type OrgUpd = Tables['organizations']['Update']
type DealUpd = Tables['deals']['Update']

const orgRow = (r: Record<string, unknown>): Organization => ({
  id: r.id as string,
  ownerId: r.owner_id as string,
  name: r.name as string,
  type: (r.type as Organization['type']) ?? 'gallery',
  website: (r.website as string | null) ?? null,
  country: (r.country as string | null) ?? null,
  notes: (r.notes as string | null) ?? null,
  createdAt: r.created_at as string,
  updatedAt: r.updated_at as string,
})

export async function listOrganizations(ownerId: string): Promise<Organization[]> {
  const { data, error } = await supabase()
    .from('organizations')
    .select('*')
    .eq('owner_id', ownerId)
    .order('name')
  if (error) throw error
  return (data ?? []).map(orgRow)
}

export async function createOrganization(input: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>): Promise<Organization> {
  const { data, error } = await supabase()
    .from('organizations')
    .insert({
      owner_id: input.ownerId,
      name: input.name,
      type: input.type,
      website: input.website ?? null,
      country: input.country ?? null,
      notes: input.notes ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  return orgRow(data as Record<string, unknown>)
}

export async function updateOrganization(id: string, patch: Partial<Organization>): Promise<void> {
  const row: OrgUpd = { updated_at: new Date().toISOString() }
  if (patch.name !== undefined) row.name = patch.name
  if (patch.type !== undefined) row.type = patch.type
  if (patch.website !== undefined) row.website = patch.website
  if (patch.country !== undefined) row.country = patch.country
  if (patch.notes !== undefined) row.notes = patch.notes
  const { error } = await supabase().from('organizations').update(row).eq('id', id)
  if (error) throw error
}

export async function deleteOrganization(id: string): Promise<void> {
  const { error } = await supabase().from('organizations').delete().eq('id', id)
  if (error) throw error
}

// ----- Deals -----
const dealRow = (r: Record<string, unknown>): Deal => ({
  id: r.id as string,
  ownerId: r.owner_id as string,
  contactId: (r.contact_id as string | null) ?? null,
  organizationId: (r.organization_id as string | null) ?? null,
  artworkId: (r.artwork_id as string | null) ?? null,
  title: r.title as string,
  stage: r.stage as Deal['stage'],
  amount: (r.amount as number | null) ?? null,
  currency: (r.currency as string | null) ?? 'EUR',
  expectedCloseDate: (r.expected_close_date as string | null) ?? null,
  probability: (r.probability as number | null) ?? null,
  notes: (r.notes as string | null) ?? null,
  createdAt: r.created_at as string,
  updatedAt: r.updated_at as string,
})

export async function listDeals(ownerId: string): Promise<Deal[]> {
  const { data, error } = await supabase()
    .from('deals')
    .select('*')
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(dealRow)
}

export async function createDeal(input: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Deal> {
  const { data, error } = await supabase()
    .from('deals')
    .insert({
      owner_id: input.ownerId,
      contact_id: input.contactId ?? null,
      organization_id: input.organizationId ?? null,
      artwork_id: input.artworkId ?? null,
      title: input.title,
      stage: input.stage,
      amount: input.amount ?? null,
      currency: input.currency ?? 'EUR',
      expected_close_date: input.expectedCloseDate ?? null,
      probability: input.probability ?? 50,
      notes: input.notes ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  return dealRow(data as Record<string, unknown>)
}

export async function updateDeal(id: string, patch: Partial<Deal>): Promise<void> {
  const row: DealUpd = { updated_at: new Date().toISOString() }
  if (patch.title !== undefined) row.title = patch.title
  if (patch.stage !== undefined) row.stage = patch.stage
  if (patch.amount !== undefined) row.amount = patch.amount
  if (patch.currency !== undefined) row.currency = patch.currency
  if (patch.expectedCloseDate !== undefined) row.expected_close_date = patch.expectedCloseDate
  if (patch.probability !== undefined) row.probability = patch.probability
  if (patch.notes !== undefined) row.notes = patch.notes
  if (patch.contactId !== undefined) row.contact_id = patch.contactId
  if (patch.organizationId !== undefined) row.organization_id = patch.organizationId
  if (patch.artworkId !== undefined) row.artwork_id = patch.artworkId
  if ('artworkIds' in patch && patch.artworkIds !== undefined) (row as Record<string, unknown>).artwork_ids = patch.artworkIds
  const { error } = await supabase().from('deals').update(row).eq('id', id)
  if (error) throw error
}

export async function deleteDeal(id: string): Promise<void> {
  const { error } = await supabase().from('deals').delete().eq('id', id)
  if (error) throw error
}

// ----- Activities -----
const activityRow = (r: Record<string, unknown>): Activity => ({
  id: r.id as string,
  ownerId: r.owner_id as string,
  contactId: (r.contact_id as string | null) ?? null,
  dealId: (r.deal_id as string | null) ?? null,
  type: r.type as Activity['type'],
  subject: (r.subject as string | null) ?? null,
  body: (r.body as string | null) ?? null,
  occurredAt: r.occurred_at as string,
  createdAt: r.created_at as string,
})

export async function listActivities(ownerId: string, opts?: { contactId?: string; dealId?: string }): Promise<Activity[]> {
  let q = supabase().from('activities').select('*').eq('owner_id', ownerId)
  if (opts?.contactId) q = q.eq('contact_id', opts.contactId)
  if (opts?.dealId) q = q.eq('deal_id', opts.dealId)
  const { data, error } = await q.order('occurred_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(activityRow)
}

export async function createActivity(input: Omit<Activity, 'id' | 'createdAt'>): Promise<Activity> {
  const { data, error } = await supabase()
    .from('activities')
    .insert({
      owner_id: input.ownerId,
      contact_id: input.contactId ?? null,
      deal_id: input.dealId ?? null,
      type: input.type,
      subject: input.subject ?? null,
      body: input.body ?? null,
      occurred_at: input.occurredAt,
    })
    .select('*')
    .single()
  if (error) throw error
  return activityRow(data as Record<string, unknown>)
}

// ----- Tasks -----
const taskRow = (r: Record<string, unknown>): Task => ({
  id: r.id as string,
  ownerId: r.owner_id as string,
  contactId: (r.contact_id as string | null) ?? null,
  dealId: (r.deal_id as string | null) ?? null,
  title: r.title as string,
  dueAt: (r.due_at as string | null) ?? null,
  doneAt: (r.done_at as string | null) ?? null,
  priority: (r.priority as Task['priority']) ?? 'medium',
  createdAt: r.created_at as string,
})

export async function listTasks(ownerId: string): Promise<Task[]> {
  const { data, error } = await supabase()
    .from('tasks')
    .select('*')
    .eq('owner_id', ownerId)
    .order('due_at', { ascending: true, nullsFirst: false })
  if (error) throw error
  return (data ?? []).map(taskRow)
}

export async function createTask(input: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
  const { data, error } = await supabase()
    .from('tasks')
    .insert({
      owner_id: input.ownerId,
      contact_id: input.contactId ?? null,
      deal_id: input.dealId ?? null,
      title: input.title,
      due_at: input.dueAt ?? null,
      done_at: input.doneAt ?? null,
      priority: input.priority,
    })
    .select('*')
    .single()
  if (error) throw error
  return taskRow(data as Record<string, unknown>)
}

export async function toggleTaskDone(id: string, done: boolean): Promise<void> {
  const { error } = await supabase()
    .from('tasks')
    .update({ done_at: done ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) throw error
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase().from('tasks').delete().eq('id', id)
  if (error) throw error
}
