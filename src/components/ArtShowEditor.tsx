'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Save, Upload, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/db/auth'
import { getShow, updateShow, uploadFloorPlan } from '@/lib/db/artShows'
import { listMyArtworks } from '@/lib/db/artworks'
import { ArtShow, ArtShowPlacement, ArtShowWall, Artwork } from '@/types'
import LoginForm from './LoginForm'

function uid() { return Math.random().toString(36).slice(2, 10) }

export default function ArtShowEditor({ id }: { id: string }) {
  const { user, loading } = useAuth()
  const [show, setShow] = useState<ArtShow | null>(null)
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [activeWallId, setActiveWallId] = useState<string | null>(null)
  const dragRef = useRef<{ wallId: string; offsetX: number; offsetY: number } | null>(null)

  useEffect(() => {
    if (!user) return
    Promise.all([getShow(id), listMyArtworks(user.id)])
      .then(([s, arts]) => {
        if (s) setShow(s)
        setArtworks(arts)
      })
      .catch(() => {})
  }, [user, id])

  async function persist(patch: Partial<ArtShow>) {
    if (!show) return
    setShow({ ...show, ...patch } as ArtShow)
    try {
      await updateShow(id, patch)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed')
    }
  }

  async function uploadPlan(f?: File) {
    if (!f || !user || !show) return
    setBusy(true)
    try {
      const url = await uploadFloorPlan(user.id, f)
      await persist({ floorPlanUrl: url })
    } finally {
      setBusy(false)
    }
  }

  function addWall() {
    if (!show) return
    const w: ArtShowWall = { id: uid(), x: 0.4, y: 0.4, length: 0.2, rotation: 0 }
    persist({ wallSegments: [...show.wallSegments, w] })
    setActiveWallId(w.id)
  }

  function updateWall(wallId: string, patch: Partial<ArtShowWall>) {
    if (!show) return
    persist({
      wallSegments: show.wallSegments.map(w => (w.id === wallId ? { ...w, ...patch } : w)),
    })
  }

  function removeWall(wallId: string) {
    if (!show) return
    persist({
      wallSegments: show.wallSegments.filter(w => w.id !== wallId),
      placements: show.placements.filter(p => p.wallId !== wallId),
    })
    if (activeWallId === wallId) setActiveWallId(null)
  }

  function placeArtwork(artworkId: string) {
    if (!show || !activeWallId) {
      setMsg('Select a wall first')
      return
    }
    const w = show.wallSegments.find(x => x.id === activeWallId)
    if (!w) return
    const aw = artworks.find(a => a.id === artworkId)
    const placement: ArtShowPlacement = {
      id: uid(),
      artworkId,
      wallId: activeWallId,
      position: 0.5,
      widthCm: aw?.widthCm,
    }
    persist({ placements: [...show.placements, placement] })
  }

  function removePlacement(pid: string) {
    if (!show) return
    persist({ placements: show.placements.filter(p => p.id !== pid) })
  }

  // Wall drag
  function onWallDown(e: React.PointerEvent, wallId: string) {
    if (!stageRef.current || !show) return
    e.stopPropagation()
    setActiveWallId(wallId)
    const rect = stageRef.current.getBoundingClientRect()
    const w = show.wallSegments.find(x => x.id === wallId)
    if (!w) return
    dragRef.current = {
      wallId,
      offsetX: e.clientX - (w.x * rect.width + rect.left),
      offsetY: e.clientY - (w.y * rect.height + rect.top),
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onWallMove(e: React.PointerEvent) {
    if (!dragRef.current || !stageRef.current) return
    const rect = stageRef.current.getBoundingClientRect()
    const x = (e.clientX - dragRef.current.offsetX - rect.left) / rect.width
    const y = (e.clientY - dragRef.current.offsetY - rect.top) / rect.height
    updateWall(dragRef.current.wallId, {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    })
  }

  function onWallUp() {
    dragRef.current = null
  }

  if (loading) return <div className="p-8 text-[13px] text-ink-muted">Loading…</div>
  if (!user) return <div className="min-h-dvh flex items-center justify-center p-6"><LoginForm /></div>
  if (!show) return <div className="p-8 text-[13px] text-ink-muted">Loading show…</div>

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="border-b border-line">
        <div className="max-w-content mx-auto px-6 md:px-12 py-5 flex items-center gap-3 flex-wrap">
          <Link href="/admin/shows" className="text-[11px] tracking-[0.16em] uppercase text-ink-muted hover:text-ink">
            ← All shows
          </Link>
          <input
            value={show.name}
            onChange={e => persist({ name: e.target.value })}
            className="font-display text-[22px] tracking-tight bg-transparent border-b border-transparent hover:border-line focus:border-ink outline-none"
          />
          <input
            value={show.venueName || ''}
            onChange={e => persist({ venueName: e.target.value })}
            placeholder="Venue"
            className="text-[12px] border-b border-transparent hover:border-line focus:border-ink outline-none px-1 py-0.5"
          />
          <div className="flex-1" />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => uploadPlan(e.target.files?.[0])}
          />
          <button onClick={() => fileRef.current?.click()} disabled={busy} className="px-3 py-2 text-[11px] tracking-[0.18em] uppercase border border-line inline-flex items-center gap-2 disabled:opacity-40">
            <Upload size={13} /> {show.floorPlanUrl ? 'Replace plan' : 'Upload plan'}
          </button>
          <button onClick={addWall} className="px-3 py-2 text-[11px] tracking-[0.18em] uppercase border border-line inline-flex items-center gap-2">
            <Plus size={13} /> Wall
          </button>
          <button onClick={() => setMsg('All changes auto-saved')} className="px-3 py-2 text-[11px] tracking-[0.18em] uppercase bg-ink text-paper inline-flex items-center gap-2">
            <Save size={13} /> Saved
          </button>
        </div>
        {msg && <p className="max-w-content mx-auto px-6 md:px-12 pb-2 text-[11px] text-emerald-700">{msg}</p>}
      </header>

      <main className="max-w-content mx-auto px-6 md:px-12 py-6 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        <div
          ref={stageRef}
          className="relative bg-line/30 aspect-[4/3] overflow-hidden border border-line touch-none"
          onPointerMove={onWallMove}
          onPointerUp={onWallUp}
          onPointerCancel={onWallUp}
          onClick={() => setActiveWallId(null)}
        >
          {show.floorPlanUrl ? (
            <img src={show.floorPlanUrl} alt="" className="w-full h-full object-contain" />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-[12px] text-ink-muted">
              Upload a top-down floor plan to start
            </div>
          )}
          {show.wallSegments.map(w => {
            const placements = show.placements.filter(p => p.wallId === w.id)
            const isActive = activeWallId === w.id
            return (
              <div
                key={w.id}
                onPointerDown={e => onWallDown(e, w.id)}
                onClick={e => {
                  e.stopPropagation()
                  setActiveWallId(w.id)
                }}
                className={`absolute h-2 ${isActive ? 'bg-ink ring-2 ring-accent' : 'bg-ink/70'}`}
                style={{
                  left: `${w.x * 100}%`,
                  top: `${w.y * 100}%`,
                  width: `${w.length * 100}%`,
                  transform: `rotate(${w.rotation}deg)`,
                  transformOrigin: 'left center',
                  cursor: 'grab',
                }}
                title="Wall"
              >
                {placements.map((p, i) => {
                  const aw = artworks.find(a => a.id === p.artworkId)
                  return (
                    <div
                      key={p.id}
                      className="absolute -top-6 w-8 h-6 border border-ink bg-paper grid place-items-center text-[10px]"
                      style={{ left: `${p.position * 100}%` }}
                      onClick={e => {
                        e.stopPropagation()
                        if (confirm(`Remove "${aw?.title || 'artwork'}"?`)) removePlacement(p.id)
                      }}
                      title={aw?.title || 'artwork'}
                    >
                      {i + 1}
                    </div>
                  )
                })}
                {isActive && (
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      removeWall(w.id)
                    }}
                    className="absolute -right-3 -top-3 w-5 h-5 bg-paper border border-red-500 rounded-full grid place-items-center text-red-600"
                    title="Remove wall"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <aside className="text-[13px]">
          {activeWallId ? (
            (() => {
              const w = show.wallSegments.find(x => x.id === activeWallId)
              if (!w) return null
              return (
                <div className="space-y-2 mb-4">
                  <p className="text-[11px] tracking-[0.18em] uppercase text-ink-muted">Selected wall</p>
                  <label className="block text-[11px]">Length: {(w.length * 100).toFixed(0)}%
                    <input type="range" min={0.05} max={1} step={0.01} value={w.length} onChange={e => updateWall(w.id, { length: Number(e.target.value) })} className="w-full" />
                  </label>
                  <label className="block text-[11px]">Rotation: {w.rotation.toFixed(0)}°
                    <input type="range" min={0} max={360} step={1} value={w.rotation} onChange={e => updateWall(w.id, { rotation: Number(e.target.value) })} className="w-full" />
                  </label>
                </div>
              )
            })()
          ) : (
            <p className="text-[12px] text-ink-muted mb-4">Click a wall to select. Tap an artwork below to place it on the selected wall.</p>
          )}
          <p className="text-[11px] tracking-[0.18em] uppercase text-ink-muted mb-2">Artworks ({artworks.length})</p>
          <div className="grid grid-cols-3 gap-2">
            {artworks.slice(0, 60).map(a => (
              <button
                key={a.id}
                onClick={() => placeArtwork(a.id)}
                disabled={!activeWallId}
                title={`${a.title}${a.artist ? ' — ' + a.artist : ''}`}
                className="border border-line hover:border-ink overflow-hidden disabled:opacity-40"
              >
                {a.thumb || a.image ? (
                  <img src={a.thumb || a.image || ''} alt={a.title} className="w-full aspect-square object-cover" />
                ) : (
                  <span className="text-[10px] text-ink-muted">{a.title}</span>
                )}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] tracking-[0.14em] uppercase text-ink-muted">
            {show.placements.length} placements
          </p>
        </aside>
      </main>
    </div>
  )
}
