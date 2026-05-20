import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { marked } from 'marked'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

async function fetchIssue(slug: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data } = await supabase.rpc('get_published_content_by_slug', {
    p_slug: slug,
    p_type: 'newsletter',
  })
  const row = Array.isArray(data) ? data[0] : null
  return row as null | {
    id: string
    title: string | null
    cover_url: string | null
    body_md: string | null
    body_html: string | null
    subject_line: string | null
    preview_text: string | null
    published_at: string | null
    slug: string
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const issue = await fetchIssue(slug)
  const robots = { index: false, follow: false } as const
  if (!issue) return { title: 'Not found', robots }
  return {
    title: issue.subject_line ?? issue.title ?? 'Newsletter',
    description: issue.preview_text ?? undefined,
    robots,
  }
}

export default async function PublicNewsletterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const issue = await fetchIssue(slug)
  if (!issue) notFound()

  const html = issue.body_html?.trim() || marked.parse(issue.body_md ?? '', { gfm: true, breaks: true })

  const published = issue.published_at
    ? new Date(issue.published_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  return (
    <article className="min-h-dvh bg-bg text-ink py-12">
      <div className="mx-auto max-w-[640px] px-6">
        <div className="bg-paper border border-line rounded-md p-8 md:p-10">
          <header className="mb-6">
            {published && (
              <p className="text-meta uppercase tracking-[0.14em] text-ink-muted mb-2">
                Issue · {published}
              </p>
            )}
            <h1 className="font-display text-h3 leading-tight">{issue.subject_line || issue.title || 'Newsletter'}</h1>
            {issue.preview_text && (
              <p className="text-body text-ink-muted mt-2">{issue.preview_text}</p>
            )}
          </header>
          {issue.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={issue.cover_url}
              alt=""
              className="w-full aspect-[16/9] object-cover rounded-md mb-6 bg-bg"
            />
          )}
          <div
            className="prose prose-sm max-w-none text-body leading-relaxed [&_h2]:font-display [&_h2]:text-h3 [&_h2]:mt-6 [&_h2]:mb-2 [&_p]:my-3 [&_a]:text-accent [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6"
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <footer className="mt-10 pt-6 border-t border-line text-meta text-ink-muted">
            Sent via artpiq.
          </footer>
        </div>
      </div>
    </article>
  )
}
