import { ARTWORKS } from '@/lib/artworks'
import type { Artwork } from '@/types'
import { rowToArtwork } from './artworks'
import { publicServerClient } from './serverClient'

export type PublicArtworkReader = (id: string) => Promise<Artwork | null>

// Demo pieces resolve locally; the reader is injectable so the lookup is testable offline.
export async function resolvePublicArtwork(
  id: string,
  readPublicArtwork: PublicArtworkReader,
): Promise<Artwork | null> {
  const demo = ARTWORKS.find(artwork => artwork.id === id)
  if (demo) return demo
  return readPublicArtwork(id)
}

export async function loadPublicArtwork(id: string): Promise<Artwork | null> {
  return resolvePublicArtwork(id, async artworkId => {
    const client = publicServerClient()
    if (!client) return null

    try {
      const { data, error } = await client
        .from('artworks')
        .select('*')
        .eq('id', artworkId)
        .eq('privacy', 'public')
        .maybeSingle()

      if (error || !data) return null
      return rowToArtwork(data)
    } catch (error) {
      console.error('[ar] public artwork lookup failed', error)
      return null
    }
  })
}
