import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const body = await request.json().catch(() => ({}))
  const { contactId, ownerId } = body

  if (!contactId || !ownerId) {
    return NextResponse.json({ error: 'contactId and ownerId required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )

  // Fetch contact + activities + deals
  const [{ data: contact }, { data: activities }, { data: deals }] = await Promise.all([
    supabase.from('contacts').select('*').eq('id', contactId).eq('owner_id', ownerId).single(),
    supabase.from('activities').select('*').eq('contact_id', contactId).eq('owner_id', ownerId).order('occurred_at', { ascending: false }),
    supabase.from('deals').select('*').eq('contact_id', contactId).eq('owner_id', ownerId),
  ])

  if (!contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  }

  const activityLog = (activities ?? [])
    .map((a: { type: string; subject: string | null; body: string | null; occurred_at: string }) =>
      `[${new Date(a.occurred_at).toLocaleDateString()}] ${a.type.toUpperCase()}: ${a.subject || ''} ${a.body || ''}`.trim()
    )
    .join('\n')

  const dealLog = (deals ?? [])
    .map((d: { title: string; stage: string; amount: number | null }) =>
      `${d.title} — ${d.stage}${d.amount ? ` (€${d.amount.toLocaleString()})` : ''}`
    )
    .join('\n')

  const prompt = `You are a CRM assistant for an art gallery. Summarise this contact's relationship in 3-4 concise sentences. Focus on: relationship stage, key interactions, deal status, and next best action. Be specific and actionable.

Contact: ${contact.name || 'Unknown'} (${contact.email || 'no email'})
Category: ${contact.category || 'Unknown'}
Lifecycle: ${contact.lifecycle_stage || 'Unknown'}

Activity log (most recent first):
${activityLog || 'No activity recorded yet.'}

Deals:
${dealLog || 'No deals yet.'}

Write a crisp 3-4 sentence summary for the gallery team.`

  const anthropic = new Anthropic({ apiKey })

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  })

  const summary = response.content[0].type === 'text'
    ? response.content[0].text.trim()
    : 'Could not generate summary.'

  return NextResponse.json({ summary })
}
