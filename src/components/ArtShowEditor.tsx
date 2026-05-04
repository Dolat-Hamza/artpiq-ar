'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, Upload, Plus, Trash2 } from 'lucide-react'
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
    <div className="min-h-dvh bg-bg text-ink">
      <header className="bg-paper border-b border-line">
        <div className="px-6 md:px-10 h-16 flex items-center gap-3">
          <Link
            href="/admin/shows"
            className="inline-flex items-center gap-1.5 text-meta uppercase tracking-[0.14em] text-ink-muted hover:text-ink"
          >
            <ArrowLeft size={13} /> All
          </Link>
          <input
            value={show.name}
            onChange={e => persist({ name: e.target.value })}
            className="font-display text-[14px] tracking-[0.04em] bg-transparent border-b border-transparent hover:border-line focus:border-ink outline-none px-1"
          />
          <input
            value={show.venueName || ''}
            onChange={e => persist({ venueName: e.target.value })}
            placeholder="Venue"
            className="text-body border-b border-transparent hover:border-line focus:border-ink outline-none px-1"
          />
          <div className="ml-auto flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => uploadPlan(e.target.files?.[0])}
            />
            <button onClick={() => fileRef.current?.click()} disabled={busy} className="btn-outline disabled:opacity-40">
              <Upload size={13} /> {show.floorPlanUrl ? 'Replace plan' : 'Upload plan'}
            </button>
            <button onClick={addWall} className="btn-outline">
              <Plus size={13} /> Wall
            </button>
            <button onClick={() => setMsg('All changes auto-saved')} className="btn-primary">
              <Save size={14} strokeWidth={2.5} /> Saved
            </button>
          </div>
        </div>
        <div className="px-6 md:px-10 h-11 border-t border-line bg-bg flex items-center gap-4 text-meta uppercase tracking-[0.12em] text-ink-muted">
          <span>Walls: <span className="text-ink font-bold">{show.wallSegments.length}</span></span>
          <span className="text-ink-muted">·</span>
          <span>Placements: <span className="text-ink font-bold">{show.placements.length}</span></span>
          {msg && <span className="ml-auto text-emerald-700 normal-case tracking-normal">{msg}</span>}
        </div>
      </header>

      <main className="px-6 md:px-10 py-6 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        <div
          ref={stageRef}
          className="relative bg-paper aspect-[4/3] overflow-hidden border border-line rounded-md touch-none"
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

        <aside className="bg-paper border border-line rounded-md p-4 text-body lg:sticky lg:top-[124px] lg:self-start">
          {activeWallId ? (
            (() => {
              const w = show.wallSegments.find(x => x.id === activeWallId)
              if (!w) return null
              return (
                <div className="space-y-3 mb-4 pb-4 border-b border-line">
                  <p className="text-meta tracking-[0.14em] uppercase text-ink-muted font-bold">Selected wall</p>
                  <label className="block text-meta tracking-[0.12em] uppercase text-ink-muted">
                    Length: <span className="text-ink font-bold normal-case tracking-normal">{(w.length * 100).toFixed(0)}%</span>
                    <input type="range" min={0.05} max={1} step={0.01} value={w.length} onChange={e => updateWall(w.id, { length: Number(e.target.value) })} className="w-full mt-1" />
                  </label>
                  <label className="block text-meta tracking-[0.12em] uppercase text-ink-muted">
                    Rotation: <span className="text-ink font-bold normal-case tracking-normal">{w.rotation.toFixed(0)}°</span>
                    <input type="range" min={0} max={360} step={1} value={w.rotation} onChange={e => updateWall(w.id, { rotation: Number(e.target.value) })} className="w-full mt-1" />
                  </label>
                </div>
              )
            })()
          ) : (
            <p className="text-body text-ink-muted mb-4 pb-4 border-b border-line">
              Click a wall to select. Tap an artwork below to place it on the selected wall.
            </p>
          )}
          <p className="text-meta tracking-[0.14em] uppercase text-ink-muted font-bold mb-3">
            Artworks · {artworks.length}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {artworks.slice(0, 60).map(a => (
              <button
                key={a.id}
                onClick={() => placeArtwork(a.id)}
                disabled={!activeWallId}
                title={`${a.title}${a.artist ? ' — ' + a.artist : ''}`}
                className="border border-line hover:border-ink overflow-hidden rounded-xs aspect-square bg-bg disabled:opacity-40 transition-colors"
              >
                {a.thumb || a.image ? (
                  <img src={a.thumb || a.image || ''} alt={a.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-meta text-ink-muted truncate inline-block px-1">{a.title}</span>
                )}
              </button>
            ))}
          </div>
        </aside>
      </main>
    </div>
  )
}
