import { supabase } from './client'
import type { Database } from './types'
import type { ContentItem, ContentComment, SocialChannel } from '@/types'

type CIIns = Database['public']['Tables']['content_items']['Insert']
type CIUpd = Database['public']['Tables']['content_items']['Update']

const channelRow = (r: Record<string, unknown>): SocialChannel => ({
  id: r.id as string,
  ownerId: r.owner_id as string,
  platform: r.platform as SocialChannel['platform'],
  handle: r.handle as string,
  displayName: (r.display_name as string | null) ?? null,
  avatarUrl: (r.avatar_url as string | null) ?? null,
  active: (r.active as boolean) ?? true,
  createdAt: r.created_at as string,
})

export async function listChannels(ownerId: string): Promise<SocialChannel[]> {
  const { data, error } = await supabase()
    .from('social_channels')
    .select('*')
    .eq('owner_id', ownerId)
    .order('platform')
  if (error) throw error
  return (data ?? []).map(channelRow)
}

export async function createChannel(input: Omit<SocialChannel, 'id' | 'createdAt'>): Promise<SocialChannel> {
  const { data, error } = await supabase()
    .from('social_channels')
    .insert({
      owner_id: input.ownerId,
      platform: input.platform,
      handle: input.handle,
      display_name: input.displayName ?? null,
      avatar_url: input.avatarUrl ?? null,
      active: input.active,
    })
    .select('*')
    .single()
  if (error) throw error
  return channelRow(data as Record<string, unknown>)
}

export async function deleteChannel(id: string): Promise<void> {
  const { error } = await supabase().from('social_channels').delete().eq('id', id)
  if (error) throw error
}

// ----- Content items -----
const contentRow = (r: Record<string, unknown>): ContentItem => ({
  pillar: (r.pillar as string | null) ?? null,
  funnelStage: (r.funnel_stage as string | null) ?? null,
  audienceSegment: (r.audience_segment as string | null) ?? null,
  format: (r.format as string | null) ?? null,
  kpi: (r.kpi as string | null) ?? null,
  platform: (r.platform as string | null) ?? null,
  monthKey: (r.month_key as string | null) ?? null,
  campaignId: (r.campaign_id as string | null) ?? null,
  subjectLine: (r.subject_line as string | null) ?? null,
  previewText: (r.preview_text as string | null) ?? null,
  videoUrl: (r.video_url as string | null) ?? null,
  tags: (r.tags as string[] | null) ?? null,
  slug: (r.slug as string | null) ?? null,
  publishedUrl: (r.published_url as string | null) ?? null,
  id: r.id as string,
  ownerId: r.owner_id as string,
  type: r.type as ContentItem['type'],
  status: r.status as ContentItem['status'],
  title: (r.title as string | null) ?? null,
  copy: (r.copy as string | null) ?? null,
  hashtags: (r.hashtags as string[] | null) ?? null,
  purpose: (r.purpose as string | null) ?? null,
  postType: (r.post_type as string | null) ?? null,
  targetAudience: (r.target_audience as string | null) ?? null,
  hook: (r.hook as string | null) ?? null,
  cta: (r.cta as string | null) ?? null,
  ctaUrl: (r.cta_url as string | null) ?? null,
  scheduledAt: (r.scheduled_at as string | null) ?? null,
  publishedAt: (r.published_at as string | null) ?? null,
  channels: (r.channels as string[] | null) ?? null,
  mediaUrls: (r.media_urls as string[] | null) ?? null,
  coverUrl: (r.cover_url as string | null) ?? null,
  artworkIds: (r.artwork_ids as string[] | null) ?? null,
  eventDate: (r.event_date as string | null) ?? null,
  eventLocation: (r.event_location as string | null) ?? null,
  assigneeId: (r.assignee_id as string | null) ?? null,
  reviewerId: (r.reviewer_id as string | null) ?? null,
  approvedAt: (r.approved_at as string | null) ?? null,
  approvedBy: (r.approved_by as string | null) ?? null,
  bodyMd: (r.body_md as string | null) ?? null,
  bodyHtml: (r.body_html as string | null) ?? null,
  createdAt: r.created_at as string,
  updatedAt: r.updated_at as string,
})

