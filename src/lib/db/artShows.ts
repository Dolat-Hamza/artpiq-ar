import { ArtShow, ArtShowPlacement, ArtShowWall } from '@/types'
import { Database } from './types'
import { supabase } from './client'

type Row = Database['public']['Tables']['art_shows']['Row']

function rowToShow(r: Row): ArtShow {
  return {
    id: r.id,
    ownerId: r.owner_id,
    name: r.name,
    venueName: r.venue_name,
    floorPlanUrl: r.floor_plan_url,
    wallSegments: (r.wall_segments as unknown as ArtShowWall[]) ?? [],
    placements: (r.placements as unknown as ArtShowPlacement[]) ?? [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function listShows(ownerId: string): Promise<ArtShow[]> {
  const { data, error } = await supabase()
    .from('art_shows')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(rowToShow)
}

export async function getShow(id: string): Promise<ArtShow | null> {
  const { data, error } = await supabase()
    .from('art_shows')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data ? rowToShow(data) : null
}

export async function createShow(ownerId: string, name: string): Promise<ArtShow> {
  const { data, error } = await supabase()
    .from('art_shows')
    .insert({ owner_id: ownerId, name })
    .select('*')
    .single()
  if (error) throw error
  return rowToShow(data)
}

export async function updateShow(
  id: string,
  patch: Partial<Pick<ArtShow, 'name' | 'venueName' | 'floorPlanUrl' | 'wallSegments' | 'placements'>>,
): Promise<void> {
  const row: Database['public']['Tables']['art_shows']['Update'] = {}
  if (patch.name !== undefined) row.name = patch.name
  if (patch.venueName !== undefined) row.venue_name = patch.venueName
  if (patch.floorPlanUrl !== undefined) row.floor_plan_url = patch.floorPlanUrl
  if (patch.wallSegments !== undefined) row.wall_segments = patch.wallSegments as never
  if (patch.placements !== undefined) row.placements = patch.placements as never
  const { error } = await supabase().from('art_shows').update(row).eq('id', id)
  if (error) throw error
}

export async function deleteShow(id: string): Promise<void> {
  const { error } = await supabase().from('art_shows').delete().eq('id', id)
  if (error) throw error
}

export async function uploadFloorPlan(ownerId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${ownerId}/floor_${Date.now()}.${ext}`
  const { error } = await supabase()
    .storage
    .from('floor-plans')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error
  const { data } = supabase().storage.from('floor-plans').getPublicUrl(path)
  return data.publicUrl
}
