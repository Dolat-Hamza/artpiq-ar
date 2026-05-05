import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  const body = await request.json().catch(() => ({}))
  const { contentId, ownerId } = body

  if (!contentId || !ownerId) {
    return NextResponse.json({ error: 'contentId and ownerId required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )

  // Fetch content item
  const { data: item } = await supabase
    .from('content_items')
    .select('*')
    .eq('id', contentId)
    .eq('owner_id', ownerId)
    .single()

  if (!item) {
    return NextResponse.json({ error: 'Content not found' }, { status: 404 })
  }

  if (item.type !== 'newsletter') {
    return NextResponse.json({ error: 'Content must be type newsletter' }, { status: 400 })
  }

  // Fetch active subscribers
  const { data: subs } = await supabase
    .from('subscribers')
    .select('email, name')
    .eq('owner_id', ownerId)
    .is('opted_out_at', null)

  if (!subs?.length) {
    return NextResponse.json({ error: 'No active subscribers to send to' }, { status: 400 })
  }

  const resend = new Resend(apiKey)

  // Build HTML
  const html = item.body_html || (item.body_md
    ? `<div style="font-family: 'PT Sans', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1E293B; line-height: 1.6;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">${item.title || 'Newsletter'}</h1>
        ${item.body_md.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>').replace(/^/, '<p>').replace(/$/, '</p>')}
       </div>`
    : `<p>${item.copy || ''}</p>`)

  const from = process.env.NEWSLETTER_FROM_EMAIL || 'newsletter@artpiq.com'

  let sent = 0
  let failed = 0
  const errors: string[] = []

  // Send in batches of 10
  const BATCH = 10
  for (let i = 0; i < subs.length; i += BATCH) {
    const batch = subs.slice(i, i + BATCH)
    await Promise.all(
      batch.map(async sub => {
        try {
          await resend.emails.send({
            from,
            to: sub.email,
            subject: item.title || 'Newsletter',
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

  return NextResponse.json({ sent, failed, errors })
}