// Hard cap so we never hand the UI an unbounded list. Anyone scaling past
// this should switch the caller to `.range()` pagination — Supabase's REST
// default cap is 1000 anyway, but being explicit keeps payloads predictable.
const LIST_CONTENT_DEFAULT_LIMIT = 500

export async function listContent(
  ownerId: string,
  opts?: { type?: ContentItem['type']; status?: ContentItem['status']; limit?: number },
): Promise<ContentItem[]> {
  let q = supabase().from('content_items').select('*').eq('owner_id', ownerId)
  if (opts?.type) q = q.eq('type', opts.type)
  if (opts?.status) q = q.eq('status', opts.status)
  const { data, error } = await q
    .order('scheduled_at', { ascending: false, nullsFirst: false })
    .limit(opts?.limit ?? LIST_CONTENT_DEFAULT_LIMIT)
  if (error) throw error
  return (data ?? []).map(contentRow)
}

export async function getContent(id: string): Promise<ContentItem | null> {
  const { data, error } = await supabase().from('content_items').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? contentRow(data as Record<string, unknown>) : null
}

export async function createContent(input: Partial<ContentItem> & { ownerId: string; type: ContentItem['type'] }): Promise<ContentItem> {
  const row: CIIns = {
    owner_id: input.ownerId,
    type: input.type,
    status: input.status ?? 'draft',
  }
  if (input.title !== undefined) row.title = input.title
  if (input.copy !== undefined) row.copy = input.copy
  if (input.hashtags !== undefined) row.hashtags = input.hashtags
  if (input.purpose !== undefined) row.purpose = input.purpose
  if (input.postType !== undefined) row.post_type = input.postType
  if (input.targetAudience !== undefined) row.target_audience = input.targetAudience
  if (input.hook !== undefined) row.hook = input.hook
  if (input.cta !== undefined) row.cta = input.cta
  if (input.ctaUrl !== undefined) row.cta_url = input.ctaUrl
  if (input.scheduledAt !== undefined) row.scheduled_at = input.scheduledAt
  if (input.channels !== undefined) row.channels = input.channels
  if (input.mediaUrls !== undefined) row.media_urls = input.mediaUrls
  if (input.coverUrl !== undefined) row.cover_url = input.coverUrl
  if (input.artworkIds !== undefined) row.artwork_ids = input.artworkIds
  if (input.eventDate !== undefined) row.event_date = input.eventDate
  if (input.eventLocation !== undefined) row.event_location = input.eventLocation
  if (input.bodyMd !== undefined) row.body_md = input.bodyMd
  if (input.bodyHtml !== undefined) row.body_html = input.bodyHtml
  if (input.pillar !== undefined) row.pillar = input.pillar
  if (input.funnelStage !== undefined) row.funnel_stage = input.funnelStage
  if (input.audienceSegment !== undefined) row.audience_segment = input.audienceSegment
  if (input.format !== undefined) row.format = input.format
  if (input.kpi !== undefined) row.kpi = input.kpi
  if (input.platform !== undefined) row.platform = input.platform
  if (input.monthKey !== undefined) row.month_key = input.monthKey
  if (input.campaignId !== undefined) row.campaign_id = input.campaignId
  if (input.subjectLine !== undefined) (row as Record<string, unknown>).subject_line = input.subjectLine
  if (input.previewText !== undefined) (row as Record<string, unknown>).preview_text = input.previewText
  if (input.videoUrl !== undefined) (row as Record<string, unknown>).video_url = input.videoUrl
  if (input.tags !== undefined) (row as Record<string, unknown>).tags = input.tags
  if (input.slug !== undefined) (row as Record<string, unknown>).slug = input.slug
  if (input.publishedUrl !== undefined) (row as Record<string, unknown>).published_url = input.publishedUrl
  const { data, error } = await supabase().from('content_items').insert(row).select('*').single()
  if (error) throw error
  return contentRow(data as Record<string, unknown>)
}

