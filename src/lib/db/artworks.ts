import { Artwork, ArtworkType, Orientation, Privacy } from '@/types'
import { Database } from './types'
import { supabase } from './client'

type Row = Database['public']['Tables']['artworks']['Row']
type Insert = Database['public']['Tables']['artworks']['Insert']

export function rowToArtwork(r: Row): Artwork {
  return {
    id: r.id,
    type: (r.type as ArtworkType) ?? 'painting',
    title: r.title,
    artist: r.artist ?? '',
    year: r.year ?? '',
    medium: r.medium ?? '',
    widthCm: Number(r.width_cm),
    heightCm: Number(r.height_cm),
    depthCm: r.depth_cm == null ? undefined : Number(r.depth_cm),
    description: r.description ?? undefined,
    image: r.image_url,
    thumb: r.thumb_url,
    wikiTitle: r.wiki_title ?? undefined,
    material: r.material ?? undefined,
    price: r.price == null ? undefined : Number(r.price),
    currency: r.currency ?? undefined,
    purchaseUrl: r.purchase_url ?? undefined,
    viewMoreUrl: r.view_more_url ?? undefined,
    nftUrl: r.nft_url ?? undefined,
    collection: r.collection ?? undefined,
    orientation: (r.orientation as Orientation | null) ?? undefined,
    privacy: (r.privacy as Privacy) ?? 'public',
    colors: r.colors ?? undefined,
    sold: r.sold,
    transparent: r.transparent,
  }
}

export function artworkToRow(a: Artwork, ownerId: string | null): Insert {
  return {
    id: a.id,
    owner_id: ownerId,
    type: a.type,
    title: a.title,
    artist: a.artist || null,
    year: a.year || null,
    medium: a.medium || null,
    material: a.material ?? null,
    width_cm: a.widthCm,
    height_cm: a.heightCm,
    depth_cm: a.depthCm ?? null,
    description: a.description ?? null,
    image_url: a.image,
    thumb_url: a.thumb,
    price: a.price ?? null,
    currency: a.currency ?? null,
    purchase_url: a.purchaseUrl ?? null,
    view_more_url: a.viewMoreUrl ?? null,
    nft_url: a.nftUrl ?? null,
    collection: a.collection ?? null,
    orientation: a.orientation ?? null,
    privacy: a.privacy ?? 'public',
    colors: a.colors ?? null,
    sold: a.sold ?? false,
    transparent: a.transparent ?? false,
    wiki_title: a.wikiTitle ?? null,
  }
}

export async function listArtworks(): Promise<Artwork[]> {
  const { data, error } = await supabase()
    .from('artworks')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(rowToArtwork)
}

export async function listMyArtworks(ownerId: string): Promise<Artwork[]> {
  const { data, error } = await supabase()
    .from('artworks')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(rowToArtwork)
}

export async function upsertArtwork(a: Artwork, ownerId: string): Promise<Artwork> {
  const row = artworkToRow(a, ownerId)
  const { data, error } = await supabase()
    .from('artworks')
    .upsert(row, { onConflict: 'id' })
    .select('*')
    .single()
  if (error) throw error
  return rowToArtwork(data)
}

export async function deleteArtwork(id: string): Promise<void> {
  const { error } = await supabase().from('artworks').delete().eq('id', id)
  if (error) throw error
}

export async function bulkUpsert(list: Artwork[], ownerId: string): Promise<number> {
  if (!list.length) return 0
  const rows = list.map(a => artworkToRow(a, ownerId))
  const { error, count } = await supabase()
    .from('artworks')
    .upsert(rows, { onConflict: 'id', count: 'exact' })
  if (error) throw error
  return count ?? list.length
}

export async function uploadImage(file: File, ownerId: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${ownerId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase().storage.from('artworks').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })
  if (error) throw error
  const { data } = supabase().storage.from('artworks').getPublicUrl(path)
  return data.publicUrl
}
