import { supabase } from './client'
import type { Json } from './types'

export interface CrmView {
  id: string
  ownerId: string
  name: string
  filters: Record<string, unknown>
  sortBy?: string | null
  sortDir?: string | null
  visibleColumns?: string[] | null
  isDefault: boolean
  createdAt?: string
}

function row(r: Record<string, unknown>): CrmView {
  return {
    id: r.id as string,
    ownerId: r.owner_id as string,
    name: r.name as string,
    filters: (r.filters as Record<string, unknown>) ?? {},
    sortBy: (r.sort_by as string | null) ?? null,
    sortDir: (r.sort_dir as string | null) ?? null,
    visibleColumns: (r.visible_columns as string[] | null) ?? null,
    isDefault: (r.is_default as boolean | null) ?? false,
    createdAt: r.created_at as string,
  }
}

export async function listCrmViews(ownerId: string): Promise<CrmView[]> {
  const { data, error } = await supabase()
    .from('crm_views')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(r => row(r as Record<string, unknown>))
}

export async function createCrmView(input: Omit<CrmView, 'id' | 'createdAt'>): Promise<CrmView> {
  const { data, error } = await supabase()
    .from('crm_views')
    .insert({
      owner_id: input.ownerId,
      name: input.name,
      filters: input.filters as Json,
      sort_by: input.sortBy ?? null,
      sort_dir: input.sortDir ?? null,
      visible_columns: input.visibleColumns ?? null,
      is_default: input.isDefault,
    })
    .select('*')
    .single()
  if (error) throw error
  return row(data as Record<string, unknown>)
}

export async function deleteCrmView(id: string): Promise<void> {
  const { error } = await supabase().from('crm_views').delete().eq('id', id)
  if (error) throw error
}
