'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/db/auth'
import {
  listContent,
  updateContent,
  listComments,
  addComment,
} from '@/lib/db/social'
import {
  listVersionsForPosts,
  approveVersion,
  setActiveVersion,
} from '@/lib/db/contentVersions'
import type { ContentItem, ContentVersion, ContentComment } from '@/types'

// IG-like single-post reviewer. Front = post preview, back = edit + comments.
// Swipe on photo cycles versions; swipe outside cycles posts. Approve picks
// the active version + auto-advances to the next pending post.

// Status mapping: reviewer queue surfaces posts in these three states.
const QUEUE_STATUSES: ContentItem['status'][] = [
  'submitted_for_review',
  'changes_requested',
  'approved',
]

function statusLabel(s: ContentItem['status']): { label: string; cls: string } {
  if (s === 'approved') return { label: 'Approved', cls: 'bg-emerald-500 text-white' }
  if (s === 'changes_requested') return { label: 'Changes requested', cls: 'bg-amber-500 text-white' }
  return { label: 'Pending', cls: 'bg-black/70 text-white backdrop-blur-md' }
}

function channelChipClass(channel: string | undefined): string {
  const c = (channel ?? '').toLowerCase()
  if (c.includes('twitter') || c.includes('x')) return 'before:bg-sky-500'
  if (c.includes('linkedin')) return 'before:bg-blue-700'
  if (c.includes('tiktok')) return 'before:bg-black'
  return 'before:bg-pink-500'  // default IG
}

interface Props {
  // Optional: scope queue to a single post id (e.g. opened from calendar row).
  // When omitted, shows the full pending queue.
  postId?: string
}

