import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const maxDuration = 60

interface Body {
  type: 'post' | 'reel' | 'story' | 'blog' | 'newsletter' | 'event_promo'
  brief: {
    title?: string
    purpose?: string
    postType?: string
    targetAudience?: string
    hook?: string
    cta?: string
    ctaUrl?: string
    eventDate?: string
    eventLocation?: string
  }
  context?: {
    artistName?: string
    galleryName?: string
    artworkTitles?: string[]
  }
}

const SYSTEM = `You are a senior content writer for an art gallery / artist platform.
You write tight, idea-led copy that respects the work and the audience — never hypey.
Match the voice: confident, clear, slightly literary. No clichés ("dive into", "elevate your space", "transform your home").
Use British English. Avoid emoji unless brief calls for IG/TikTok.
Always include a clear CTA but never repeat it twice.`

function buildPrompt(body: Body): string {
  const { type, brief, context } = body
  const parts: string[] = []

  parts.push(`Generate a ${type} for ${context?.galleryName ?? 'an art gallery'}.`)
  if (brief.title) parts.push(`Internal working title: "${brief.title}".`)
  if (brief.purpose) parts.push(`Purpose: ${brief.purpose}.`)
  if (brief.postType) parts.push(`Format: ${brief.postType}.`)
  if (brief.targetAudience) parts.push(`Audience: ${brief.targetAudience}.`)
  if (brief.hook) parts.push(`Hook starting point: ${brief.hook}.`)
  if (brief.cta) parts.push(`CTA: ${brief.cta}.`)
  if (brief.ctaUrl) parts.push(`Link to point to: ${brief.ctaUrl}.`)
  if (brief.eventDate) parts.push(`Event date: ${brief.eventDate}.`)
  if (brief.eventLocation) parts.push(`Event location: ${brief.eventLocation}.`)
  if (context?.artistName) parts.push(`Artist: ${context.artistName}.`)
  if (context?.artworkTitles?.length) {
    parts.push(`Featured artworks: ${context.artworkTitles.slice(0, 5).join(', ')}.`)
  }

  // Length + format guidance per type
  if (type === 'post' || type === 'reel') {
    parts.push(`\nReturn a single Instagram caption: 80-150 words. Open with the hook. End with the CTA. Include 5-8 relevant hashtags on a new line at the end.`)
  } else if (type === 'story') {
    parts.push(`\nReturn 3 short stacked story slides, separated by '---'. Each slide ≤ 12 words.`)
  } else if (type === 'blog') {
    parts.push(`\nReturn a blog post in markdown: H1 title, 3-5 H2 sections, 600-900 words total. Open with a hook paragraph. End with the CTA.`)
  } else if (type === 'newsletter') {
    parts.push(`\nReturn a newsletter email in markdown: H1 subject-line equivalent, 300-500 words, scannable with H2 sections + short paragraphs. End with the CTA as a clear next step.`)
  } else if (type === 'event_promo') {
    parts.push(`\nReturn an event promo: 1) Instagram caption (100-150 words), 2) Newsletter body (300-400 words) — separated by '---NEWSLETTER---'. Include date, location, and RSVP CTA in both.`)
  }

  parts.push(`\nReturn raw content only — no preamble, no "Here is your post:", no explanation.`)

  return parts.join(' ')
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  let body: Body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (!body.type) {
    return NextResponse.json({ error: 'type required' }, { status: 400 })
  }

  const prompt = buildPrompt(body)
  const anthropic = new Anthropic({ apiKey })

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-7',
      max_tokens: body.type === 'blog' || body.type === 'newsletter' ? 1500 : 600,
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : ''

    return NextResponse.json({ content: text })
  } catch (e) {
    console.error('[ai] generate error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
