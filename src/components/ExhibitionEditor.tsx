'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Save, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/db/auth'
import { getExhibition, updateExhibition } from '@/lib/db/exhibitions'
import { listMyArtworks } from '@/lib/db/artworks'
import { slugify } from '@/lib/db/collections'
import { Artwork, VirtualExhibition, VirtualExhibitionWallArtwork } from '@/types'
import LoginForm from './LoginForm'

const WALL_NAMES = ['North', 'East', 'South', 'West'] as const

export default function ExhibitionEditor({ id }: { id: string }) {
  const { user, loading } = useAuth()
  const [ve, setVe] = useState<VirtualExhibition | null>(null)
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [activeWall, setActiveWall] = useState<0 | 1 | 2 | 3>(0)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    Promise.all([getExhibition(id), listMyArtworks(user.id)]).then(([x, arts]) => {
      if (x) setVe(x)
      setArtworks(arts)
    })
  }, [user, id])

  async function persist(patch: Partial<VirtualExhibition>) {
    if (!ve) return
    setVe({ ...ve, ...patch })
    try {
      await updateExhibition(id, patch)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed')
    }
  }

  function placeArtwork(awId: string) {
    if (!ve) return
    const next: VirtualExhibitionWallArtwork = {
      artworkId: awId,
      wall: activeWall,
      position: 0.5,
      height: 0.5,
      scale: 1,
    }
    persist({ wallArtworks: [...ve.wallArtworks, next] })
  }

  function updateAt(idx: number, patch: Partial<VirtualExhibitionWallArtwork>) {
    if (!ve) return
    const next = ve.wallArtworks.map((a, i) => (i === idx ? { ...a, ...patch } : a))
    persist({ wallArtworks: next })
  }

  function removeAt(idx: number) {
    if (!ve) return
    persist({ wallArtworks: ve.wallArtworks.filter((_, i) => i !== idx) })
  }

  if (loading) return <div className="p-8 text-[13px] text-ink-muted">Loading…</div>
  if (!user) return <div className="min-h-dvh flex items-center justify-center p-6"><LoginForm /></div>
  if (!ve) return <div className="p-8 text-[13px] text-ink-muted">Loading exhibition…</div>

  const url = ve.slug && typeof window !== 'undefined' ? `${window.location.origin}/exhibition/${ve.slug}` : ''
  const onWall = ve.wallArtworks
    .map((a, i) => ({ ...a, idx: i }))
    .filter(a => a.wall === activeWall)

  return (
    <div className="min-h-dvh bg-bg text-ink">
      {/* ArtPlacer-style editor header */}
      <header className="bg-paper border-b border-line">
        <div className="px-6 md:px-10 h-16 flex items-center gap-3">
          <Link
            href="/admin/exhibitions"
            className="inline-flex items-center gap-1.5 text-meta uppercase tracking-[0.14em] text-ink-muted hover:text-ink"
          >
            <ArrowLeft size={13} /> All
          </Link>
          <input
            value={ve.name}
            onChange={e => persist({ name: e.target.value })}
            className="font-display text-[14px] tracking-[0.04em] bg-transparent border-b border-transparent hover:border-line focus:border-ink outline-none px-1"
          />
          <span
            className={`pill ${ve.published ? 'pill-sale' : 'pill-sold'}`}
          >
            {ve.published ? 'Live' : 'Draft'}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {ve.published && url && (
              <Link href={`/exhibition/${ve.slug}`} target="_blank" className="btn-outline">
                <ExternalLink size={13} /> Open public
              </Link>
            )}
            <button className="btn-primary" onClick={() => setMsg('Saved')}>
              <Save size={14} strokeWidth={2.5} /> Saved
            </button>
          </div>
        </div>
        {/* Sub-bar: slug + publish toggle */}
        <div className="px-6 md:px-10 h-11 border-t border-line bg-bg flex items-center gap-4 text-meta uppercase tracking-[0.12em] text-ink-muted">
          <span>Slug</span>
          <input
            value={ve.slug || ''}
            onChange={e => persist({ slug: slugify(e.target.value) || null })}
            placeholder="exhibition-slug"
            className="text-[11px] bg-paper border border-line px-2 h-7 normal-case tracking-normal"
          />
          <label className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={ve.published}
              onChange={e => persist({ published: e.target.checked })}
            />
            Published
          </label>
          {msg && <span className="ml-auto text-emerald-700 normal-case tracking-normal">{msg}</span>}
        </div>
      </header>

      <main className="px-6 md:px-10 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <section className="bg-paper border border-line rounded-md p-5">
          <p className="text-meta uppercase tracking-[0.14em] text-ink-muted font-bold mb-3">
            Walls
          </p>
          <div className="flex gap-1 mb-4 border-b border-line">
            {WALL_NAMES.map((name, i) => (
              <button
                key={i}
                onClick={() => setActiveWall(i as 0 | 1 | 2 | 3)}
                data-active={activeWall === i}
                className="dock-tab !text-ink-muted data-[active=true]:!text-ink data-[active=true]:after:!bg-ink !h-10"
              >
                {name} · {ve.wallArtworks.filter(a => a.wall === i).length}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-2">
            {!onWall.length && (
              <p className="text-body text-ink-muted py-8 text-center">
                Empty wall. Click an artwork on the right to place it here.
              </p>
            )}
            {onWall.map(wa => {
              const aw = artworks.find(a => a.id === wa.artworkId)
              return (
                <div
                  key={wa.idx}
                  className="border border-line rounded-sm p-3 flex items-center gap-3 bg-bg"
                >
                  {aw?.thumb && (
                    <img src={aw.thumb} alt="" className="w-12 h-12 object-cover rounded-xs" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-bold truncate">{aw?.title || '(missing)'}</p>
                    <p className="text-meta uppercase tracking-[0.12em] text-ink-muted">
                      {aw?.artist}
                    </p>
                  </div>
                  <RangeField
                    label="Pos"
                    min={0.1}
                    max={0.9}
                    step={0.05}
                    value={wa.position}
                    onChange={v => updateAt(wa.idx, { position: v })}
                  />
                  <RangeField
                    label="Y"
                    min={0.2}
                    max={0.8}
                    step={0.05}
                    value={wa.height}
                    onChange={v => updateAt(wa.idx, { height: v })}
                  />
                  <RangeField
                    label="Scale"
                    min={0.5}
                    max={2}
                    step={0.1}
                    value={wa.scale}
                    onChange={v => updateAt(wa.idx, { scale: v })}
                  />
                  <button
                    onClick={() => removeAt(wa.idx)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        <aside className="bg-paper border border-line rounded-md p-4 lg:sticky lg:top-[124px] lg:self-start">
          <p className="text-meta uppercase tracking-[0.14em] text-ink-muted font-bold mb-3">
            Add to {WALL_NAMES[activeWall]} wall
          </p>
          <div className="grid grid-cols-3 gap-2">
            {artworks.slice(0, 60).map(a => (
              <button
                key={a.id}
                onClick={() => placeArtwork(a.id)}
                title={`${a.title}${a.artist ? ' — ' + a.artist : ''}`}
                className="border border-line hover:border-ink overflow-hidden rounded-xs aspect-square bg-bg transition-colors"
              >
                {a.thumb || a.image ? (
                  <img
                    src={a.thumb || a.image || ''}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-meta text-ink-muted truncate inline-block px-1">
                    {a.title}
                  </span>
                )}
              </button>
            ))}
          </div>
        </aside>
      </main>
    </div>
  )
}

function RangeField({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
}) {
  return (
    <label className="text-meta tracking-[0.12em] uppercase text-ink-muted inline-flex items-center gap-1.5">
      {label}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-20"
      />
    </label>
  )
}