export default function PostReviewer({ postId }: Props) {
  const { user } = useAuth()
  const [posts, setPosts] = useState<ContentItem[]>([])
  const [versionsByPost, setVersionsByPost] = useState<Map<string, ContentVersion[]>>(new Map())
  const [activeByPost, setActiveByPost] = useState<Map<string, number>>(new Map())
  const [commentsByPost, setCommentsByPost] = useState<Map<string, ContentComment[]>>(new Map())
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [draftComment, setDraftComment] = useState('')

  const mediaRef = useRef<HTMLDivElement | null>(null)

  // Initial load — posts + their versions in 2 round-trips.
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user) return
      try {
        const all = await listContent(user.id, { status: QUEUE_STATUSES, limit: 200 })
        const filtered = postId ? all.filter(p => p.id === postId) : all
        // Pending first, then changes, then approved — matches the mock's
        // top-bar metric ordering.
        const order: Record<string, number> = { submitted_for_review: 0, changes_requested: 1, approved: 2 }
        filtered.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9))
        if (cancelled) return
        setPosts(filtered)
        const map = await listVersionsForPosts(filtered.map(p => p.id))
        if (cancelled) return
        setVersionsByPost(map)
        // Seed activeByPost from each post's active_version_id (mapped to idx)
        const active = new Map<string, number>()
        for (const p of filtered) {
          const vs = map.get(p.id) ?? []
          const idx = vs.findIndex(v => v.id === p.activeVersionId)
          active.set(p.id, idx >= 0 ? idx : 0)
        }
        setActiveByPost(active)
      } catch (e) {
        console.error('[PostReviewer] load failed', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user, postId])

  // Lazy-load comments when a post comes into view (and is flipped).
  useEffect(() => {
    const p = posts[i]
    if (!p || !flipped) return
    if (commentsByPost.has(p.id)) return
    listComments(p.id)
      .then(list => setCommentsByPost(prev => new Map(prev).set(p.id, list)))
      .catch(e => console.warn('[PostReviewer] comments load failed', e))
  }, [i, flipped, posts, commentsByPost])

  const post = posts[i]
  const versions = post ? versionsByPost.get(post.id) ?? [] : []
  const activeVerIdx = post ? activeByPost.get(post.id) ?? 0 : 0
  const activeVer: ContentVersion | undefined = versions[activeVerIdx]
  const verLetter = String.fromCharCode(65 + activeVerIdx)
  const status = post ? statusLabel(post.status) : null

  // Counts for top bar
  const counts = useMemo(() => {
    return posts.reduce<Record<string, number>>((acc, p) => {
      acc[p.status] = (acc[p.status] ?? 0) + 1
      return acc
    }, {})
  }, [posts])

  // ---------- nav ----------
  const goPost = useCallback((d: number) => {
    if (posts.length === 0) return
    setFlipped(false)
    setI(prev => (prev + d + posts.length) % posts.length)
  }, [posts.length])

  const cycleVer = useCallback((d: number) => {
    if (!post || versions.length <= 1) return
    setActiveByPost(prev => {
      const cur = prev.get(post.id) ?? 0
      const next = cur + d
      if (next < 0 || next >= versions.length) return prev
      const m = new Map(prev)
      m.set(post.id, next)
      return m
    })
  }, [post, versions.length])

  // Approve current version + jump to next pending post.
  const approveAndNext = useCallback(async () => {
    if (!post || !activeVer || !user) return
    try {
      await approveVersion(post.id, activeVer.id, user.id)
      // Reflect in local state so the UI updates without a refetch.
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: 'approved' } : p))
      setFlipped(false)
      // Find next pending post (or next overall if none left).
      const start = i
      let next = start
      for (let step = 1; step <= posts.length; step++) {
        const cand = (start + step) % posts.length
        if (posts[cand].id !== post.id && posts[cand].status === 'submitted_for_review') {
          next = cand
          break
        }
        if (step === posts.length) next = (start + 1) % posts.length
      }
      setTimeout(() => setI(next), 220)
    } catch (e) {
      console.error('[PostReviewer] approve failed', e)
    }
  }, [post, activeVer, user, i, posts])

  const requestChanges = useCallback(async () => {
    if (!post) return
    try {
      await updateContent(post.id, { status: 'changes_requested' })
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: 'changes_requested' } : p))
      setFlipped(false)
    } catch (e) {
      console.error('[PostReviewer] requestChanges failed', e)
    }
  }, [post])

  const submitComment = useCallback(async () => {
    if (!post || !user || !draftComment.trim()) return
    try {
      const c = await addComment({
        ownerId: user.id,
        contentId: post.id,
        authorId: user.id,
        body: draftComment.trim(),
      })
      setCommentsByPost(prev => {
        const m = new Map(prev)
        const list = m.get(post.id) ?? []
        m.set(post.id, [...list, c])
        return m
      })
      setDraftComment('')
    } catch (e) {
      console.error('[PostReviewer] comment failed', e)
    }
  }, [post, user, draftComment])

  // Pick the active version's image+caption+hashtags, mirror onto the post
  // record so the future read of content_items shows the picked variant.
  const pickVersion = useCallback(async (idx: number) => {
    if (!post) return
    const v = versions[idx]
    if (!v) return
    setActiveByPost(prev => new Map(prev).set(post.id, idx))
    try {
      await setActiveVersion(post.id, v.id)
    } catch (e) {
      console.warn('[PostReviewer] setActive persist failed', e)
    }
  }, [post, versions])

  // ---------- keyboard ----------
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft')  { if (flipped) goPost(-1); else cycleVer(-1) }
      if (e.key === 'ArrowRight') { if (flipped) goPost(1);  else cycleVer(1)  }
      if (e.key === 'ArrowUp')    goPost(-1)
      if (e.key === 'ArrowDown')  goPost(1)
      if (e.key === 'Escape' && flipped) setFlipped(false)
      if (e.key === 'Enter'  && !flipped) setFlipped(true)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [flipped, goPost, cycleVer])

  // ---------- swipe ----------
  // Photo swipe = version. Body swipe (outside photo) = post nav.
  useEffect(() => {
    const el = mediaRef.current
    if (!el) return
    let sx: number | null = null
    let sy: number | null = null
    function ts(e: TouchEvent) { sx = e.touches[0].clientX; sy = e.touches[0].clientY }
    function te(e: TouchEvent) {
      if (sx === null || sy === null) return
      const dx = e.changedTouches[0].clientX - sx
      const dy = e.changedTouches[0].clientY - sy
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) cycleVer(dx > 0 ? -1 : 1)
      sx = null; sy = null
    }
    el.addEventListener('touchstart', ts, { passive: true })
    el.addEventListener('touchend', te, { passive: true })
    return () => {
      el.removeEventListener('touchstart', ts)
      el.removeEventListener('touchend', te)
    }
  }, [cycleVer])

  useEffect(() => {
    let sx: number | null = null
    let inMedia = false
    function ts(e: TouchEvent) {
      sx = e.touches[0].clientX
      const t = e.target as HTMLElement | null
      inMedia = !!t?.closest('[data-media-zone="1"], [data-no-post-swipe="1"]')
    }
    function te(e: TouchEvent) {
      if (sx === null || inMedia) { sx = null; return }
      const dx = e.changedTouches[0].clientX - sx
      if (Math.abs(dx) > 60) goPost(dx > 0 ? -1 : 1)
      sx = null
    }
    document.addEventListener('touchstart', ts, { passive: true })
    document.addEventListener('touchend', te, { passive: true })
    return () => {
      document.removeEventListener('touchstart', ts)
      document.removeEventListener('touchend', te)
    }
  }, [goPost])

  // ---------- render ----------

  if (loading) {
    return <div className="p-8 text-center text-sm text-ink-muted">Loading review queue…</div>
  }
  if (posts.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-ink-muted">
        Nothing to review. Posts marked <em>Submitted for review</em> will show up here.
        <div className="mt-4">
          <Link href="/admin/social" className="underline">Back to Social calendar</Link>
        </div>
      </div>
    )
  }
  if (!post) return null

  return (
    <div className="min-h-dvh bg-paper">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-paper border-b border-line flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/social" className="text-sm text-ink-muted hover:text-ink">← Social</Link>
          <h1 className="text-sm font-semibold">Approval queue</h1>
        </div>
        <div className="text-xs text-ink-muted">
          <b className="text-ink">{counts.submitted_for_review ?? 0}</b> pending ·{' '}
          {counts.approved ?? 0} approved · {counts.changes_requested ?? 0} changes
        </div>
      </div>

      {/* Stage */}
      <div className="mx-auto max-w-[520px] px-3 pt-6 pb-28" style={{ perspective: 1600 }}>
        <div
          className="relative w-full transition-transform duration-500"
          style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0)' }}
        >
          {/* ─── FRONT ─── */}
          <div
            className={`relative w-full bg-paper border border-line rounded-xl overflow-hidden shadow-sm transition-opacity duration-200 ${flipped ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            {/* Status pill */}
            <div
              className={`absolute top-3 left-3 z-10 inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full text-[11px] font-semibold tracking-wide uppercase ${status?.cls ?? ''}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              {post.status === 'approved' ? `${status?.label} · ver ${verLetter}` : status?.label}
            </div>

            {/* Edit FAB */}
            <button
              className="absolute top-3 right-3 z-10 bg-black/65 hover:bg-black/80 text-white text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur"
              onClick={() => setFlipped(true)}
            >
              View more &amp; edit
            </button>

            {/* IG header */}
            <div className="flex items-center gap-2.5 px-3.5 py-2.5">
              <div className="w-8 h-8 rounded-full p-0.5" style={{ background: 'linear-gradient(135deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5)' }}>
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[13px] font-bold">
                  {(post.title?.[0] ?? 'A').toUpperCase()}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{post.title ?? '(Untitled post)'}</div>
                <div className="text-[11px] text-ink-muted truncate">
                  <span className={`inline-flex items-center gap-1.5 bg-line/40 px-2 py-0.5 rounded-full text-[10px] font-semibold ${channelChipClass(post.channels?.[0] ?? post.platform ?? '')} before:content-[""] before:w-1.5 before:h-1.5 before:rounded-full`}>
                    {post.channels?.[0] ?? post.platform ?? 'Instagram'}
                  </span>{' '}
                  · {post.scheduledAt ? new Date(post.scheduledAt).toLocaleString() : 'Unscheduled'}
                </div>
              </div>
            </div>

            {/* Media carousel */}
            <div
              ref={mediaRef}
              data-media-zone="1"
              className="relative w-full aspect-square bg-black overflow-hidden select-none"
              style={{ touchAction: 'pan-y' }}
            >
              {/* Version counter */}
              {versions.length > 1 && (
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-30 bg-black/60 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm">
                  Version {verLetter} · {activeVerIdx + 1} / {versions.length}
                </div>
              )}
              {post.type === 'reel' && (
                <div className="absolute top-2.5 right-3 z-30 bg-black/55 text-white text-[11px] px-2 py-1 rounded backdrop-blur">▶ Reel</div>
              )}

              {/* Side arrows (desktop) */}
              {versions.length > 1 && (
                <>
                  <button
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-lg flex items-center justify-center disabled:opacity-30 disabled:cursor-default"
                    onClick={() => cycleVer(-1)}
                    disabled={activeVerIdx === 0}
                    aria-label="Previous version"
                  >‹</button>
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-lg flex items-center justify-center disabled:opacity-30 disabled:cursor-default"
                    onClick={() => cycleVer(1)}
                    disabled={activeVerIdx === versions.length - 1}
                    aria-label="Next version"
                  >›</button>
                </>
              )}

              {/* Track */}
              <div
                className="flex w-full h-full transition-transform duration-300"
                style={{ transform: `translateX(-${activeVerIdx * 100}%)`, willChange: 'transform' }}
              >
                {versions.map(v => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={v.id}
                    src={v.imageUrl ?? post.coverUrl ?? '/sample-rooms/v3-plain-cream-plaster-parquet.jpg'}
                    alt={`Version ${v.idx + 1}`}
                    className="flex-shrink-0 w-full h-full object-cover"
                  />
                ))}
              </div>
            </div>

            {/* Dots */}
            {versions.length > 1 && (
              <div className="flex gap-1.5 justify-center items-center py-2">
                {versions.map((_, idx) => (
                  <span
                    key={idx}
                    className={`rounded-full transition-all ${idx === activeVerIdx ? 'w-1.5 h-1.5 bg-pink-500' : 'w-1 h-1 bg-line'}`}
                  />
                ))}
              </div>
            )}

            {/* IG actions */}
            <div className="flex items-center gap-3.5 px-3.5 pt-2.5 pb-1 text-[22px]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              <div className="flex-1" />
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
            </div>

            {/* Caption */}
            <div className="px-3.5 pt-1.5 pb-1 text-sm leading-snug">
              <b className="font-semibold mr-1.5">{post.title ?? 'gallery'}</b>
              <span>{activeVer?.caption ?? post.copy ?? ''} </span>
              <span className="text-blue-700">
                {(activeVer?.hashtags ?? post.hashtags ?? []).map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}
              </span>
            </div>
            <div className="px-3.5 pt-1 pb-3 text-[10px] uppercase tracking-wider text-ink-muted">
              {post.scheduledAt ? new Date(post.scheduledAt).toLocaleString() : 'Unscheduled'}
            </div>
          </div>

          {/* ─── BACK ─── */}
          <div
            className="absolute inset-0 w-full bg-paper border border-line rounded-xl overflow-hidden shadow-sm flex flex-col"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            data-no-post-swipe="1"
          >
            <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-line">
              <h3 className="text-sm font-semibold flex-1">
                Edit · <span>{post.channels?.[0] ?? post.platform ?? 'Instagram'}</span>
              </h3>
              <button className="text-sm text-ink-muted px-2 py-1" onClick={() => setFlipped(false)}>✕ close</button>
            </div>

            <div className="flex-1 overflow-auto px-4 py-3.5">
              {/* Versions strip */}
              <label className="block text-[11px] uppercase tracking-wider text-ink-muted font-semibold mb-1.5">
                Versions (look &amp; feel)
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1 mb-3.5">
                {versions.map((v, idx) => (
                  <button
                    key={v.id}
                    onClick={() => pickVersion(idx)}
                    className={`relative shrink-0 w-16 h-16 rounded overflow-hidden border-2 ${idx === activeVerIdx ? 'border-ink' : 'border-transparent'}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.imageUrl ?? '/sample-rooms/v3-plain-cream-plaster-parquet.jpg'} alt="" className="w-full h-full object-cover" />
                    <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[9px] px-1 rounded">
                      {String.fromCharCode(65 + idx)}
                    </span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2.5 mb-3.5">
                <Field label="Scheduled for">
                  <input
                    type="datetime-local"
                    className="field-input"
                    value={post.scheduledAt ? post.scheduledAt.slice(0, 16) : ''}
                    onChange={e => updateContent(post.id, { scheduledAt: e.target.value || null })
                      .then(() => setPosts(prev => prev.map(p => p.id === post.id ? { ...p, scheduledAt: e.target.value || null } : p)))
                      .catch(err => console.warn('schedule update', err))}
                  />
                </Field>
                <Field label="Channel">
                  <input className="field-input" value={post.channels?.[0] ?? post.platform ?? ''} readOnly />
                </Field>
              </div>

              <Field label="Caption">
                <textarea
                  className="field-input min-h-[60px]"
                  defaultValue={activeVer?.caption ?? post.copy ?? ''}
                  onBlur={e => {
                    if (!activeVer) return
                    if (e.target.value === (activeVer.caption ?? '')) return
                    // Update the active version row in place
                    import('@/lib/db/contentVersions').then(m => m.updateVersion(activeVer.id, { caption: e.target.value }))
                      .then(() => setVersionsByPost(prev => {
                        const m = new Map(prev)
                        const arr = (m.get(post.id) ?? []).map(v => v.id === activeVer.id ? { ...v, caption: e.target.value } : v)
                        m.set(post.id, arr)
                        return m
                      }))
                  }}
                />
              </Field>

              <Field label="Hashtags">
                <input
                  className="field-input"
                  defaultValue={(activeVer?.hashtags ?? post.hashtags ?? []).map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}
                  onBlur={e => {
                    if (!activeVer) return
                    const tags = e.target.value.split(/\s+/).filter(Boolean).map(s => s.replace(/^#/, ''))
                    import('@/lib/db/contentVersions').then(m => m.updateVersion(activeVer.id, { hashtags: tags }))
                      .then(() => setVersionsByPost(prev => {
                        const m = new Map(prev)
                        const arr = (m.get(post.id) ?? []).map(v => v.id === activeVer.id ? { ...v, hashtags: tags } : v)
                        m.set(post.id, arr)
                        return m
                      }))
                  }}
                />
              </Field>

              {/* Comments */}
              <div className="border-t border-line pt-3 mt-3">
                <h4 className="text-[11px] uppercase tracking-wider text-ink-muted font-semibold mb-2">
                  Comments &amp; change requests
                </h4>
                {(commentsByPost.get(post.id) ?? []).map(c => (
                  <div key={c.id} className="text-sm mb-2">
                    <span className="font-semibold mr-1">{c.authorId === user?.id ? 'You' : c.authorId.slice(0, 6)}:</span>
                    {c.body}
                    <div className="text-[10px] text-ink-muted mt-0.5">{c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}</div>
                  </div>
                ))}
                <textarea
                  className="field-input min-h-[50px] mt-2"
                  placeholder="Add a comment or change request…"
                  value={draftComment}
                  onChange={e => setDraftComment(e.target.value)}
                />
                <button
                  className="mt-1 text-xs underline text-ink-muted"
                  onClick={submitComment}
                  disabled={!draftComment.trim()}
                >Post comment</button>
              </div>
            </div>

            <div className="sticky bottom-0 bg-paper px-4 py-2.5 border-t border-line flex gap-2">
              <button className="btn-ghost" onClick={requestChanges}>Request changes</button>
              <div className="flex-1" />
              <button className="btn-line" onClick={() => setFlipped(false)}>Cancel</button>
              <button className="btn-pri" onClick={approveAndNext}>Approve</button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-paper border border-line rounded-full px-2 py-1 shadow-lg">
        <button
          className="w-9 h-9 rounded-full hover:bg-line/40 flex items-center justify-center text-lg"
          onClick={() => goPost(-1)}
          aria-label="Previous post"
        >‹</button>
        <div className="px-2.5 text-sm font-semibold">
          {i + 1}<span className="text-ink-muted font-normal"> / {posts.length}</span>
        </div>
        <button
          className="w-9 h-9 rounded-full hover:bg-line/40 flex items-center justify-center text-lg"
          onClick={() => goPost(1)}
          aria-label="Next post"
        >›</button>
      </div>

      {/* Local styles for shared inputs (avoid global CSS bloat). */}
      <style jsx>{`
        :global(.field-input) {
          display: block;
          width: 100%;
          padding: 8px 10px;
          border: 1px solid var(--line, #e6e6e6);
          border-radius: 6px;
          font-size: 13px;
          font-family: inherit;
          background: #fafafa;
        }
        :global(.field-input:focus) {
          outline: none;
          border-color: #111;
          background: #fff;
        }
        :global(.btn-pri) {
          padding: 9px 14px;
          border-radius: 6px;
          background: #111;
          color: #fff;
          font-size: 13px;
          font-weight: 500;
          border: 1px solid #111;
        }
        :global(.btn-line) {
          padding: 9px 14px;
          border-radius: 6px;
          background: #fff;
          color: #111;
          font-size: 13px;
          font-weight: 500;
          border: 1px solid var(--line, #e6e6e6);
        }
        :global(.btn-ghost) {
          padding: 9px 14px;
          border-radius: 6px;
          background: transparent;
          color: #111;
          font-size: 13px;
          font-weight: 500;
          border: 1px solid var(--line, #e6e6e6);
        }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3.5">
      <label className="block text-[11px] uppercase tracking-wider text-ink-muted font-semibold mb-1.5">{label}</label>
      {children}
    </div>
  )
}
