'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '@/store'
import { STOCK_ROOMS } from '@/lib/rooms'
import { FRAME_PRESETS, FRAME_STYLES } from '@/lib/frames'
import { Artwork, FrameStyle, StockRoom } from '@/types'

interface FrameState {
  style: FrameStyle
  widthMm: number
  matteMm: number
}

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
  // average top-edge + bottom-edge widths in pixels
  const top = (quad[1][0] - quad[0][0]) * imgW
  const bottom = (quad[2][0] - quad[3][0]) * imgW
  return (top + bottom) / 2
}

export default function SampleRoom() {
  const { artworks, showToast } = useStore()
  const [room, setRoom] = useState<StockRoom>(STOCK_ROOMS[0])
  const [artwork, setArtwork] = useState<Artwork | null>(null)
  const [frame, setFrame] = useState<FrameState>({ style: 'thin-black', widthMm: 30, matteMm: 0 })
  const [exporting, setExporting] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  // pick first artwork once catalogue loads
  useEffect(() => {
    if (!artwork && artworks.length) setArtwork(artworks[0])
  }, [artworks, artwork])

  // pixels-per-cm at room scale, computed from wallQuad coverage of stage
  const pxPerCm = useMemo(() => {
    if (!stageRef.current || !imgRef.current?.naturalWidth) return null
    const stageW = stageRef.current.clientWidth
    const imgRatio = stageW / imgRef.current.naturalWidth
    const quadPx = quadWidthPx(room.wallQuad, imgRef.current.naturalWidth) * imgRatio
    return quadPx / room.wallWidthCm
  }, [room])

  const artworkBox = useMemo(() => {
    if (!artwork || !pxPerCm) return null
    const w = artwork.widthCm * pxPerCm
    const h = artwork.heightCm * pxPerCm
    const matte = (frame.matteMm / 10) * pxPerCm
    const fw = (frame.widthMm / 10) * pxPerCm
    return { w, h, matte, fw }
  }, [artwork, pxPerCm, frame])

  // center artwork on wall
  const wallCenter = useMemo(() => {
    const cx = (room.wallQuad[0][0] + room.wallQuad[1][0]) / 2
    const cy = (room.wallQuad[0][1] + room.wallQuad[2][1]) / 2
    return { cx, cy }
  }, [room])

  async function exportPng() {
    if (!artwork || !artworkBox || exporting) return
    setExporting(true)
    try {
      const bg = await loadImg(room.image)
      const aw = await loadImg(artwork.image ?? '')
      const W = bg.naturalWidth
      const H = bg.naturalHeight
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(bg, 0, 0, W, H)

      // recompute scale at native resolution
      const quadPxFull = quadWidthPx(room.wallQuad, W)
      const ppcFull = quadPxFull / room.wallWidthCm
      const aw_w = artwork.widthCm * ppcFull
      const aw_h = artwork.heightCm * ppcFull
      const matte = (frame.matteMm / 10) * ppcFull
      const fw = (frame.widthMm / 10) * ppcFull
      const totalW = aw_w + (matte + fw) * 2
      const totalH = aw_h + (matte + fw) * 2
      const cx = wallCenter.cx * W
      const cy = wallCenter.cy * H
      const x = cx - totalW / 2
      const y = cy - totalH / 2

      const preset = FRAME_PRESETS[frame.style]
      // outer frame
      if (frame.style !== 'none') {
        ctx.fillStyle = preset.borderColor
        ctx.fillRect(x, y, totalW, totalH)
      }
      // matte
      if (matte > 0) {
        ctx.fillStyle = preset.matteColor
        ctx.fillRect(x + fw, y + fw, totalW - fw * 2, totalH - fw * 2)
      }
      // artwork
      ctx.drawImage(aw, x + fw + matte, y + fw + matte, aw_w, aw_h)

      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.92),
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sample-room-${room.id}-${artwork.id}.jpg`
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
        <div className="max-w-content mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] tracking-[0.22em] uppercase text-ink-muted">Sample room</p>
            <h1 className="font-display text-[20px] tracking-tight">Place at scale</h1>
          </div>
          <button
            onClick={exportPng}
            disabled={!artwork || exporting}
            className="px-4 py-2 text-[12px] tracking-[0.18em] uppercase bg-ink text-paper disabled:opacity-40"
          >
            {exporting ? 'Saving…' : 'Save image'}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-content mx-auto w-full px-6 md:px-12 py-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        {/* Stage */}
        <section>
          <div ref={stageRef} className="relative w-full bg-line/40 overflow-hidden">
            <img
              ref={imgRef}
              src={room.image}
              alt={room.name}
              className="block w-full h-auto"
              crossOrigin="anonymous"
            />
            {artwork && artworkBox && (
              <div
                className="absolute"
                style={{
                  left: `${wallCenter.cx * 100}%`,
                  top: `${wallCenter.cy * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  width: artworkBox.w + (artworkBox.matte + artworkBox.fw) * 2,
                  height: artworkBox.h + (artworkBox.matte + artworkBox.fw) * 2,
                  background: FRAME_PRESETS[frame.style].borderColor,
                  boxShadow: FRAME_PRESETS[frame.style].shadow,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: artworkBox.fw,
                    background: FRAME_PRESETS[frame.style].matteColor,
                  }}
                >
                  {artwork.image && (
                    <img
                      src={artwork.image}
                      alt={artwork.title}
                      crossOrigin="anonymous"
                      style={{
                        position: 'absolute',
                        inset: artworkBox.matte,
                        width: `calc(100% - ${artworkBox.matte * 2}px)`,
                        height: `calc(100% - ${artworkBox.matte * 2}px)`,
                        objectFit: 'fill',
                      }}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Controls */}
        <aside className="flex flex-col gap-6 text-[13px]">
          <Block label="Room">
            <div className="grid grid-cols-3 gap-2">
              {STOCK_ROOMS.map(r => (
                <button
                  key={r.id}
                  onClick={() => setRoom(r)}
                  className={`border ${r.id === room.id ? 'border-ink' : 'border-line'}`}
                >
                  <img src={r.thumb} alt={r.name} className="w-full aspect-[4/3] object-cover" />
                </button>
              ))}
            </div>
          </Block>

          <Block label="Artwork">
            <select
              value={artwork?.id ?? ''}
              onChange={e => setArtwork(artworks.find(a => a.id === e.target.value) ?? null)}
              className="w-full border border-line bg-paper px-3 py-2"
            >
              {artworks.map(a => (
                <option key={a.id} value={a.id}>
                  {a.title} — {a.artist} ({a.widthCm}×{a.heightCm} cm)
                </option>
              ))}
            </select>
          </Block>

          <Block label="Frame">
            <div className="grid grid-cols-3 gap-2 mb-3">
              {FRAME_STYLES.map(s => (
                <button
                  key={s}
                  onClick={() => setFrame(f => ({ ...f, style: s }))}
                  className={`px-2 py-2 text-[11px] tracking-[0.12em] uppercase border ${
                    frame.style === s ? 'border-ink bg-ink text-paper' : 'border-line'
                  }`}
                >
                  {FRAME_PRESETS[s].label}
                </button>
              ))}
            </div>
            <Slider
              label={`Frame width: ${frame.widthMm} mm`}
              min={0}
              max={80}
              value={frame.widthMm}
              onChange={v => setFrame(f => ({ ...f, widthMm: v }))}
              disabled={frame.style === 'none'}
            />
            <Slider
              label={`Matte: ${frame.matteMm} mm`}
              min={0}
              max={120}
              value={frame.matteMm}
              onChange={v => setFrame(f => ({ ...f, matteMm: v }))}
            />
          </Block>

          {artwork && (
            <p className="text-[11px] tracking-[0.16em] uppercase text-ink-muted">
              True-scale: wall ≈ {room.wallWidthCm} cm wide
            </p>
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
