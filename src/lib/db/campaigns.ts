import { supabase } from './client'
import type { Campaign } from '@/types'

function row(r: Record<string, unknown>): Campaign {
  return {
    id: r.id as string,
    ownerId: r.owner_id as string,
    name: r.name as string,
    description: (r.description as string | null) ?? null,
    startDate: (r.start_date as string | null) ?? null,
    endDate: (r.end_date as string | null) ?? null,
    status: (r.status as Campaign['status']) ?? 'active',
    colour: (r.colour as string | null) ?? null,
    createdAt: (r.created_at as string | undefined) ?? undefined,
    updatedAt: (r.updated_at as string | undefined) ?? undefined,
  }
}

export async function listCampaigns(ownerId: string): Promise<Campaign[]> {
  const { data, error } = await supabase()
    .from('campaigns')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(d => row(d as Record<string, unknown>))
}

export async function createCampaign(input: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<Campaign> {
  const ins = {
    owner_id: input.ownerId,
    name: input.name,
    description: input.description ?? null,
    start_date: input.startDate ?? null,
    end_date: input.endDate ?? null,
    status: input.status ?? 'active',
    colour: input.colour ?? null,
  }
  const { data, error } = await supabase().from('campaigns').insert(ins).select('*').single()
  if (error) throw error
  return row(data as Record<string, unknown>)
}

export async function updateCampaign(id: string, patch: Partial<Campaign>): Promise<void> {
  const upd: {
    updated_at?: string
    name?: string
    description?: string | null
    start_date?: string | null
    end_date?: string | null
    status?: string
    colour?: string | null
  } = { updated_at: new Date().toISOString() }
  if (patch.name !== undefined) upd.name = patch.name
  if (patch.description !== undefined) upd.description = patch.description
  if (patch.startDate !== undefined) upd.start_date = patch.startDate
  if (patch.endDate !== undefined) upd.end_date = patch.endDate
  if (patch.status !== undefined) upd.status = patch.status
  if (patch.colour !== undefined) upd.colour = patch.colour
  const { error } = await supabase().from('campaigns').update(upd).eq('id', id)
  if (error) throw error
}

export async function deleteCampaign(id: string): Promise<void> {
  const { error } = await supabase().from('campaigns').delete().eq('id', id)
  if (error) throw error
}
