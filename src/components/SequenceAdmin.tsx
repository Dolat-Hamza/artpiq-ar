'use client'
import Link from 'next/link'
import { ArrowRight, Camera, Image as ImageIcon, Layers } from 'lucide-react'
import AdminPageHeader from './ui/AdminPageHeader'

export default function SequenceAdmin() {
  return (
    <div className="min-h-dvh bg-bg text-ink">
      <AdminPageHeader
        title="Artwork Sequence for Website"
        subBar={<span>Generate a set of artwork images optimised for product listings &amp; conversions</span>}
      />

      <main className="px-6 md:px-10 py-8 max-w-content mx-auto grid gap-6">
        {/* Why */}
        <section className="bg-paper border border-line rounded-md p-6">
          <p className="text-meta uppercase tracking-[0.14em] text-ink-muted font-bold mb-2">Why this matters</p>
          <p className="text-body text-ink-soft leading-relaxed max-w-3xl">
            Websites that convert the best tend to show <strong>4–5 different images</strong> per artwork —
            isolated shots so buyers see the work clearly, scale references against neutral backgrounds,
            and contextual shots in real room environments. This module helps you build that sequence in one
            workflow so every artwork in your store looks consistent.
          </p>
        </section>

        {/* Recommended sequence */}
        <section className="bg-paper border border-line rounded-md p-6">
          <p className="text-meta uppercase tracking-[0.14em] text-ink-muted font-bold mb-4">
            Recommended sequence
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <RecCard
              num="1"
              icon={<ImageIcon size={16} />}
              title="The artwork alone"
              count="3–4 shots"
              body="Clean studio shots of the artwork itself. Front-on, slight angle, edge detail, signature close-up. Lets the buyer judge the work on its own merits."
            />
            <RecCard
              num="2"
              icon={<Layers size={16} />}
              title="Sense of scale"
              count="1–2 shots"
              body="Place the artwork against a neutral wall (gallery white or warm grey) so the viewer can see its true size relative to standard room elements."
            />
            <RecCard
              num="3"
              icon={<Camera size={16} />}
              title="In a real environment"
              count="2–3 shots"
              body="Show the artwork in different room contexts — living room, bedroom, office. Lets buyers imagine it in their own space and lifts conversion."
            />
          </div>
        </section>

        {/* Naming convention */}
        <section className="bg-paper border border-line rounded-md p-6">
          <p className="text-meta uppercase tracking-[0.14em] text-ink-muted font-bold mb-2">
            Files are saved in order
          </p>
          <p className="text-body text-ink-soft mb-3">
            Generated images are downloaded in sequence with this naming pattern:
          </p>
          <pre className="bg-bg border border-line rounded-sm p-3 text-meta font-mono">
            01-artwork-title-artist-room-name.jpg{'\n'}02-artwork-title-artist-room-name.jpg{'\n'}03-…
          </pre>
          <p className="text-meta text-ink-muted mt-3">
            Upload them directly to Squarespace / Shopify in this order — they keep your storefront tidy.
          </p>
        </section>

        {/* CTA */}
        <section className="bg-ink text-paper rounded-md p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex-1">
            <p className="text-meta uppercase tracking-[0.18em] opacity-60 mb-1">Start the workflow</p>
            <p className="font-display text-[18px]">
              Open Sample Room and click <span className="text-accent">Sequence</span> to choose rooms.
            </p>
            <p className="text-body opacity-70 mt-1">
              Add the same artwork to each room, capture, save. Done.
            </p>
          </div>
          <Link
            href="/sample-room"
            className="inline-flex items-center gap-2 h-10 px-5 bg-paper text-ink rounded-md text-[11px] font-bold uppercase tracking-[0.06em] hover:bg-accent hover:text-paper transition-colors"
          >
            Open Sample Room <ArrowRight size={14} />
          </Link>
        </section>
      </main>
    </div>
  )
}

function RecCard({
  num, icon, title, count, body,
}: {
  num: string
  icon: React.ReactNode
  title: string
  count: string
  body: string
}) {
  return (
    <article className="border border-line rounded-md p-4 bg-bg/50">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-7 h-7 grid place-items-center bg-accent text-paper rounded-full text-meta font-bold">{num}</span>
        <span className="text-ink-muted">{icon}</span>
      </div>
      <p className="font-bold text-body">{title}</p>
      <p className="text-meta tracking-[0.12em] uppercase text-accent mb-2">{count}</p>
      <p className="text-meta text-ink-soft leading-relaxed">{body}</p>
    </article>
  )
}
