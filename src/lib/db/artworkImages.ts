import { supabase } from './client'

export interface ArtworkImage {
  id: string
  artworkId: string
  url: string
  thumbUrl?: string | null
  position: number
  caption?: string | null
  createdAt?: string
}

function row(r: Record<string, unknown>): ArtworkImage {
  return {
    id: r.id as string,
    artworkId: r.artwork_id as string,
    url: r.url as string,
    thumbUrl: (r.thumb_url as string | null) ?? null,
    position: (r.position as number) ?? 0,
    caption: (r.caption as string | null) ?? null,
    createdAt: r.created_at as string,
  }
}

export async function listArtworkImages(artworkId: string): Promise<ArtworkImage[]> {
  const { data, error } = await supabase()
    .from('artwork_images')
    .select('*')
    .eq('artwork_id', artworkId)
    .order('position', { ascending: true })
  if (error) throw error
  return (data ?? []).map(row)
}

export async function addArtworkImage(
  artworkId: string,
  url: string,
  thumbUrl?: string,
  caption?: string,
): Promise<ArtworkImage> {
  // Get current max position
  const { data: existing } = await supabase()
    .from('artwork_images')
    .select('position')
    .eq('artwork_id', artworkId)
    .order('position', { ascending: false })
    .limit(1)

  const position = existing?.length ? ((existing[0] as { position: number }).position + 1) : 0

  const { data, error } = await supabase()
    .from('artwork_images')
    .insert({
      artwork_id: artworkId,
      url,
      thumb_url: thumbUrl ?? null,
      caption: caption ?? null,
      position,
    })
    .select('*')
    .single()
  if (error) throw error
  return row(data as Record<string, unknown>)
}

export async function deleteArtworkImage(id: string): Promise<void> {
  const { error } = await supabase().from('artwork_images').delete().eq('id', id)
  if (error) throw error
}

export async function reorderArtworkImages(
  artworkId: string,
  orderedIds: string[],
): Promise<void> {
  await Promise.all(
    orderedIds.map((id, i) =>
      supabase().from('artwork_images').update({ position: i }).eq('id', id),
    ),
  )
}

export async function updateImageCaption(id: string, caption: string): Promise<void> {
  const { error } = await supabase().from('artwork_images').update({ caption }).eq('id', id)
  if (error) throw error
}
