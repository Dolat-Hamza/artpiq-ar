'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Save, Trash2 } from 'lucide-react'
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
    <div className="min-h-dvh bg-paper text-ink">
      <header className="border-b border-line">
        <div className="max-w-content mx-auto px-6 md:px-12 py-5 flex items-center gap-3 flex-wrap">
          <Link href="/admin/exhibitions" className="text-[11px] tracking-[0.16em] uppercase text-ink-muted hover:text-ink">
            ← All exhibitions
          </Link>
          <input
            value={ve.name}
            onChange={e => persist({ name: e.target.value })}
            className="font-display text-[22px] tracking-tight bg-transparent border-b border-transparent hover:border-line focus:border-ink outline-none"
          />
          <div className="flex-1" />
          <input
            value={ve.slug || ''}
            onChange={e => persist({ slug: slugify(e.target.value) || null })}
            placeholder="slug"
            className="text-[12px] border border-line px-2 py-1"
          />
          <label className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.16em] uppercase">
            <input type="checkbox" checked={ve.published} onChange={e => persist({ published: e.target.checked })} />
            Published
          </label>
          {ve.published && url && (
            <Link href={`/exhibition/${ve.slug}`} target="_blank" className="px-3 py-2 text-[11px] tracking-[0.18em] uppercase border border-line">
              Open public
            </Link>
          )}
          <button onClick={() => setMsg('Auto-saved')} className="px-3 py-2 text-[11px] tracking-[0.18em] uppercase bg-ink text-paper inline-flex items-center gap-2">
            <Save size={13} /> Saved
          </button>
        </div>
        {msg && <p className="max-w-content mx-auto px-6 md:px-12 pb-2 text-[11px] text-emerald-700">{msg}</p>}
      </header>

      <main className="max-w-content mx-auto px-6 md:px-12 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <section>
          <p className="text-[11px] tracking-[0.18em] uppercase text-ink-muted mb-2">Walls</p>
          <div className="flex gap-2 mb-4">
            {WALL_NAMES.map((name, i) => (
              <button
                key={i}
                onClick={() => setActiveWall(i as 0 | 1 | 2 | 3)}
                className={`px-3 h-8 text-[11px] tracking-[0.16em] uppercase border ${
                  activeWall === i ? 'bg-ink text-paper border-ink' : 'border-line'
                }`}
              >
                {name} ({ve.wallArtworks.filter(a => a.wall === i).length})
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-2">
            {!onWall.length && (
              <p className="text-[12px] text-ink-muted py-6 text-center">
                Empty wall. Click an artwork below to place it on this wall.
              </p>
            )}
            {onWall.map(wa => {
              const aw = artworks.find(a => a.id === wa.artworkId)
              return (
                <div key={wa.idx} className="border border-line p-3 flex items-center gap-3">
                  {aw?.thumb && <img src={aw.thumb} alt="" className="w-12 h-12 object-cover" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] truncate">{aw?.title || '(missing)'}</p>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                      {aw?.artist}
                    </p>
                  </div>
                  <label className="text-[10px] tracking-[0.14em] uppercase">Pos
                    <input type="range" min={0.1} max={0.9} step={0.05} value={wa.position} onChange={e => updateAt(wa.idx, { position: Number(e.target.value) })} className="w-20 ml-1" />
                  </label>
                  <label className="text-[10px] tracking-[0.14em] uppercase">Y
                    <input type="range" min={0.2} max={0.8} step={0.05} value={wa.height} onChange={e => updateAt(wa.idx, { height: Number(e.target.value) })} className="w-20 ml-1" />
                  </label>
                  <label className="text-[10px] tracking-[0.14em] uppercase">Scale
                    <input type="range" min={0.5} max={2} step={0.1} value={wa.scale} onChange={e => updateAt(wa.idx, { scale: Number(e.target.value) })} className="w-20 ml-1" />
                  </label>
                  <button onClick={() => removeAt(wa.idx)} className="text-red-600">
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            })}
          </div>
          <div className="mt-6">
            <p className="text-[11px] tracking-[0.18em] uppercase text-ink-muted mb-2">Wall color</p>
            <input
              type="color"
              value={ve.wallColor || '#f4f4f4'}
              onChange={e => persist({ wallColor: e.target.value })}
              className="w-12 h-9 border border-line"
            />
          </div>
        </section>
        <aside>
          <p className="text-[11px] tracking-[0.18em] uppercase text-ink-muted mb-2">
            Click to add to {WALL_NAMES[activeWall]} wall
          </p>
          <div className="grid grid-cols-3 gap-2">
            {artworks.slice(0, 60).map(a => (
              <button
                key={a.id}
                onClick={() => placeArtwork(a.id)}
                title={`${a.title}${a.artist ? ' — ' + a.artist : ''}`}
                className="border border-line hover:border-ink overflow-hidden"
              >
                {a.thumb || a.image ? (
                  <img src={a.thumb || a.image || ''} alt="" className="w-full aspect-square object-cover" />
                ) : (
                  <span className="text-[10px] text-ink-muted">{a.title}</span>
                )}
              </button>
            ))}
          </div>
        </aside>
      </main>
    </div>
  )
}
