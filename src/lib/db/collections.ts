import { Collection } from '@/types'
import { Database } from './types'
import { supabase } from './client'

type Row = Database['public']['Tables']['collections']['Row']

function rowToCollection(r: Row): Collection {
  return {
    id: r.id,
    ownerId: r.owner_id,
    name: r.name,
    description: r.description ?? undefined,
    coverUrl: r.cover_url ?? undefined,
    privacy: (r.privacy as 'public' | 'private') ?? 'private',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function listMyCollections(ownerId: string): Promise<Collection[]> {
  const { data, error } = await supabase()
    .from('collections')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(rowToCollection)
}

export async function createCollection(
  ownerId: string,
  name: string,
  description?: string,
  privacy: 'public' | 'private' = 'private',
): Promise<Collection> {
  const { data, error } = await supabase()
    .from('collections')
    .insert({ owner_id: ownerId, name, description: description ?? null, privacy })
    .select('*')
    .single()
  if (error) throw error
  return rowToCollection(data)
}

export async function updateCollection(
  id: string,
  patch: Partial<Pick<Collection, 'name' | 'description' | 'privacy' | 'coverUrl'>>,
): Promise<void> {
  const row: Database['public']['Tables']['collections']['Update'] = {}
  if (patch.name !== undefined) row.name = patch.name
  if (patch.description !== undefined) row.description = patch.description
  if (patch.privacy !== undefined) row.privacy = patch.privacy
  if (patch.coverUrl !== undefined) row.cover_url = patch.coverUrl
  const { error } = await supabase().from('collections').update(row).eq('id', id)
  if (error) throw error
}

export async function deleteCollection(id: string): Promise<void> {
  const { error } = await supabase().from('collections').delete().eq('id', id)
  if (error) throw error
}

// Artwork ↔ collection joins
export async function artworksInCollection(collectionId: string): Promise<string[]> {
  const { data, error } = await supabase()
    .from('artwork_collections')
    .select('artwork_id, position')
    .eq('collection_id', collectionId)
    .order('position', { ascending: true })
  if (error) throw error
  return (data ?? []).map(r => r.artwork_id)
}

export async function collectionsForArtwork(artworkId: string): Promise<string[]> {
  const { data, error } = await supabase()
    .from('artwork_collections')
    .select('collection_id')
    .eq('artwork_id', artworkId)
  if (error) throw error
  return (data ?? []).map(r => r.collection_id)
}

export async function setArtworkCollections(
  artworkId: string,
  collectionIds: string[],
): Promise<void> {
  const sb = supabase()
  const { error: delErr } = await sb
    .from('artwork_collections')
    .delete()
    .eq('artwork_id', artworkId)
  if (delErr) throw delErr
  if (!collectionIds.length) return
  const rows = collectionIds.map((cid, i) => ({
    artwork_id: artworkId,
    collection_id: cid,
    position: i,
    added_at: new Date().toISOString(),
  }))
  const { error: insErr } = await sb.from('artwork_collections').insert(rows)
  if (insErr) throw insErr
}

export async function addArtworkToCollection(
  artworkId: string,
  collectionId: string,
): Promise<void> {
  const { error } = await supabase()
    .from('artwork_collections')
    .upsert(
      { artwork_id: artworkId, collection_id: collectionId, position: 0, added_at: new Date().toISOString() },
      { onConflict: 'artwork_id,collection_id' },
    )
  if (error) throw error
}

export async function removeArtworkFromCollection(
  artworkId: string,
  collectionId: string,
): Promise<void> {
  const { error } = await supabase()
    .from('artwork_collections')
    .delete()
    .match({ artwork_id: artworkId, collection_id: collectionId })
  if (error) throw error
}
