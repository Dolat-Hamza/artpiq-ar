import { DiscoverProfile } from '@/types'
import { Database } from './types'
import { supabase } from './client'

type Row = Database['public']['Tables']['discover_profiles']['Row']

function rowToProfile(r: Row): DiscoverProfile {
  return {
    ownerId: r.owner_id,
    slug: r.slug,
    displayName: r.display_name,
    bio: r.bio,
    heroImageUrl: r.hero_image_url,
    contactEmail: r.contact_email,
    social: (r.social as Record<string, string>) ?? {},
    theme: (r.theme as { accent?: string; bg?: string }) ?? {},
    published: r.published,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function getMyDiscoverProfile(ownerId: string): Promise<DiscoverProfile | null> {
  const { data, error } = await supabase()
    .from('discover_profiles')
    .select('*')
    .eq('owner_id', ownerId)
    .maybeSingle()
  if (error) throw error
  return data ? rowToProfile(data) : null
}

export async function getDiscoverProfileBySlug(slug: string): Promise<DiscoverProfile | null> {
  const { data, error } = await supabase()
    .from('discover_profiles')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle()
  if (error) return null
  return data ? rowToProfile(data) : null
}

export async function upsertDiscoverProfile(p: DiscoverProfile): Promise<void> {
  const row = {
    owner_id: p.ownerId,
    slug: p.slug,
    display_name: p.displayName,
    bio: p.bio ?? null,
    hero_image_url: p.heroImageUrl ?? null,
    contact_email: p.contactEmail ?? null,
    social: (p.social ?? {}) as never,
    theme: (p.theme ?? {}) as never,
    published: p.published,
  }
  const { error } = await supabase()
    .from('discover_profiles')
    .upsert(row, { onConflict: 'owner_id' })
  if (error) throw error
}

export async function uploadHero(ownerId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${ownerId}/hero_${Date.now()}.${ext}`
  const { error } = await supabase()
    .storage
    .from('discover-heroes')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error
  const { data } = supabase().storage.from('discover-heroes').getPublicUrl(path)
  return data.publicUrl
}

export async function listPublicArtworksByOwner(ownerId: string) {
  const { data, error } = await supabase()
    .from('artworks')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return []
  return data ?? []
}
