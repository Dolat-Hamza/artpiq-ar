import { VirtualExhibition, VirtualExhibitionWallArtwork } from '@/types'
import { Database } from './types'
import { supabase } from './client'

type Row = Database['public']['Tables']['virtual_exhibitions']['Row']

function rowToVe(r: Row): VirtualExhibition {
  return {
    id: r.id,
    ownerId: r.owner_id,
    name: r.name,
    slug: r.slug,
    roomTemplate: r.room_template,
    wallArtworks: (r.wall_artworks as unknown as VirtualExhibitionWallArtwork[]) ?? [],
    wallColor: r.wall_color ?? '#f4f4f4',
    lighting: (r.lighting as { intensity?: number }) ?? {},
    published: r.published,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function listExhibitions(ownerId: string): Promise<VirtualExhibition[]> {
  const { data, error } = await supabase()
    .from('virtual_exhibitions')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(rowToVe)
}

export async function getExhibition(id: string): Promise<VirtualExhibition | null> {
  const { data, error } = await supabase()
    .from('virtual_exhibitions')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data ? rowToVe(data) : null
}

export async function getExhibitionBySlug(slug: string): Promise<VirtualExhibition | null> {
  const { data, error } = await supabase()
    .from('virtual_exhibitions')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle()
  if (error) return null
  return data ? rowToVe(data) : null
}

export async function createExhibition(ownerId: string, name: string): Promise<VirtualExhibition> {
  const { data, error } = await supabase()
    .from('virtual_exhibitions')
    .insert({ owner_id: ownerId, name })
    .select('*')
    .single()
  if (error) throw error
  return rowToVe(data)
}

export async function updateExhibition(
  id: string,
  patch: Partial<Pick<VirtualExhibition, 'name' | 'slug' | 'roomTemplate' | 'wallArtworks' | 'wallColor' | 'lighting' | 'published'>>,
): Promise<void> {
  const row: Database['public']['Tables']['virtual_exhibitions']['Update'] = {}
  if (patch.name !== undefined) row.name = patch.name
  if (patch.slug !== undefined) row.slug = patch.slug
  if (patch.roomTemplate !== undefined) row.room_template = patch.roomTemplate
  if (patch.wallArtworks !== undefined) row.wall_artworks = patch.wallArtworks as never
  if (patch.wallColor !== undefined) row.wall_color = patch.wallColor
  if (patch.lighting !== undefined) row.lighting = patch.lighting as never
  if (patch.published !== undefined) row.published = patch.published
  const { error } = await supabase().from('virtual_exhibitions').update(row).eq('id', id)
  if (error) throw error
}

export async function deleteExhibition(id: string): Promise<void> {
  const { error } = await supabase().from('virtual_exhibitions').delete().eq('id', id)
  if (error) throw error
}
