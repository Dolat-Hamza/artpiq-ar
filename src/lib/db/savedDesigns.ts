import { SavedDesign } from '@/types'
import { Database } from './types'
import { supabase } from './client'

type Row = Database['public']['Tables']['saved_designs']['Row']

function rowToDesign(r: Row): SavedDesign {
  return {
    id: r.id,
    ownerId: r.owner_id,
    name: r.name,
    roomId: r.room_id,
    myWallBgUrl: r.my_wall_bg_url,
    placed: r.placed,
    lighting: r.lighting,
    wallColor: r.wall_color,
    customize: r.customize,
    thumbUrl: r.thumb_url,
    folderId: r.folder_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export interface CreateDesignInput {
  ownerId: string
  name: string
  roomId?: string | null
  myWallBgUrl?: string | null
  placed: unknown
  lighting: unknown
  wallColor?: string | null
  customize?: unknown
  thumbUrl?: string | null
  folderId?: string | null
}

export async function createDesign(input: CreateDesignInput): Promise<SavedDesign> {
  const row = {
    owner_id: input.ownerId,
    name: input.name,
    room_id: input.roomId ?? null,
    my_wall_bg_url: input.myWallBgUrl ?? null,
    placed: input.placed as never,
    lighting: input.lighting as never,
    wall_color: input.wallColor ?? null,
    customize: (input.customize ?? {}) as never,
    thumb_url: input.thumbUrl ?? null,
    folder_id: input.folderId ?? null,
  }
  const { data, error } = await supabase()
    .from('saved_designs')
    .insert(row)
    .select('*')
    .single()
  if (error) throw error
  return rowToDesign(data)
}

export async function listDesigns(
  ownerId: string,
  folderId?: string | null,
): Promise<SavedDesign[]> {
  let q = supabase()
    .from('saved_designs')
    .select('*')
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false })
  if (folderId !== undefined) {
    q = folderId === null ? q.is('folder_id', null) : q.eq('folder_id', folderId)
  }
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map(rowToDesign)
}

export async function getDesign(id: string): Promise<SavedDesign | null> {
  const { data, error } = await supabase()
    .from('saved_designs')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data ? rowToDesign(data) : null
}

export async function updateDesign(
  id: string,
  patch: Partial<{
    name: string
    folderId: string | null
    placed: unknown
    lighting: unknown
    wallColor: string | null
    customize: unknown
    thumbUrl: string | null
  }>,
): Promise<void> {
  const row: Database['public']['Tables']['saved_designs']['Update'] = {}
  if (patch.name !== undefined) row.name = patch.name
  if (patch.folderId !== undefined) row.folder_id = patch.folderId
  if (patch.placed !== undefined) row.placed = patch.placed as never
  if (patch.lighting !== undefined) row.lighting = patch.lighting as never
  if (patch.wallColor !== undefined) row.wall_color = patch.wallColor
  if (patch.customize !== undefined) row.customize = patch.customize as never
  if (patch.thumbUrl !== undefined) row.thumb_url = patch.thumbUrl
  const { error } = await supabase().from('saved_designs').update(row).eq('id', id)
  if (error) throw error
}

export async function deleteDesign(id: string): Promise<void> {
  const { error } = await supabase().from('saved_designs').delete().eq('id', id)
  if (error) throw error
}

export async function uploadDesignThumb(
  ownerId: string,
  designId: string,
  blob: Blob,
): Promise<string> {
  const path = `${ownerId}/${designId}.jpg`
  const { error } = await supabase()
    .storage
    .from('design-thumbs')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true, cacheControl: '3600' })
  if (error) throw error
  const { data } = supabase().storage.from('design-thumbs').getPublicUrl(path)
  return data.publicUrl
}