export async function updateContent(id: string, patch: Partial<ContentItem>): Promise<void> {
  const row: CIUpd = { updated_at: new Date().toISOString() }
  if (patch.type !== undefined) row.type = patch.type
  if (patch.status !== undefined) row.status = patch.status
  if (patch.title !== undefined) row.title = patch.title
  if (patch.copy !== undefined) row.copy = patch.copy
  if (patch.hashtags !== undefined) row.hashtags = patch.hashtags
  if (patch.purpose !== undefined) row.purpose = patch.purpose
  if (patch.postType !== undefined) row.post_type = patch.postType
  if (patch.targetAudience !== undefined) row.target_audience = patch.targetAudience
  if (patch.hook !== undefined) row.hook = patch.hook
  if (patch.cta !== undefined) row.cta = patch.cta
  if (patch.ctaUrl !== undefined) row.cta_url = patch.ctaUrl
  if (patch.scheduledAt !== undefined) row.scheduled_at = patch.scheduledAt
  if (patch.channels !== undefined) row.channels = patch.channels
  if (patch.mediaUrls !== undefined) row.media_urls = patch.mediaUrls
  if (patch.coverUrl !== undefined) row.cover_url = patch.coverUrl
  if (patch.artworkIds !== undefined) row.artwork_ids = patch.artworkIds
  if (patch.eventDate !== undefined) row.event_date = patch.eventDate
  if (patch.eventLocation !== undefined) row.event_location = patch.eventLocation
  if (patch.bodyMd !== undefined) row.body_md = patch.bodyMd
  if (patch.bodyHtml !== undefined) row.body_html = patch.bodyHtml
  if (patch.publishedAt !== undefined) row.published_at = patch.publishedAt
  if (patch.pillar !== undefined) row.pillar = patch.pillar
  if (patch.funnelStage !== undefined) row.funnel_stage = patch.funnelStage
  if (patch.audienceSegment !== undefined) row.audience_segment = patch.audienceSegment
  if (patch.format !== undefined) row.format = patch.format
  if (patch.kpi !== undefined) row.kpi = patch.kpi
  if (patch.platform !== undefined) row.platform = patch.platform
  if (patch.monthKey !== undefined) row.month_key = patch.monthKey
  if (patch.campaignId !== undefined) row.campaign_id = patch.campaignId
  if (patch.subjectLine !== undefined) (row as Record<string, unknown>).subject_line = patch.subjectLine
  if (patch.previewText !== undefined) (row as Record<string, unknown>).preview_text = patch.previewText
  if (patch.videoUrl !== undefined) (row as Record<string, unknown>).video_url = patch.videoUrl
  if (patch.tags !== undefined) (row as Record<string, unknown>).tags = patch.tags
  const { error } = await supabase().from('content_items').update(row).eq('id', id)
  if (error) throw error
}

export async function deleteContent(id: string): Promise<void> {
  const { error } = await supabase().from('content_items').delete().eq('id', id)
  if (error) throw error
}

// ----- Comments -----
const commentRow = (r: Record<string, unknown>): ContentComment => ({
  id: r.id as string,
  ownerId: r.owner_id as string,
  contentId: r.content_id as string,
  authorId: r.author_id as string,
  body: r.body as string,
  resolved: (r.resolved as boolean) ?? false,
  createdAt: r.created_at as string,
})

export async function listComments(contentId: string): Promise<ContentComment[]> {
  const { data, error } = await supabase()
    .from('content_comments')
    .select('*')
    .eq('content_id', contentId)
    .order('created_at')
  if (error) throw error
  return (data ?? []).map(commentRow)
}

export async function resolveComment(id: string, resolved: boolean): Promise<void> {
  const { error } = await supabase().from('content_comments').update({ resolved }).eq('id', id)
  if (error) throw error
}

export async function addComment(input: Omit<ContentComment, 'id' | 'createdAt' | 'resolved'>): Promise<ContentComment> {
  const { data, error } = await supabase()
    .from('content_comments')
    .insert({
      owner_id: input.ownerId,
      content_id: input.contentId,
      author_id: input.authorId,
      body: input.body,
    })
    .select('*')
    .single()
  if (error) throw error
  return commentRow(data as Record<string, unknown>)
}

// getPublishedContentBySlug removed — blog/newsletter now point to
// externally-hosted URLs (publishedUrl). The old in-app render route
// was an XSS sink and is gone.
