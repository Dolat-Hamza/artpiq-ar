import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { marked } from 'marked'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Public-read RPC; no auth needed.
async function fetchPost(slug: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data } = await supabase.rpc('get_published_content_by_slug', {
    p_slug: slug,
    p_type: 'blog',
  })
  const row = Array.isArray(data) ? data[0] : null
  return row as null | {
    id: string
    title: string | null
    cover_url: string | null
    body_md: string | null
    body_html: string | null
    tags: string[] | null
    published_at: string | null
    slug: string
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await fetchPost(slug)
  // noindex so the page is link-only / unlisted
  const robots = { index: false, follow: false } as const
  if (!post) return { title: 'Not found', robots }
  return {
    title: post.title ?? 'Untitled post',
    robots,
  }
}

export default async function PublicBlogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await fetchPost(slug)
  if (!post) notFound()

  // Prefer pre-rendered HTML when present; otherwise render markdown.
  const html = post.body_html?.trim() || marked.parse(post.body_md ?? '', { gfm: true, breaks: true })

  const published = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  return (
    <article className="min-h-dvh bg-paper text-ink py-12 md:py-20">
      <div className="mx-auto max-w-[720px] px-6">
        {post.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover_url}
            alt=""
            className="w-full aspect-[16/9] object-cover rounded-md mb-8 bg-bg"
          />
        )}
        <header className="mb-8">
          {published && (
            <p className="text-meta uppercase tracking-[0.14em] text-ink-muted mb-2">{published}</p>
          )}
          <h1 className="font-display text-h2 leading-tight">{post.title || 'Untitled post'}</h1>
          {post.tags && post.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {post.tags.map(t => (
                <span key={t} className="text-meta uppercase tracking-[0.12em] text-ink-muted border border-line rounded-xs px-1.5 py-0.5">
                  {t}
                </span>
              ))}
            </div>
          )}
        </header>
        <div
          className="prose prose-sm max-w-none text-body leading-relaxed [&_h2]:font-display [&_h2]:text-h3 [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:my-3 [&_a]:text-accent [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_img]:rounded-md [&_img]:my-4"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </article>
  )
}
