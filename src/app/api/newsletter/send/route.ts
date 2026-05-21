import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { isUuid, requireAuth } from '../../_auth'

type SendBody = {
  contentId?: string
  ownerId?: string
  dryRun?: boolean
}

export async function POST(request: Request) {
  const body: SendBody = await request.json().catch(() => ({} as SendBody))
  const { contentId, ownerId, dryRun } = body

  if (!isUuid(contentId) || !isUuid(ownerId)) {
    return NextResponse.json({ error: 'contentId and ownerId must be UUIDs' }, { status: 400 })
  }

  // Require the caller's JWT to match the ownerId. Without this, any
  // unauthenticated request could spam another gallery's subscriber list or
  // impersonate them in their newsletter.
  const authResult = await requireAuth(request, { requireOwner: ownerId })
  if (authResult instanceof NextResponse) return authResult

  // For real sends we need Resend. Dry run can proceed without it so the
  // operator can still inspect the recipient list before wiring billing.
  const apiKey = process.env.RESEND_API_KEY
  if (!dryRun && !apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Email sending is not configured yet. Set RESEND_API_KEY in Vercel → Environment Variables.',
      },
      { status: 503 },
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )

  // Fetch content item
  const { data: item, error: itemErr } = await supabase
    .from('content_items')
    .select('*')
    .eq('id', contentId)
    .eq('owner_id', ownerId)
    .single()

  if (itemErr || !item) {
    return NextResponse.json({ ok: false, error: 'Content not found' }, { status: 404 })
  }

  if (item.type !== 'newsletter') {
    return NextResponse.json({ ok: false, error: 'Content must be type newsletter' }, { status: 400 })
  }

  // Fetch active subscribers
  const { data: subs } = await supabase
    .from('subscribers')
    .select('email, name')
    .eq('owner_id', ownerId)
    .is('opted_out_at', null)

  if (!subs?.length) {
    return NextResponse.json({ ok: false, error: 'No active subscribers to send to' }, { status: 400 })
  }

  // Dry run — return what *would* be sent without touching Resend or updating status.
  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      wouldSend: subs.length,
      sampleRecipients: subs.slice(0, 5).map(s => s.email),
      subject: item.subject_line || item.title || 'Newsletter',
      previewText: item.preview_text ?? null,
      publishedUrl: item.published_url ?? null,
    })
  }

  const resend = new Resend(apiKey!)
  const subject = item.subject_line || item.title || 'Newsletter'
  const previewText = (item.preview_text ?? '').trim()
  // Build HTML email body.
  const baseHtml = item.body_html || (item.body_md
    ? `<div style="font-family: 'PT Sans', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1E293B; line-height: 1.6;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">${escapeHtml(item.title || 'Newsletter')}</h1>
        ${markdownToParas(item.body_md)}
       </div>`
    : `<p style="font-family: 'PT Sans', sans-serif; max-width: 600px; margin: 0 auto;">${escapeHtml(item.copy || '')}</p>`)

  // Preheader (preview text shown next to subject in most clients).
  const preheader = previewText
    ? `<div style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;">${escapeHtml(previewText)}</div>`
    : ''

  // "Read the full edition" CTA when there's a public URL (the published_url pivot).
  const readMore = item.published_url
    ? `<div style="text-align:center;margin:24px auto;">
        <a href="${item.published_url}" style="display:inline-block;padding:12px 24px;background:#111;color:#fff;text-decoration:none;letter-spacing:0.10em;text-transform:uppercase;font-size:12px;font-weight:700;">Read the full edition →</a>
       </div>`
    : ''

  const html = `${preheader}${baseHtml}${readMore}`

  const from = process.env.NEWSLETTER_FROM_EMAIL || 'newsletter@artpiq.com'

  let sent = 0
  let failed = 0
  const errors: string[] = []

  const BATCH = 10
  for (let i = 0; i < subs.length; i += BATCH) {
    const batch = subs.slice(i, i + BATCH)
    await Promise.all(
      batch.map(async sub => {
        try {
          await resend.emails.send({
            from,
            to: sub.email,
            subject,
            html,
          })
          sent++
        } catch {
          failed++
          errors.push(sub.email)
        }
      }),
    )
  }

  // Update status to published + record sent time
  await supabase
    .from('content_items')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', contentId)

  return NextResponse.json({ ok: true, sent, failed, errors })
}

// Minimal HTML escaping — content_items.body_md / .copy / .title is user-authored.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Lightweight markdown → HTML paragraphs (no inline formatting — keep it safe).
function markdownToParas(md: string): string {
  const escaped = escapeHtml(md)
  const paras = escaped.split(/\n{2,}/)
  return paras.map(p => `<p style="margin: 0 0 14px;">${p.replace(/\n/g, '<br>')}</p>`).join('')
}
