'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useStore } from '@/store'
import { STOCK_ROOMS } from '@/lib/rooms'
import { FRAME_PRESETS, FRAME_STYLES } from '@/lib/frames'
import { Artwork, FrameStyle, StockRoom } from '@/types'

interface FrameState {
  style: FrameStyle
  widthMm: number
  matteMm: number
}

interface Placed {
  id: string // unique instance id
  artworkId: string
  cx: number
  cy: number
  widthCm: number
  frame: FrameState
}

const DEFAULT_FRAME: FrameState = { style: 'thin-black', widthMm: 30, matteMm: 0 }

function loadImg(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`load failed: ${url}`))
    img.src = url
  })
}

function quadWidthPx(quad: StockRoom['wallQuad'], imgW: number) {
  const top = (quad[1][0] - quad[0][0]) * imgW
  const bottom = (quad[2][0] - quad[3][0]) * imgW
  return (top + bottom) / 2
}

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export default function SampleRoom() {
  const { artworks, showToast } = useStore()
  const [room, setRoom] = useState<StockRoom>(STOCK_ROOMS[0])
  const [placed, setPlaced] = useState<Placed[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgLoading, setImgLoading] = useState(true)
  const [stageW, setStageW] = useState(0)
  const stageRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const dragRef = useRef<{
    id: string
    startCx: number
    startCy: number
    startX: number
    startY: number
    mode: 'move' | 'resize'
    startWidthCm: number
  } | null>(null)

  const artworkById = useMemo(() => {
    const m = new Map<string, Artwork>()
    for (const a of artworks) m.set(a.id, a)
    return m
  }, [artworks])

  const selected = placed.find(p => p.id === selectedId) ?? null

  // Reset on room change
  useEffect(() => {
    setImgLoaded(false)
    setImgLoading(true)
  }, [room])

  // Track stage width
  useEffect(() => {
    const update = () => {
      if (stageRef.current) setStageW(stageRef.current.clientWidth)
    }
    update()
    const ro = new ResizeObserver(update)
    if (stageRef.current) ro.observe(stageRef.current)
    return () => ro.disconnect()
  }, [])

  const pxPerCm = useMemo(() => {
    if (!stageW || !imgLoaded || !imgRef.current?.naturalWidth) return null
    const imgRatio = stageW / imgRef.current.naturalWidth
    const quadPx = quadWidthPx(room.wallQuad, imgRef.current.naturalWidth) * imgRatio
    return quadPx / room.wallWidthCm
  }, [room, stageW, imgLoaded])

  function addArtwork(a: Artwork) {
    const cx = (room.wallQuad[0][0] + room.wallQuad[1][0]) / 2
    const cy = (room.wallQuad[0][1] + room.wallQuad[2][1]) / 2
    // Slight stagger so multiple stacks aren't perfectly overlapping
    const offset = placed.length * 0.04
    const id = uid()
    setPlaced(p => [
      ...p,
      {
        id,
        artworkId: a.id,
        cx: Math.min(0.95, cx + offset),
        cy: Math.min(0.95, cy + offset),
        widthCm: a.widthCm,
        frame: { ...DEFAULT_FRAME },
      },
    ])
    setSelectedId(id)
  }

  function removePlaced(id: string) {
    setPlaced(p => p.filter(x => x.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  function updatePlaced(id: string, patch: Partial<Placed>) {
    setPlaced(p => p.map(x => (x.id === id ? { ...x, ...patch } : x)))
  }

  function updateFrame(id: string, patch: Partial<FrameState>) {
    setPlaced(p =>
      p.map(x => (x.id === id ? { ...x, frame: { ...x.frame, ...patch } } : x)),
    )
  }

  // Drag handlers ------------------------------------------------------------
  const onPointerDown = useCallback(
    (e: React.PointerEvent, id: string, mode: 'move' | 'resize') => {
      if (!stageRef.current) return
      e.stopPropagation()
      const target = placed.find(p => p.id === id)
      if (!target) return
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      setSelectedId(id)
      dragRef.current = {
        id,
        startCx: target.cx,
        startCy: target.cy,
        startX: e.clientX,
        startY: e.clientY,
        mode,
        startWidthCm: target.widthCm,
      }
    },
    [placed],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current || !stageRef.current) return
      const ref = dragRef.current
      const stageRect = stageRef.current.getBoundingClientRect()
      const dx = e.clientX - ref.startX
      const dy = e.clientY - ref.startY
      if (ref.mode === 'move') {
        const ndx = dx / stageRect.width
        const ndy = dy / stageRect.height
        updatePlaced(ref.id, {
          cx: Math.max(0.02, Math.min(0.98, ref.startCx + ndx)),
          cy: Math.max(0.02, Math.min(0.98, ref.startCy + ndy)),
        })
      } else {
        if (!pxPerCm) return
        const dCm = (dx + dy) / pxPerCm / 2
        const nextW = Math.max(5, Math.min(500, ref.startWidthCm + dCm))
        updatePlaced(ref.id, { widthCm: nextW })
      }
    },
    [pxPerCm],
  )

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (dragRef.current) {
      try {
        ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {}
      dragRef.current = null
    }
  }, [])

  // Export -------------------------------------------------------------------
  async function exportPng() {
    if (!placed.length || exporting) return
    setExporting(true)
    try {
      const bg = await loadImg(room.image)
      const W = bg.naturalWidth
      const H = bg.naturalHeight
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(bg, 0, 0, W, H)

      const quadPxFull = quadWidthPx(room.wallQuad, W)
      const ppcFull = quadPxFull / room.wallWidthCm

      for (const item of placed) {
        const aw = artworkById.get(item.artworkId)
        if (!aw || !aw.image) continue
        const ar = aw.heightCm / aw.widthCm
        const aw_w = item.widthCm * ppcFull
        const aw_h = item.widthCm * ar * ppcFull
        const matte = (item.frame.matteMm / 10) * ppcFull
        const fw = (item.frame.widthMm / 10) * ppcFull
        const totalW = aw_w + (matte + fw) * 2
        const totalH = aw_h + (matte + fw) * 2
        const x = item.cx * W - totalW / 2
        const y = item.cy * H - totalH / 2
        const preset = FRAME_PRESETS[item.frame.style]
        if (item.frame.style !== 'none') {
          ctx.fillStyle = preset.borderColor
          ctx.fillRect(x, y, totalW, totalH)
        }
        if (matte > 0) {
          ctx.fillStyle = preset.matteColor
          ctx.fillRect(x + fw, y + fw, totalW - fw * 2, totalH - fw * 2)
        }
        const img = await loadImg(aw.image)
        ctx.drawImage(img, x + fw + matte, y + fw + matte, aw_w, aw_h)
      }

      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.92),
      )
      const url = URL.createObjectURL(blob)
      const slug = (s: string) =>
        (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
      const first = placed[0] ? artworkById.get(placed[0].artworkId) : null
      const def = first
        ? `${slug(first.title) || 'artwork'}_${slug(first.artist) || 'artist'}_01`
        : `sample-room-${room.id}-${Date.now()}`
      const name = prompt('Image filename (without .jpg)', def) || def
      const a = document.createElement('a')
      a.href = url
      a.download = `${name}.jpg`
      a.click()
      URL.revokeObjectURL(url)
      showToast('Image saved')
    } catch (e) {
      console.error(e)
      showToast('Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-dvh bg-paper text-ink flex flex-col">
      <header className="border-b border-line">
        <div className="max-w-content mx-auto px-6 md:px-12 py-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.22em] uppercase text-ink-muted">Sample room</p>
            <h1 className="font-display text-[20px] tracking-tight">
              Place at scale — drag to move · corner to resize · pick room from sidebar
            </h1>
          </div>
          <button
            onClick={exportPng}
            disabled={!placed.length || exporting}
            className="px-4 py-2 text-[12px] tracking-[0.18em] uppercase bg-ink text-paper disabled:opacity-40"
          >
            {exporting ? 'Saving…' : `Save image (${placed.length})`}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-content mx-auto w-full px-6 md:px-12 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <section className="flex flex-col gap-3">
          <div
            ref={stageRef}
            className="relative w-full bg-line/40 overflow-hidden touch-none select-none"
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onClick={() => setSelectedId(null)}
          >
            {imgLoading && (
              <div className="absolute inset-0 grid place-items-center bg-paper/60 z-10 pointer-events-none">
                <span className="text-[11px] tracking-[0.20em] uppercase text-ink-muted">
                  Loading room…
                </span>
              </div>
            )}
            <img
              ref={imgRef}
              key={room.id}
              src={room.image}
              alt={room.name}
              className="block w-full h-auto"
              crossOrigin="anonymous"
              onLoad={() => {
                setImgLoaded(true)
                setImgLoading(false)
                if (stageRef.current) setStageW(stageRef.current.clientWidth)
              }}
              onError={() => {
                setImgLoading(false)
                showToast('Room image failed to load')
              }}
              draggable={false}
            />
            {pxPerCm &&
              placed.map(item => {
                const aw = artworkById.get(item.artworkId)
                if (!aw) return null
                const ar = aw.heightCm / aw.widthCm
                const w = item.widthCm * pxPerCm
                const h = w * ar
                const fw = (item.frame.widthMm / 10) * pxPerCm
                const matte = (item.frame.matteMm / 10) * pxPerCm
                const isSelected = item.id === selectedId
                return (
                  <div
                    key={item.id}
                    onPointerDown={e => onPointerDown(e, item.id, 'move')}
                    onClick={e => {
                      e.stopPropagation()
                      setSelectedId(item.id)
                    }}
                    className={`absolute cursor-grab active:cursor-grabbing ${
                      isSelected ? 'outline outline-2 outline-accent' : ''
                    }`}
                    style={{
                      left: `${item.cx * 100}%`,
                      top: `${item.cy * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      width: w + (matte + fw) * 2,
                      height: h + (matte + fw) * 2,
                      background: FRAME_PRESETS[item.frame.style].borderColor,
                      boxShadow: FRAME_PRESETS[item.frame.style].shadow,
                      touchAction: 'none',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: fw,
                        background: FRAME_PRESETS[item.frame.style].matteColor,
                        pointerEvents: 'none',
                      }}
                    >
                      {aw.image && (
                        <img
                          src={aw.image}
                          alt={aw.title}
                          crossOrigin="anonymous"
                          style={{
                            position: 'absolute',
                            inset: matte,
                            width: `calc(100% - ${matte * 2}px)`,
                            height: `calc(100% - ${matte * 2}px)`,
                            objectFit: 'fill',
                          }}
                          draggable={false}
                        />
                      )}
                    </div>
                    {/* Remove */}
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        removePlaced(item.id)
                      }}
                      className="absolute -top-3 -right-3 w-6 h-6 bg-paper border border-ink rounded-full flex items-center justify-center"
                      aria-label="Remove"
                    >
                      <X size={12} />
                    </button>
                    {/* Resize */}
                    <div
                      onPointerDown={e => onPointerDown(e, item.id, 'resize')}
                      className="absolute -right-2 -bottom-2 w-5 h-5 bg-ink border-2 border-paper cursor-nwse-resize"
                      style={{ touchAction: 'none' }}
                      aria-label="Resize"
                    />
                  </div>
                )
              })}
          </div>

          {/* Bottom artwork thumbnail strip */}
          <div className="border-t border-line pt-3">
            <p className="text-[11px] tracking-[0.18em] uppercase text-ink-muted mb-2">
              Click to add — {artworks.length} artworks · {placed.length} on wall
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {artworks.map(a => (
                <button
                  key={a.id}
                  onClick={() => addArtwork(a)}
                  title={`${a.title}${a.artist ? ' — ' + a.artist : ''}`}
                  className="shrink-0 w-20 h-20 border border-line bg-paper hover:border-ink overflow-hidden relative"
                >
                  {a.thumb || a.image ? (
                    <img
                      src={a.thumb || a.image || ''}
                      alt={a.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] text-ink-muted">{a.title}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] tracking-[0.16em] uppercase text-ink-muted">
            Wall ≈ {room.wallWidthCm} cm wide · drag to move · corner to resize · × to remove
          </p>
        </section>

        {/* Sidebar */}
        <aside className="flex flex-col gap-6 text-[13px]">
          <Block label="Room">
            <div className="grid grid-cols-3 gap-2">
              {STOCK_ROOMS.map(r => (
                <button
                  key={r.id}
                  onClick={() => setRoom(r)}
                  className={`border ${r.id === room.id ? 'border-ink' : 'border-line'}`}
                  title={r.name}
                >
                  <img src={r.thumb} alt={r.name} className="w-full aspect-[4/3] object-cover" />
                </button>
              ))}
            </div>
          </Block>

          {selected ? (
            <>
              <Block label={`Selected · ${artworkById.get(selected.artworkId)?.title || 'artwork'}`}>
                <Slider
                  label={`Width: ${selected.widthCm.toFixed(0)} cm`}
                  min={10}
                  max={300}
                  value={selected.widthCm}
                  onChange={v => updatePlaced(selected.id, { widthCm: v })}
                />
                <button
                  onClick={() => {
                    const aw = artworkById.get(selected.artworkId)
                    if (aw) updatePlaced(selected.id, { widthCm: aw.widthCm })
                  }}
                  className="mt-2 text-[11px] tracking-[0.14em] uppercase text-ink-muted underline"
                >
                  Reset to true scale
                </button>
              </Block>

              <Block label="Frame">
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {FRAME_STYLES.map(s => (
                    <button
                      key={s}
                      onClick={() => updateFrame(selected.id, { style: s })}
                      className={`px-2 py-2 text-[11px] tracking-[0.12em] uppercase border ${
                        selected.frame.style === s
                          ? 'border-ink bg-ink text-paper'
                          : 'border-line'
                      }`}
                    >
                      {FRAME_PRESETS[s].label}
                    </button>
                  ))}
                </div>
                <Slider
                  label={`Frame width: ${selected.frame.widthMm} mm`}
                  min={0}
                  max={80}
                  value={selected.frame.widthMm}
                  onChange={v => updateFrame(selected.id, { widthMm: v })}
                  disabled={selected.frame.style === 'none'}
                />
                <Slider
                  label={`Matte: ${selected.frame.matteMm} mm`}
                  min={0}
                  max={120}
                  value={selected.frame.matteMm}
                  onChange={v => updateFrame(selected.id, { matteMm: v })}
                />
              </Block>
            </>
          ) : (
            <p className="text-[12px] text-ink-muted">
              Add an artwork from the strip below — or click a placed artwork to edit it.
            </p>
          )}

          {placed.length > 0 && (
            <button
              onClick={() => {
                setPlaced([])
                setSelectedId(null)
              }}
              className="text-[11px] tracking-[0.16em] uppercase text-red-600 underline self-start"
            >
              Clear wall
            </button>
          )}
        </aside>
      </main>
    </div>
  )
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="text-[11px] tracking-[0.20em] uppercase text-ink-muted mb-2">{label}</p>
      {children}
    </section>
  )
}

function Slider({
  label,
  min,
  max,
  value,
  onChange,
  disabled,
}: {
  label: string
  min: number
  max: number
  value: number
  onChange: (n: number) => void
  disabled?: boolean
}) {
  return (
    <label className={`block mt-2 ${disabled ? 'opacity-40' : ''}`}>
      <span className="block text-[11px] tracking-[0.14em] uppercase text-ink-muted mb-1">
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
  )
}
