'use client'
import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getCollectionBySlug, listArtworksInLiveCollection } from '@/lib/db/collections'
import { rowToArtwork } from '@/lib/db/artworks'
import NewsletterForm from '@/components/NewsletterForm'
import { Artwork, Collection } from '@/types'

type PresentationRow = {
  show_price?: boolean
  sale_mode?: 'sale' | 'rent' | 'both' | 'hidden'
  rent_12mo?: number | null
  rent_24mo?: number | null
  rent_36mo?: number | null
}

function splitRows(rows: unknown[]): { artworks: Parameters<typeof rowToArtwork>[0][]; pres: Record<string, PresentationRow> } {
  const out: Record<string, PresentationRow> = {}
  const arts = (rows as Array<{ _presentation?: PresentationRow; id: string }>).map(r => {
    if (r._presentation) out[r.id] = r._presentation
    const { _presentation: _drop, ...rest } = r as { _presentation?: PresentationRow; [k: string]: unknown }
    void _drop
    return rest as Parameters<typeof rowToArtwork>[0]
  })
  return { artworks: arts, pres: out }
}

function LeadForm({ ownerId, collectionName }: { ownerId: string; collectionName: string }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [website, setWebsite] = useState('')
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      const r = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId,
          email,
          name,
          notes: `Viewing room: ${collectionName}\n${notes}`,
          source: 'Viewing-Room',
          website,
        }),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.error || `HTTP ${r.status}`)
      }
      setDone(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }
  if (done) {
    return (
      <p className="text-[13px] text-emerald-700">
        Thanks — the artist has been notified and will reach out shortly.
      </p>
    )
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-2 max-w-md">
      <p className="text-meta tracking-[0.18em] uppercase text-ink-muted font-bold mb-1">
        Get in touch
      </p>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Your name"
        className="input"
      />
      <input
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email"
        className="input"
      />
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Message (which work, budget, etc.)"
        rows={3}
        className="input"
      />
      <input
        tabIndex={-1}
        autoComplete="off"
        type="text"
        value={website}
        onChange={e => setWebsite(e.target.value)}
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
        aria-hidden="true"
      />
      <button type="submit" disabled={busy} className="btn-primary self-start mt-1 disabled:opacity-40">
        {busy ? 'Sending…' : 'Send'}
      </button>
      {err && <p className="text-body text-red-600">{err}</p>}
    </form>
  )
}

