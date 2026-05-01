'use client'
import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getCollectionBySlug, listArtworksInLiveCollection } from '@/lib/db/collections'
import { rowToArtwork } from '@/lib/db/artworks'
import NewsletterForm from '@/components/NewsletterForm'
import { Artwork, Collection } from '@/types'

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
      <p className="text-[11px] tracking-[0.18em] uppercase text-ink-muted">Get in touch</p>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Your name"
        className="border border-line px-2 py-1.5 text-[13px]"
      />
      <input
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email"
        className="border border-line px-2 py-1.5 text-[13px]"
      />
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Message (which work, budget, etc.)"
        rows={3}
        className="border border-line px-2 py-1.5 text-[13px]"
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
      <button
        type="submit"
        disabled={busy}
        className="self-start px-3 py-1.5 text-[11px] tracking-[0.16em] uppercase bg-ink text-paper disabled:opacity-40"
      >
        {busy ? 'Sending…' : 'Send'}
      </button>
      {err && <p className="text-[12px] text-red-600">{err}</p>}
    </form>
  )
}

export default function ViewingRoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [collection, setCollection] = useState<Collection | null>(null)
  const [artworks, setArtworks] = useState<Artwork[]>([])
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
            setArtworks(rows.map(r => rowToArtwork(r as Parameters<typeof rowToArtwork>[0])))
          }
        } else {
          setAuthed(true)
          const rows = await listArtworksInLiveCollection(slug)
          setArtworks(rows.map(r => rowToArtwork(r as Parameters<typeof rowToArtwork>[0])))
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
      <div className="min-h-dvh grid place-items-center bg-paper text-ink p-6">
        <form
          onSubmit={async e => {
            e.preventDefault()
            if (pwInput === collection.viewingRoomPassword) {
              sessionStorage.setItem(`vr-pw-${collection.id}`, pwInput)
              setAuthed(true)
              const rows = await listArtworksInLiveCollection(slug)
              setArtworks(rows.map(r => rowToArtwork(r as Parameters<typeof rowToArtwork>[0])))
            } else {
              setErr('wrong-pw')
            }
          }}
          className="max-w-sm w-full space-y-3 text-center"
        >
          <p className="font-display text-[20px]">{collection.name}</p>
          <p className="text-[12px] text-ink-muted">Password required</p>
          <input
            type="password"
            value={pwInput}
            onChange={e => setPwInput(e.target.value)}
            autoFocus
            className="w-full border border-line px-3 py-2 text-[13px]"
          />
          <button
            type="submit"
            className="w-full bg-ink text-paper py-2 text-[12px] tracking-[0.18em] uppercase"
          >
            Enter
          </button>
          {err === 'wrong-pw' && <p className="text-[12px] text-red-600">Wrong password</p>}
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="border-b border-line">
        <div className="max-w-content mx-auto px-6 md:px-12 py-6">
          <p className="text-[11px] tracking-[0.22em] uppercase text-ink-muted">
            Viewing room · artpiq
          </p>
          <h1 className="font-display text-[28px] tracking-tight mt-1">{collection.name}</h1>
          {collection.description && (
            <p className="mt-2 text-[14px] text-ink-muted max-w-[640px]">
              {collection.description}
            </p>
          )}
          <p className="mt-3 text-[11px] tracking-[0.18em] uppercase text-ink-muted">
            {artworks.length} works
            {totalValue > 0 && ` · ${currency} ${totalValue.toLocaleString()} list value`}
          </p>
        </div>
      </header>
      <main className="max-w-content mx-auto px-6 md:px-12 py-8">
        {!artworks.length && (
          <p className="text-[13px] text-ink-muted text-center py-12">
            No artworks in this viewing room.
          </p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {artworks.map(a => (
            <article key={a.id} className="border border-line">
              <div className="aspect-[3/4] bg-line/40 overflow-hidden">
                {a.image && (
                  <img src={a.image} alt={a.title} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="p-3 text-[12px]">
                <p className="font-display truncate">{a.title}</p>
                {a.artist && <p className="text-ink-muted truncate">{a.artist}</p>}
                <p className="text-ink-muted text-[10px] uppercase tracking-[0.14em] mt-1">
                  {a.widthCm} × {a.heightCm} cm
                  {a.price != null && (
                    <>
                      {' · '}
                      {a.currency || ''} {a.price.toLocaleString()}
                    </>
                  )}
                </p>
              </div>
            </article>
          ))}
        </div>
      </main>
      <section className="border-t border-line bg-line/10">
        <div className="max-w-content mx-auto px-6 md:px-12 py-8 grid grid-cols-1 md:grid-cols-2 gap-8">
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
