// Per-post version look-and-feel: image + caption + hashtags. A content_item
// owns N versions, plus an active_version_id that the reviewer flips when
// the user approves a version. RLS scopes everything to the owning user.

import { supabase } from './client'
import type { ContentVersion } from '@/types'

type Row = {
  id: string
  content_id: string
  idx: number
  image_url: string | null
  caption: string | null
  hashtags: string[] | null
  approved: boolean
  created_at: string
}

function rowToVersion(r: Row): ContentVersion {
  return {
    id: r.id,
    contentId: r.content_id,
    idx: r.idx,
    imageUrl: r.image_url,
    caption: r.caption,
    hashtags: r.hashtags,
    approved: r.approved,
    createdAt: r.created_at,
  }
}

export async function listVersions(contentId: string): Promise<ContentVersion[]> {
  const { data, error } = await supabase()
    .from('content_versions' as never)
    .select('*')
    .eq('content_id' as never, contentId)
    .order('idx', { ascending: true })
  if (error) throw error
  return ((data ?? []) as Row[]).map(rowToVersion)
}

// Fetch all versions for many posts in one round-trip. Avoids N+1 in the
// reviewer queue.
export async function listVersionsForPosts(contentIds: string[]): Promise<Map<string, ContentVersion[]>> {
  if (contentIds.length === 0) return new Map()
  const { data, error } = await supabase()
    .from('content_versions' as never)
    .select('*')
    .in('content_id' as never, contentIds)
    .order('idx', { ascending: true })
  if (error) throw error
  const grouped = new Map<string, ContentVersion[]>()
  for (const r of ((data ?? []) as Row[])) {
    const v = rowToVersion(r)
    const list = grouped.get(v.contentId) ?? []
    list.push(v)
    grouped.set(v.contentId, list)
  }
  return grouped
}

export async function createVersion(input: {
  contentId: string
  idx: number
  imageUrl?: string | null
  caption?: string | null
  hashtags?: string[] | null
}): Promise<ContentVersion> {
  const { data, error } = await supabase()
    .from('content_versions' as never)
    .insert({
      content_id: input.contentId,
      idx: input.idx,
      image_url: input.imageUrl ?? null,
      caption: input.caption ?? null,
      hashtags: input.hashtags ?? null,
    } as never)
    .select('*')
    .single()
  if (error) throw error
  return rowToVersion(data as Row)
}

export async function updateVersion(id: string, patch: {
  imageUrl?: string | null
  caption?: string | null
  hashtags?: string[] | null
}): Promise<void> {
  const row: Record<string, unknown> = {}
  if (patch.imageUrl !== undefined) row.image_url = patch.imageUrl
  if (patch.caption !== undefined) row.caption = patch.caption
  if (patch.hashtags !== undefined) row.hashtags = patch.hashtags
  if (Object.keys(row).length === 0) return
  const { error } = await supabase()
    .from('content_versions' as never)
    .update(row as never)
    .eq('id' as never, id)
  if (error) throw error
}

export async function deleteVersion(id: string): Promise<void> {
  const { error } = await supabase()
    .from('content_versions' as never)
    .delete()
    .eq('id' as never, id)
  if (error) throw error
}

// Mark a version as the active one on its parent post, AND copy its
// caption / hashtags / image into the content_item fields so downstream
// consumers (feed render, embeds, scheduled-publish workers) keep working
// without needing to read content_versions themselves.
export async function setActiveVersion(contentId: string, versionId: string): Promise<void> {
  // First, pull the version content so we can mirror it back to content_items
  const { data: ver, error: verErr } = await supabase()
    .from('content_versions' as never)
    .select('image_url, caption, hashtags')
    .eq('id' as never, versionId)
    .single()
  if (verErr) throw verErr
  const v = ver as { image_url: string | null; caption: string | null; hashtags: string[] | null }
  const { error } = await supabase()
    .from('content_items')
    .update({
      active_version_id: versionId,
      cover_url: v.image_url,
      copy: v.caption,
      hashtags: v.hashtags,
    } as never)
    .eq('id', contentId)
  if (error) throw error
}

// Approve a version + mark its parent post as approved. Auto-advance to the
// next pending post is handled in the UI, not here.
export async function approveVersion(contentId: string, versionId: string, approverId: string): Promise<void> {
  await setActiveVersion(contentId, versionId)
  const { error: ciErr } = await supabase()
    .from('content_items')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: approverId,
    } as never)
    .eq('id', contentId)
  if (ciErr) throw ciErr
  const { error: cvErr } = await supabase()
    .from('content_versions' as never)
    .update({ approved: true } as never)
    .eq('id' as never, versionId)
  if (cvErr) throw cvErr
}
