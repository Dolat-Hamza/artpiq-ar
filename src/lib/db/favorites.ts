import { supabase } from './client'

export async function listFavorites(ownerId: string): Promise<string[]> {
  const { data, error } = await supabase()
    .from('room_favorites')
    .select('room_id')
    .eq('owner_id', ownerId)
  if (error) throw error
  return (data ?? []).map(r => r.room_id)
}

export async function addFavorite(ownerId: string, roomId: string): Promise<void> {
  const { error } = await supabase()
    .from('room_favorites')
    .upsert({ owner_id: ownerId, room_id: roomId }, { onConflict: 'owner_id,room_id' })
  if (error) throw error
}

export async function removeFavorite(ownerId: string, roomId: string): Promise<void> {
  const { error } = await supabase()
    .from('room_favorites')
    .delete()
    .match({ owner_id: ownerId, room_id: roomId })
  if (error) throw error
}