export default function ViewingRoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [collection, setCollection] = useState<Collection | null>(null)
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [presentations, setPresentations] = useState<Record<string, PresentationRow>>({})
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const col = await getCollectionBySlug(slug)
        if (cancelled) return
        if (!col) {
          setErr('not-found')
          return
        }
        setCollection(col)
        if (col.viewingRoomPassword && typeof window !== 'undefined') {
          if (sessionStorage.getItem(`vr-pw-${col.id}`) === col.viewingRoomPassword) {
            setAuthed(true)
            const rows = await listArtworksInLiveCollection(slug)
            const { artworks: arts, pres } = splitRows(rows)
            setArtworks(arts.map(r => rowToArtwork(r)))
            setPresentations(pres)
          }
        } else {
          setAuthed(true)
          const rows = await listArtworksInLiveCollection(slug)
          const { artworks: arts, pres } = splitRows(rows)
          setArtworks(arts.map(r => rowToArtwork(r)))
          setPresentations(pres)
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'load failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  const totalValue = useMemo(
    () => artworks.reduce((s, a) => s + (a.price ?? 0), 0),
    [artworks],
  )
  const currency = artworks.find(a => a.currency)?.currency || ''

  if (loading) {
    return (
      <div className="min-h-dvh grid place-items-center bg-paper text-ink">
        <p className="text-[12px] tracking-[0.2em] uppercase text-ink-muted">Loading…</p>
      </div>
    )
  }

  if (err === 'not-found' || !collection) {
    return (
      <div className="min-h-dvh grid place-items-center bg-paper text-ink p-6 text-center">
        <div>
          <p className="font-display text-[24px]">Viewing room not available</p>
          <p className="mt-2 text-[13px] text-ink-muted">
            The owner may have unpublished this viewing room.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block px-3 py-2 text-[11px] tracking-[0.18em] uppercase border border-line"
          >
            Back to artpiq
          </Link>
        </div>
      </div>
    )
  }

  if (collection.viewingRoomPassword && !authed) {
    return (
      <div className="min-h-dvh grid place-items-center bg-bg text-ink p-6">
        <form
          onSubmit={async e => {
            e.preventDefault()
            if (pwInput === collection.viewingRoomPassword) {
              sessionStorage.setItem(`vr-pw-${collection.id}`, pwInput)
              setAuthed(true)
              const rows = await listArtworksInLiveCollection(slug)
              const { artworks: arts, pres } = splitRows(rows)
              setArtworks(arts.map(r => rowToArtwork(r)))
              setPresentations(pres)
            } else {
              setErr('wrong-pw')
            }
          }}
          className="max-w-sm w-full p-8 bg-paper border border-line rounded-md shadow-card text-center"
        >
          <p className="text-meta tracking-[0.22em] uppercase text-ink-muted inline-flex items-center gap-2 mb-3 justify-center">
            <span className="w-2 h-2 bg-accent rounded-[2px] inline-block" />
            Viewing room
          </p>
          <p className="font-display text-h3 mb-4">{collection.name}</p>
          <input
            type="password"
            value={pwInput}
            onChange={e => setPwInput(e.target.value)}
            autoFocus
            placeholder="Password"
            className="input mb-3"
          />
          <button type="submit" className="btn-primary w-full">
            Enter
          </button>
          {err === 'wrong-pw' && (
            <p className="mt-3 text-body text-red-600">Wrong password</p>
          )}
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <header className="bg-paper border-b border-line">
        <div className="px-6 md:px-10 py-8 max-w-content mx-auto">
          <p className="text-meta tracking-[0.22em] uppercase text-ink-muted inline-flex items-center gap-2">
            <span className="w-2 h-2 bg-accent rounded-[2px] inline-block" />
            Viewing room · artpiq
          </p>
          <h1 className="font-display text-h2 mt-2">{collection.name}</h1>
          {collection.description && (
            <p className="mt-3 text-body text-ink-muted max-w-[640px]">
              {collection.description}
            </p>
          )}
          <p className="mt-4 text-meta tracking-[0.16em] uppercase text-ink-muted">
            {artworks.length} works
            {totalValue > 0 && ` · ${currency} ${totalValue.toLocaleString()} list value`}
          </p>
        </div>
      </header>
      <main className="px-6 md:px-10 py-10 max-w-content mx-auto">
        {!artworks.length && (
          <p className="text-body text-ink-muted text-center py-16">
            No artworks in this viewing room.
          </p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
          {artworks.map(a => {
            const p = presentations[a.id]
            const showPrice = p?.show_price !== false
            const mode = p?.sale_mode ?? 'sale'
            return (
              <article key={a.id} className="group">
                <div className="aspect-[4/5] bg-paper border border-line/60 overflow-hidden">
                  {a.image && (
                    <img
                      src={a.image}
                      alt={a.title}
                      className="w-full h-full object-cover transition-transform duration-300 ease-snap group-hover:scale-[1.02]"
                    />
                  )}
                </div>
                <div className="text-center mt-3 text-[13px]">
                  <p className="font-bold truncate">{a.title}</p>
                  {a.artist && <p className="text-ink-muted truncate">{a.artist}</p>}
                  <p className="text-ink-muted text-[12px] italic mt-0.5">
                    Height: {a.heightCm} cm · Width: {a.widthCm} cm
                  </p>
                  {showPrice && (mode === 'sale' || mode === 'both') && a.price != null && (
                    <p className="text-meta tracking-[0.14em] uppercase mt-1">
                      <span className="opacity-60">For sale ·</span>{' '}
                      <span className="font-bold">{a.currency || '€'} {a.price.toLocaleString()}</span>
                    </p>
                  )}
                  {showPrice && (mode === 'rent' || mode === 'both') && (p?.rent_12mo || p?.rent_24mo || p?.rent_36mo) && (
                    <div className="text-meta tracking-[0.14em] uppercase mt-1 grid gap-0.5">
                      <span className="opacity-60">For rent</span>
                      {p?.rent_12mo != null && (
                        <span><span className="opacity-60">12 mo ·</span> <span className="font-bold">{a.currency || '€'} {p.rent_12mo.toLocaleString()}/mo</span></span>
                      )}
                      {p?.rent_24mo != null && (
                        <span><span className="opacity-60">24 mo ·</span> <span className="font-bold">{a.currency || '€'} {p.rent_24mo.toLocaleString()}/mo</span></span>
                      )}
                      {p?.rent_36mo != null && (
                        <span><span className="opacity-60">36 mo ·</span> <span className="font-bold">{a.currency || '€'} {p.rent_36mo.toLocaleString()}/mo</span></span>
                      )}
                    </div>
                  )}
                  {(!showPrice || mode === 'hidden') && (
                    <p className="text-meta tracking-[0.14em] uppercase mt-1 opacity-60">
                      Price on enquiry
                    </p>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </main>
      <section className="border-t border-line bg-paper">
        <div className="max-w-content mx-auto px-6 md:px-10 py-10 grid grid-cols-1 md:grid-cols-2 gap-8">
          <LeadForm ownerId={collection.ownerId} collectionName={collection.name} />
          <NewsletterForm
            ownerId={collection.ownerId}
            source={`Viewing-Room:${collection.slug || collection.id}`}
            label="Subscribe for updates"
          />
        </div>
      </section>
      <footer className="border-t border-line py-6">
        <div className="max-w-content mx-auto px-6 md:px-12 flex justify-between items-center text-[11px] tracking-[0.16em] uppercase text-ink-muted">
          <span>artpiq · viewing room</span>
          <Link href="/" className="hover:text-ink">
            Back to artpiq
          </Link>
        </div>
      </footer>
    </div>
  )
}
