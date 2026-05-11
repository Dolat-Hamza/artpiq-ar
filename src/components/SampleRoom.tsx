'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Heart, X } from 'lucide-react'
import { useStore } from '@/store'
import { STOCK_ROOMS } from '@/lib/rooms'
import { FRAME_PRESETS, FRAME_STYLES } from '@/lib/frames'
import { useAuth } from '@/lib/db/auth'
import { addFavorite, listFavorites, removeFavorite } from '@/lib/db/favorites'
import { createDesign, uploadDesignThumb } from '@/lib/db/savedDesigns'
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
  rotation: number // degrees
  matteColor: string // hex
  shadowOpacity: number // 0..1
  shadowSpread: number // 0..40 px (base)
}

// ArtPlacer-parity lighting model: per-channel B/C/S sliders, applied separately
// to room background, placed artwork images, and shadow casting.
export interface BCS {
  brightness: number // 0..200 (100 = neutral)
  contrast: number
  saturation: number
}
const NEUTRAL_BCS: BCS = { brightness: 100, contrast: 100, saturation: 100 }

export interface LightingState {
  room: BCS
  artwork: BCS
  // Shadow channel only multiplies opacity/spread of the per-piece shadow (global).
  shadowGlobalOpacity: number // 0..200
  shadowGlobalSpread: number // 0..200
}
const NEUTRAL_LIGHTING: LightingState = {
  room: { ...NEUTRAL_BCS },
  artwork: { ...NEUTRAL_BCS },
  shadowGlobalOpacity: 100,
  shadowGlobalSpread: 100,
}

function bcsToFilter(bcs: BCS): string {
  return `brightness(${bcs.brightness}%) contrast(${bcs.contrast}%) saturate(${bcs.saturation}%)`
}

// Build a CSS clip-path polygon string from a normalized wall quad.
function quadToClipPath(quad: StockRoom['wallQuad']): string {
  return `polygon(${quad.map(([x, y]) => `${(x * 100).toFixed(2)}% ${(y * 100).toFixed(2)}%`).join(', ')})`
}

const DEFAULT_FRAME: FrameState = { style: 'thin-black', widthMm: 30, matteMm: 0 }
const DEFAULT_MATTE = '#ffffff'

const MATTE_PALETTE: { value: string; label: string }[] = [
  { value: '#ffffff', label: 'White' },
  { value: '#fafaf7', label: 'Off-white' },
  { value: '#e9e3d5', label: 'Cream' },
  { value: '#cfc8b6', label: 'Oat' },
  { value: '#9aa0a6', label: 'Grey' },
  { value: '#1c1c1c', label: 'Black' },
]

// Lighting sub-tabs in dock
type LightingSubtab = 'room' | 'artwork' | 'shadow'

type RoomCategory = 'all' | 'living' | 'bedroom' | 'office' | 'kitchen' | 'gallery' | 'plain'
const ROOM_CATEGORIES: RoomCategory[] = ['all', 'living', 'bedroom', 'office', 'kitchen', 'gallery', 'plain']

async function loadImgViaFetch(url: string): Promise<HTMLImageElement> {
  // Fetch -> blob -> object URL avoids CORS-tainted canvas exports.
  const r = await fetch(url, { mode: 'cors' })
  if (!r.ok) throw new Error(`fetch ${r.status}`)
  const blob = await r.blob()
  const obj = URL.createObjectURL(blob)
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`decode failed: ${url}`))
    img.src = obj
  })
}

function loadImg(url: string): Promise<HTMLImageElement> {
  // Try fetch path first; on failure fall back to crossOrigin img tag.
  return loadImgViaFetch(url).catch(
    () =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error(`load failed: ${url}`))
        img.src = url
      }),
  )
}

function quadWidthPx(quad: StockRoom['wallQuad'], imgW: number) {
  const top = (quad[1][0] - quad[0][0]) * imgW
  const bottom = (quad[2][0] - quad[3][0]) * imgW
  return (top + bottom) / 2
}

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

// Compose a box-shadow string from a placed piece's per-item shadow values
// modulated by global lighting shadow channel.
function composeShadow(
  item: { frame: { style: string }; shadowOpacity: number; shadowSpread: number },
  lighting: LightingState,
): string {
  if (item.frame.style === 'none' || item.shadowOpacity === 0) return 'none'
  const opacity = item.shadowOpacity * (lighting.shadowGlobalOpacity / 100)
  const spread = item.shadowSpread * (lighting.shadowGlobalSpread / 100)
  const offsetY = spread * 0.5
  return `0 ${offsetY.toFixed(1)}px ${spread.toFixed(1)}px rgba(0,0,0,${opacity.toFixed(3)})`
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
  const [dockTab, setDockTab] = useState<'artworks' | 'rooms' | 'frames' | 'advanced'>('artworks')
  const [lighting, setLighting] = useState<LightingState>(NEUTRAL_LIGHTING)
  const [lightingSub, setLightingSub] = useState<LightingSubtab>('room')
  const [roomCat, setRoomCat] = useState<RoomCategory>('all')
  // Customize: wall color tint + zoom + crop (crop deferred)
  const [wallColor, setWallColor] = useState<string | null>(null)
  const [wallColorOpacity, setWallColorOpacity] = useState(0.45)
  const [zoomPct, setZoomPct] = useState(100) // 100..250
  // Crop: normalized [0..1] inset from each edge (top, right, bottom, left)
  const [cropInset, setCropInset] = useState({ top: 0, right: 0, bottom: 0, left: 0 })
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [showRoomsModal, setShowRoomsModal] = useState(false)
  const [savingDesign, setSavingDesign] = useState(false)
  const { user } = useAuth()

  // ?room=<id> sets initial room
  useEffect(() => {
    if (typeof window === 'undefined') return
    const rid = new URLSearchParams(window.location.search).get('room')
    if (!rid) return
    const r = STOCK_ROOMS.find(x => x.id === rid)
    if (r) setRoom(r)
  }, [])

  // Restore an initial design from URL param ?design=<id> if any
  useEffect(() => {
    if (typeof window === 'undefined') return
    const id = new URLSearchParams(window.location.search).get('design')
    if (!id) return
    import('@/lib/db/savedDesigns').then(async mod => {
      try {
        const d = await mod.getDesign(id)
        if (!d) return
        const r = STOCK_ROOMS.find(x => x.id === d.roomId)
        if (r) setRoom(r)
        if (Array.isArray(d.placed)) setPlaced(d.placed as Placed[])
        if (d.lighting && typeof d.lighting === 'object') setLighting(d.lighting as LightingState)
        if (d.wallColor) setWallColor(d.wallColor)
        if (d.customize && typeof d.customize === 'object') {
          const c = d.customize as { wallColorOpacity?: number; zoomPct?: number }
          if (c.wallColorOpacity !== undefined) setWallColorOpacity(c.wallColorOpacity)
          if (c.zoomPct !== undefined) setZoomPct(c.zoomPct)
        }
      } catch {
        showToast('Could not load design')
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveDesign() {
    if (!user) {
      showToast('Sign in to save designs')
      return
    }
    if (!placed.length) {
      showToast('Add an artwork first')
      return
    }
    const name = window.prompt('Design name', `${room.name} — ${new Date().toLocaleDateString()}`) || ''
    if (!name.trim()) return
    setSavingDesign(true)
    try {
      // Render thumbnail JPEG via existing capture pipeline
      const thumbBlob = await captureCurrentRoom()
      // Persist row first to get id
      const design = await createDesign({
        ownerId: user.id,
        name: name.trim(),
        roomId: room.id,
        placed: placed as unknown,
        lighting: lighting as unknown,
        wallColor: wallColor,
        customize: { wallColorOpacity, zoomPct },
      })
      if (thumbBlob) {
        try {
          const url = await uploadDesignThumb(user.id, design.id, thumbBlob)
          // Best-effort thumb URL update
          await import('@/lib/db/savedDesigns').then(m => m.updateDesign(design.id, { thumbUrl: url }))
        } catch {
          // Thumb upload optional
        }
      }
      showToast(`Saved "${design.name}"`)
    } catch (e) {
      console.error(e)
      showToast('Save failed')
    } finally {
      setSavingDesign(false)
    }
  }
  // Sequence mode
  const [sequence, setSequence] = useState<StockRoom[] | null>(null)
  const [sequenceIdx, setSequenceIdx] = useState(0)
  const [sequencePicker, setSequencePicker] = useState(false)
  const [sequencePicks, setSequencePicks] = useState<string[]>([])
  const [sequenceShots, setSequenceShots] = useState<{ blob: Blob; name: string }[]>([])
  const stageRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const dragRef = useRef<{
    id: string
    startCx: number
    startCy: number
    startX: number
    startY: number
    mode: 'move' | 'resize' | 'rotate'
    startWidthCm: number
    startRotation: number
    pivotX: number
    pivotY: number
    startAngle: number
  } | null>(null)

  const artworkById = useMemo(() => {
    const m = new Map<string, Artwork>()
    for (const a of artworks) m.set(a.id, a)
    return m
  }, [artworks])

  const selected = placed.find(p => p.id === selectedId) ?? null

  // Auto-switch dock to tools when something is selected
  useEffect(() => {
    if (selected) setDockTab('advanced')
  }, [selectedId])

  // Load room favorites for signed-in user
  useEffect(() => {
    if (!user) return
    listFavorites(user.id)
      .then(ids => setFavorites(new Set(ids)))
      .catch(() => {})
  }, [user])

  async function toggleFavorite(roomId: string) {
    if (!user) return
    const isFav = favorites.has(roomId)
    const next = new Set(favorites)
    if (isFav) {
      next.delete(roomId)
      setFavorites(next)
      try { await removeFavorite(user.id, roomId) } catch {}
    } else {
      next.add(roomId)
      setFavorites(next)
      try { await addFavorite(user.id, roomId) } catch {}
    }
  }

  // Reset on room change
  useEffect(() => {
    setImgLoaded(false)
    setImgLoading(true)
  }, [room])

  // Track displayed image width (not container) so pxPerCm matches what user sees
  useEffect(() => {
    const update = () => {
      const w = imgRef.current?.clientWidth ?? stageRef.current?.clientWidth ?? 0
      setStageW(w)
    }
    update()
    const ro = new ResizeObserver(update)
    if (stageRef.current) ro.observe(stageRef.current)
    if (imgRef.current) ro.observe(imgRef.current)
    return () => ro.disconnect()
  }, [room])

  const pxPerCm = useMemo(() => {
    if (!stageW || !imgLoaded || !imgRef.current?.naturalWidth) return null
    const imgRatio = stageW / imgRef.current.naturalWidth
    const quadPx = quadWidthPx(room.wallQuad, imgRef.current.naturalWidth) * imgRatio
    return quadPx / room.wallWidthCm
  }, [room, stageW, imgLoaded])

  function addArtwork(a: Artwork) {
    const cx = (room.wallQuad[0][0] + room.wallQuad[1][0]) / 2
    const cy = (room.wallQuad[0][1] + room.wallQuad[2][1]) / 2
    const offset = placed.length * 0.04
    const id = uid()
    // Cap initial width so a huge piece doesn't fill the wall on first add.
    // Max half the wall, never more than the artwork's true width.
    const initWidth = Math.min(a.widthCm || 60, room.wallWidthCm * 0.5)
    setPlaced(p => [
      ...p,
      {
        id,
        artworkId: a.id,
        cx: Math.min(0.95, cx + offset),
        cy: Math.min(0.95, cy + offset),
        widthCm: initWidth,
        frame: { ...DEFAULT_FRAME },
        rotation: 0,
        matteColor: DEFAULT_MATTE,
        shadowOpacity: 0.22,
        shadowSpread: 14,
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
    (e: React.PointerEvent, id: string, mode: 'move' | 'resize' | 'rotate') => {
      if (!stageRef.current || !imgRef.current) return
      e.stopPropagation()
      const target = placed.find(p => p.id === id)
      if (!target) return
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      setSelectedId(id)
      const stageRect = imgRef.current.getBoundingClientRect()
      const pivotX = stageRect.left + target.cx * stageRect.width
      const pivotY = stageRect.top + target.cy * stageRect.height
      const startAngle = Math.atan2(e.clientY - pivotY, e.clientX - pivotX) * (180 / Math.PI)
      dragRef.current = {
        id,
        startCx: target.cx,
        startCy: target.cy,
        startX: e.clientX,
        startY: e.clientY,
        mode,
        startWidthCm: target.widthCm,
        startRotation: target.rotation,
        pivotX,
        pivotY,
        startAngle,
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
      } else if (ref.mode === 'resize') {
        if (!pxPerCm) return
        const dCm = (dx + dy) / pxPerCm / 2
        const nextW = Math.max(5, Math.min(500, ref.startWidthCm + dCm))
        updatePlaced(ref.id, { widthCm: nextW })
      } else {
        // rotate
        const angle = Math.atan2(e.clientY - ref.pivotY, e.clientX - ref.pivotX) * (180 / Math.PI)
        const delta = angle - ref.startAngle
        let next = ref.startRotation + delta
        // Snap every 22.5° while shift-ish slow drag — simple snap to 5°
        next = Math.round(next / 1) // no-op, kept for future snap
        updatePlaced(ref.id, { rotation: next })
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

  // Sequence helpers ---------------------------------------------------------
  function startSequence() {
    const picked = STOCK_ROOMS.filter(r => sequencePicks.includes(r.id))
    if (picked.length < 1) return
    setSequence(picked)
    setSequenceIdx(0)
    setSequenceShots([])
    setSequencePicker(false)
    setRoom(picked[0])
  }

  async function captureCurrentRoom(): Promise<Blob | null> {
    if (!placed.length) return null
    const bg = await loadImg(room.image)
    const W = bg.naturalWidth
    const H = bg.naturalHeight
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!
    // Room BCS — apply via canvas filter while drawing background
    ctx.save()
    ctx.filter = bcsToFilter(lighting.room)
    if (cropInset.top || cropInset.right || cropInset.bottom || cropInset.left) {
      const sx = cropInset.left * W
      const sy = cropInset.top * H
      const sw = W - sx - cropInset.right * W
      const sh = H - sy - cropInset.bottom * H
      ctx.drawImage(bg, sx, sy, sw, sh, 0, 0, W, H)
    } else {
      ctx.drawImage(bg, 0, 0, W, H)
    }
    ctx.restore()

    // Wall color tint inside wall quad (clip + multiply fill)
    if (wallColor) {
      ctx.save()
      ctx.beginPath()
      const q = room.wallQuad
      ctx.moveTo(q[0][0] * W, q[0][1] * H)
      for (let i = 1; i < q.length; i++) ctx.lineTo(q[i][0] * W, q[i][1] * H)
      ctx.closePath()
      ctx.clip()
      ctx.globalAlpha = wallColorOpacity
      ctx.globalCompositeOperation = 'multiply'
      ctx.fillStyle = wallColor
      ctx.fillRect(0, 0, W, H)
      ctx.restore()
    }

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
      const cx = item.cx * W
      const cy = item.cy * H
      const preset = FRAME_PRESETS[item.frame.style]

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate((item.rotation * Math.PI) / 180)
      // Shadow: per-piece opacity/spread modulated by global lighting shadow channel
      if (item.frame.style !== 'none' && item.shadowOpacity > 0) {
        const opacity = item.shadowOpacity * (lighting.shadowGlobalOpacity / 100)
        const spread = item.shadowSpread * (lighting.shadowGlobalSpread / 100)
        ctx.shadowColor = `rgba(0,0,0,${opacity})`
        ctx.shadowBlur = spread
        ctx.shadowOffsetY = spread * 0.5
      }
      const x = -totalW / 2
      const y = -totalH / 2
      if (item.frame.style !== 'none') {
        ctx.fillStyle = preset.borderColor
        ctx.fillRect(x, y, totalW, totalH)
      }
      // Reset shadow before matte/img so it doesn't double up
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetY = 0
      if (matte > 0) {
        ctx.fillStyle = item.matteColor
        ctx.fillRect(x + fw, y + fw, totalW - fw * 2, totalH - fw * 2)
      }
      try {
        const img = await loadImg(aw.image)
        // Apply artwork BCS via canvas filter
        ctx.save()
        ctx.filter = bcsToFilter(lighting.artwork)
        ctx.drawImage(img, x + fw + matte, y + fw + matte, aw_w, aw_h)
        ctx.restore()
      } catch {
        // skip if artwork image fails
      }
      ctx.restore()
    }
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.92),
    )
  }

  async function confirmAndNext() {
    if (!sequence) return
    try {
      setExporting(true)
      const blob = await captureCurrentRoom()
      let appended: { blob: Blob; name: string }[] = sequenceShots
      if (blob) {
        const slug = (s: string) =>
          (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        const first = placed[0] ? artworkById.get(placed[0].artworkId) : null
        const artworkPart = first
          ? `${slug(first.title) || 'artwork'}-${slug(first.artist) || 'artist'}`
          : 'artwork'
        const roomPart = slug(room.name) || slug(room.id) || `room${sequenceIdx + 1}`
        // Format: 01-artwork-name-artist-room-name.jpg (ordered + descriptive)
        const name = `${String(sequenceIdx + 1).padStart(2, '0')}-${artworkPart}-${roomPart}`
        const shot = { blob, name }
        appended = [...sequenceShots, shot]
        setSequenceShots(appended)
      }
      const nextIdx = sequenceIdx + 1
      if (nextIdx >= sequence.length) {
        // Download all in order (sequenceShots may not yet include the just-captured one
        // due to async state — use `appended` which includes it).
        for (const s of appended) {
          const url = URL.createObjectURL(s.blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${s.name}.jpg`
          a.click()
          URL.revokeObjectURL(url)
          // Small gap between downloads so the browser doesn't drop them
          await new Promise(r => setTimeout(r, 200))
        }
        showToast(`Sequence done — ${appended.length} images saved`)
        setSequence(null)
        setSequenceIdx(0)
        setSequenceShots([])
      } else {
        setSequenceIdx(nextIdx)
        setRoom(sequence[nextIdx])
      }
    } catch (e) {
      console.error(e)
      showToast('Sequence step failed')
    } finally {
      setExporting(false)
    }
  }

  function cancelSequence() {
    setSequence(null)
    setSequenceIdx(0)
    setSequenceShots([])
  }

  // Export -------------------------------------------------------------------
  async function exportPng() {
    if (!placed.length || exporting) return
    setExporting(true)
    try {
      const blob = await captureCurrentRoom()
      if (!blob) {
        showToast('Nothing to save')
        return
      }
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
      <header className="bg-paper border-b border-line">
        <div className="px-6 md:px-10 h-16 flex items-center gap-3">
          <h1 className="font-display text-[14px] tracking-[0.18em] uppercase">Sample Room</h1>
          <span className="text-meta tracking-[0.12em] uppercase text-ink-muted hidden md:inline">
            Drag · resize · choose room from sidebar
          </span>
          <div className="ml-auto flex gap-2 items-center">
            {sequence ? (
              <>
                <span className="text-meta tracking-[0.12em] uppercase text-ink-muted hidden md:inline">
                  Step {sequenceIdx + 1} / {sequence.length} · {room.name}
                </span>
                <button onClick={cancelSequence} className="btn-outline">
                  Cancel
                </button>
                <button
                  onClick={confirmAndNext}
                  disabled={!placed.length || exporting}
                  className="btn-primary disabled:opacity-40"
                >
                  {exporting
                    ? 'Saving…'
                    : sequenceIdx + 1 === sequence.length
                      ? 'Save & finish'
                      : 'Confirm & next'}
                </button>
              </>
            ) : (
              <>
                <a href="/admin/designs" className="hidden md:inline-flex btn-outline">
                  My Designs
                </a>
                <button
                  onClick={saveDesign}
                  disabled={!user || !placed.length || savingDesign}
                  className="btn-outline disabled:opacity-40"
                  title={!user ? 'Sign in to save' : 'Save composition'}
                >
                  {savingDesign ? 'Saving…' : 'Save design'}
                </button>
                <button
                  onClick={() => {
                    setSequencePicks([])
                    setSequencePicker(true)
                  }}
                  className="btn-outline hidden lg:inline-flex"
                >
                  Sequence
                </button>
                <button
                  onClick={exportPng}
                  disabled={!placed.length || exporting}
                  className="btn-primary disabled:opacity-40"
                >
                  {exporting ? 'Saving…' : `Save image (${placed.length})`}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col w-full">
        <section className="flex-1 flex items-center justify-center bg-surface-stage px-6 py-6 min-h-0">
          <div
            ref={stageRef}
            className="relative bg-line/40 overflow-hidden touch-none select-none inline-block"
            style={{ maxHeight: 'calc(100vh - 320px)', maxWidth: '100%' }}
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
              className="block w-auto h-auto max-w-full mx-auto"
              style={{
                maxHeight: 'calc(100vh - 320px)',
                filter: bcsToFilter(lighting.room),
                transform: zoomPct !== 100 ? `scale(${zoomPct / 100})` : undefined,
                transformOrigin: 'center',
                clipPath:
                  cropInset.top || cropInset.right || cropInset.bottom || cropInset.left
                    ? `inset(${(cropInset.top * 100).toFixed(2)}% ${(cropInset.right * 100).toFixed(2)}% ${(cropInset.bottom * 100).toFixed(2)}% ${(cropInset.left * 100).toFixed(2)}%)`
                    : undefined,
              }}
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
            {/* Wall color tint clip-path over the wall quad */}
            {wallColor && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: wallColor,
                  opacity: wallColorOpacity,
                  clipPath: quadToClipPath(room.wallQuad),
                  WebkitClipPath: quadToClipPath(room.wallQuad),
                  mixBlendMode: 'multiply',
                  zIndex: 1,
                }}
              />
            )}
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
                      isSelected ? 'ring-1 ring-accent ring-offset-4 ring-offset-transparent' : ''
                    }`}
                    style={{
                      left: `${item.cx * 100}%`,
                      top: `${item.cy * 100}%`,
                      transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
                      width: w + (matte + fw) * 2,
                      height: h + (matte + fw) * 2,
                      background: FRAME_PRESETS[item.frame.style].borderColor,
                      boxShadow: composeShadow(item, lighting),
                      touchAction: 'none',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: fw,
                        background: item.matteColor,
                        pointerEvents: 'none',
                      }}
                    >
                      {aw.image && (
                        <img
                          src={aw.image}
                          alt={aw.title}
                          style={{
                            position: 'absolute',
                            inset: matte,
                            width: `calc(100% - ${matte * 2}px)`,
                            height: `calc(100% - ${matte * 2}px)`,
                            objectFit: 'fill',
                            filter: bcsToFilter(lighting.artwork),
                          }}
                          draggable={false}
                        />
                      )}
                    </div>
                    {/* Remove + Resize + Rotate — only when selected */}
                    {isSelected && (
                      <>
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
                        <div
                          onPointerDown={e => onPointerDown(e, item.id, 'resize')}
                          className="absolute -right-1.5 -bottom-1.5 w-3.5 h-3.5 rounded-full bg-accent ring-2 ring-paper cursor-nwse-resize shadow-pop"
                          style={{ touchAction: 'none' }}
                          aria-label="Resize"
                        />
                        <div
                          onPointerDown={e => onPointerDown(e, item.id, 'rotate')}
                          className="absolute -left-1.5 -top-1.5 w-3.5 h-3.5 rounded-full bg-paper ring-2 ring-accent cursor-grab shadow-pop"
                          style={{ touchAction: 'none' }}
                          aria-label="Rotate"
                          title="Drag to rotate"
                        />
                      </>
                    )}
                    {/* Floating frame toolbar — sits directly beneath artwork when selected */}
                    {isSelected && (
                      <div
                        className="absolute left-1/2 top-full mt-3 -translate-x-1/2 flex items-center gap-1 bg-paper rounded-md border border-line/60 shadow-pop px-2 py-1.5 z-20"
                        onPointerDown={e => e.stopPropagation()}
                        onClick={e => e.stopPropagation()}
                      >
                        {FRAME_STYLES.map(s => (
                          <button
                            key={s}
                            onClick={() => updateFrame(item.id, { style: s })}
                            title={FRAME_PRESETS[s].label}
                            className={`w-6 h-6 rounded-sm transition-all ${
                              item.frame.style === s
                                ? 'ring-2 ring-accent ring-offset-1 ring-offset-paper'
                                : 'ring-1 ring-line hover:ring-ink-muted'
                            }`}
                            style={{
                              background:
                                s === 'none'
                                  ? 'repeating-conic-gradient(#e5e7eb 0% 25%, #ffffff 0% 50%) 50% / 8px 8px'
                                  : FRAME_PRESETS[s].borderColor,
                            }}
                          />
                        ))}
                        <span className="mx-2 h-5 w-px bg-line" />
                        <span className="text-[10px] tracking-[0.14em] uppercase text-ink-muted px-0.5 tabular-nums">
                          {item.widthCm.toFixed(0)} × {(item.widthCm * (aw.heightCm / aw.widthCm)).toFixed(0)} cm
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
          </div>

        </section>

        {/* Bottom dock — ArtPlacer-style tab dock */}
        <div className="bg-surface-dock text-on-dock shadow-dock flex-shrink-0">
          <div className="flex items-center px-4 md:px-8 gap-0 border-b border-white/10">
            {(['artworks', 'rooms', 'frames', 'advanced'] as const).map(t => (
              <button
                key={t}
                onClick={() => setDockTab(t)}
                data-active={dockTab === t}
                className="dock-tab"
              >
                {t === 'artworks' && `Artworks · ${artworks.length}`}
                {t === 'rooms' && `Rooms · ${STOCK_ROOMS.length}`}
                {t === 'frames' && 'Frames'}
                {t === 'advanced' && 'Advanced'}
              </button>
            ))}
            <span className="ml-auto text-[10px] tracking-[0.18em] uppercase text-on-dock-muted hidden sm:inline">
              Wall ≈ {room.wallWidthCm} cm · {placed.length} placed
            </span>
            {placed.length > 0 && (
              <button
                onClick={() => {
                  setPlaced([])
                  setSelectedId(null)
                }}
                className="ml-3 text-[10px] tracking-[0.18em] uppercase text-red-400 hover:text-red-300"
              >
                Clear
              </button>
            )}
          </div>
          <div className="px-4 md:px-8 py-4 max-h-[220px] overflow-y-auto bg-surface-dock text-on-dock">
            {dockTab === 'rooms' && (
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {ROOM_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setRoomCat(cat)}
                      className={`px-2.5 h-7 text-[10px] tracking-[0.16em] uppercase border ${
                        roomCat === cat
                          ? 'bg-ink text-paper border-ink'
                          : 'border-line text-ink-muted hover:text-ink'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowRoomsModal(true)}
                    className="ml-auto px-3 h-7 text-[10px] tracking-[0.16em] uppercase border border-line hover:border-ink"
                  >
                    Browse all · Suggested · Favorites
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {STOCK_ROOMS.filter(r => roomCat === 'all' || r.category === roomCat).map(r => (
                    <div key={r.id} className="shrink-0 relative group">
                      <button
                        onClick={() => setRoom(r)}
                        className={`block border ${
                          r.id === room.id ? 'border-ink ring-2 ring-ink' : 'border-line'
                        }`}
                        title={r.name}
                      >
                        <img
                          src={r.thumb}
                          alt={r.name}
                          className="w-28 h-20 object-cover block"
                        />
                      </button>
                      {user && (
                        <button
                          onClick={() => toggleFavorite(r.id)}
                          className="absolute top-1 right-1 w-6 h-6 grid place-items-center bg-paper/80 border border-line"
                          title={favorites.has(r.id) ? 'Unfavorite' : 'Favorite'}
                        >
                          <Heart
                            size={12}
                            fill={favorites.has(r.id) ? '#e11d48' : 'transparent'}
                            stroke={favorites.has(r.id) ? '#e11d48' : 'currentColor'}
                          />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {dockTab === 'advanced' && (
              <div>
                <div className="flex gap-1 mb-3">
                  {(['shadow', 'artwork', 'room'] as LightingSubtab[]).map(sub => (
                    <button
                      key={sub}
                      onClick={() => setLightingSub(sub)}
                      disabled={sub === 'shadow' && !selected}
                      className={`px-3 h-7 text-[10px] tracking-[0.18em] uppercase ${
                        lightingSub === sub
                          ? 'border-b-2 border-ink text-ink -mb-px'
                          : 'text-ink-muted hover:text-ink'
                      } ${sub === 'shadow' && !selected ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      {sub}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      if (lightingSub === 'room') setLighting(l => ({ ...l, room: { ...NEUTRAL_BCS } }))
                      else if (lightingSub === 'artwork') setLighting(l => ({ ...l, artwork: { ...NEUTRAL_BCS } }))
                      else if (lightingSub === 'shadow' && selected) {
                        updatePlaced(selected.id, { shadowOpacity: 0.22, shadowSpread: 14 })
                      }
                    }}
                    className="ml-auto text-[11px] tracking-[0.14em] uppercase text-ink-muted underline"
                  >
                    Reset
                  </button>
                </div>
                {lightingSub === 'room' && (
                  <BCSSliders
                    bcs={lighting.room}
                    onChange={v => setLighting(l => ({ ...l, room: v }))}
                  />
                )}
                {lightingSub === 'artwork' && (
                  <BCSSliders
                    bcs={lighting.artwork}
                    onChange={v => setLighting(l => ({ ...l, artwork: v }))}
                  />
                )}
                {lightingSub === 'shadow' && selected && (
                  <div className="flex flex-wrap gap-x-8 gap-y-3 items-end">
                    <div className="min-w-[220px]">
                      <Slider
                        label={`Shadow opacity: ${(selected.shadowOpacity * 100).toFixed(0)}%`}
                        min={0}
                        max={1}
                        step={0.01}
                        value={selected.shadowOpacity}
                        onChange={v => updatePlaced(selected.id, { shadowOpacity: v })}
                      />
                    </div>
                    <div className="min-w-[220px]">
                      <Slider
                        label={`Shadow spread: ${selected.shadowSpread.toFixed(0)} px`}
                        min={0}
                        max={40}
                        step={1}
                        value={selected.shadowSpread}
                        onChange={v => updatePlaced(selected.id, { shadowSpread: v })}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            {dockTab === 'advanced' && (
              <div className="flex flex-wrap gap-x-8 gap-y-3 items-end">
                <div className="min-w-[200px]">
                  <Slider
                    label={`Zoom: ${zoomPct}%`}
                    min={100}
                    max={250}
                    step={5}
                    value={zoomPct}
                    onChange={setZoomPct}
                  />
                </div>
                <div className="w-full">
                  <p className="text-[11px] tracking-[0.14em] uppercase text-ink-muted mb-1">
                    Crop room
                  </p>
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {(['top', 'right', 'bottom', 'left'] as const).map(side => (
                      <div key={side} className="min-w-[150px]">
                        <Slider
                          label={`${side}: ${(cropInset[side] * 100).toFixed(0)}%`}
                          min={0}
                          max={0.45}
                          step={0.01}
                          value={cropInset[side]}
                          onChange={v => setCropInset(c => ({ ...c, [side]: v }))}
                        />
                      </div>
                    ))}
                    <button
                      onClick={() => setCropInset({ top: 0, right: 0, bottom: 0, left: 0 })}
                      className="self-end text-[11px] tracking-[0.14em] uppercase text-ink-muted underline"
                    >
                      Reset crop
                    </button>
                  </div>
                </div>
              </div>
            )}
            {dockTab === 'artworks' && (
              <ThumbStrip
                artworks={artworks}
                placedCount={placed.length}
                onAdd={addArtwork}
              />
            )}
            {dockTab === 'frames' && (
              <div>
                {!selected ? (
                  <p className="text-[12px] tracking-[0.14em] uppercase text-on-dock-muted py-2">
                    Select an artwork on the canvas to change its frame
                  </p>
                ) : (
                  <div>
                    <p className="text-[10px] tracking-[0.16em] uppercase text-on-dock-muted mb-3">
                      Frame preset
                    </p>
                    <div className="flex gap-3 flex-wrap">
                      {FRAME_STYLES.map(s => {
                        const preset = FRAME_PRESETS[s]
                        const isActive = selected.frame.style === s
                        return (
                          <button
                            key={s}
                            onClick={() => updateFrame(selected.id, { style: s })}
                            className={`flex flex-col items-center gap-1.5 p-2 rounded-md border transition-all ${
                              isActive
                                ? 'border-on-dock bg-white/10'
                                : 'border-white/10 hover:border-white/30'
                            }`}
                          >
                            <div
                              className="w-14 h-16 rounded-xs relative overflow-hidden"
                              style={{
                                background: s === 'none'
                                  ? 'repeating-conic-gradient(#4a4a46 0% 25%, #2a2a26 0% 50%) 50% / 12px 12px'
                                  : preset.borderColor,
                                padding: s === 'none' ? 0 : Math.max(4, preset.borderWidthPx / 2) + 'px',
                              }}
                            >
                              <div
                                className="w-full h-full"
                                style={{ background: preset.matteColor, opacity: s === 'none' ? 1 : 0.9 }}
                              />
                            </div>
                            <span className="text-[10px] tracking-[0.10em] uppercase text-on-dock-muted whitespace-nowrap">
                              {preset.label}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                    <div className="flex gap-6 mt-4 flex-wrap items-end">
                      <div className="min-w-[180px]">
                        <Slider
                          label={`Frame width: ${selected.frame.widthMm} mm`}
                          min={0}
                          max={80}
                          value={selected.frame.widthMm}
                          onChange={v => updateFrame(selected.id, { widthMm: v })}
                          disabled={selected.frame.style === 'none'}
                        />
                      </div>
                      <div className="min-w-[180px]">
                        <Slider
                          label={`Matte: ${selected.frame.matteMm} mm`}
                          min={0}
                          max={120}
                          value={selected.frame.matteMm}
                          onChange={v => updateFrame(selected.id, { matteMm: v })}
                        />
                      </div>
                      <div>
                        <p className="text-[10px] tracking-[0.14em] uppercase text-on-dock-muted mb-1.5">Matte color</p>
                        <div className="flex gap-1.5">
                          {MATTE_PALETTE.map(m => (
                            <button
                              key={m.value}
                              onClick={() => updatePlaced(selected.id, { matteColor: m.value })}
                              className={`w-7 h-7 rounded-xs border-2 ${
                                selected.matteColor === m.value ? 'border-on-dock' : 'border-white/20'
                              }`}
                              style={{ background: m.value }}
                              title={m.label}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {dockTab === 'advanced' && (
              <div className="flex flex-wrap gap-x-8 gap-y-3 items-end">
                {selected ? (
                  <>
                    <div className="min-w-[220px]">
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
                    </div>
                    <div className="min-w-[220px]">
                      <Slider
                        label={`Frame width: ${selected.frame.widthMm} mm`}
                        min={0}
                        max={80}
                        value={selected.frame.widthMm}
                        onChange={v => updateFrame(selected.id, { widthMm: v })}
                        disabled={selected.frame.style === 'none'}
                      />
                    </div>
                    <div className="min-w-[220px]">
                      <Slider
                        label={`Matte: ${selected.frame.matteMm} mm`}
                        min={0}
                        max={120}
                        value={selected.frame.matteMm}
                        onChange={v => updateFrame(selected.id, { matteMm: v })}
                      />
                    </div>
                    <div>
                      <p className="text-[11px] tracking-[0.14em] uppercase text-ink-muted mb-1">
                        Matte color
                      </p>
                      <div className="flex gap-1">
                        {MATTE_PALETTE.map(m => (
                          <button
                            key={m.value}
                            onClick={() => updatePlaced(selected.id, { matteColor: m.value })}
                            className={`w-7 h-7 border ${
                              selected.matteColor === m.value
                                ? 'ring-2 ring-ink border-ink'
                                : 'border-line'
                            }`}
                            style={{ background: m.value }}
                            title={m.label}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="min-w-[180px]">
                      <Slider
                        label={`Rotation: ${selected.rotation.toFixed(0)}°`}
                        min={-45}
                        max={45}
                        value={selected.rotation}
                        onChange={v => updatePlaced(selected.id, { rotation: v })}
                      />
                    </div>
                    <div className="min-w-[180px]">
                      <Slider
                        label={`Shadow opacity: ${(selected.shadowOpacity * 100).toFixed(0)}%`}
                        min={0}
                        max={1}
                        step={0.01}
                        value={selected.shadowOpacity}
                        onChange={v => updatePlaced(selected.id, { shadowOpacity: v })}
                      />
                    </div>
                    <div className="min-w-[180px]">
                      <Slider
                        label={`Shadow spread: ${selected.shadowSpread.toFixed(0)} px`}
                        min={0}
                        max={40}
                        step={1}
                        value={selected.shadowSpread}
                        onChange={v => updatePlaced(selected.id, { shadowSpread: v })}
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-[12px] text-ink-muted">
                    Click a placed artwork to edit. Frame style swatches appear directly under the selected piece.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {showRoomsModal && (
        <RoomsModal
          currentRoom={room}
          favorites={favorites}
          onPickRoom={r => {
            setRoom(r)
            setShowRoomsModal(false)
          }}
          onClose={() => setShowRoomsModal(false)}
          onToggleFavorite={user ? toggleFavorite : undefined}
        />
      )}
      {sequencePicker && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setSequencePicker(false)}
        >
          <div
            className="bg-paper max-w-[680px] w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-[11px] tracking-[0.20em] uppercase text-ink-muted mb-2">
              Create sequence
            </p>
            <h2 className="font-display text-[20px] mb-4">
              Pick up to 10 rooms — artwork(s) will move through them
            </h2>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {STOCK_ROOMS.map(r => {
                const on = sequencePicks.includes(r.id)
                const idx = sequencePicks.indexOf(r.id)
                return (
                  <button
                    key={r.id}
                    onClick={() => {
                      setSequencePicks(prev =>
                        prev.includes(r.id)
                          ? prev.filter(x => x !== r.id)
                          : prev.length >= 10
                            ? prev
                            : [...prev, r.id],
                      )
                    }}
                    className={`relative border ${on ? 'border-ink ring-2 ring-ink' : 'border-line'}`}
                    title={r.name}
                  >
                    <img src={r.thumb} alt={r.name} className="w-full aspect-[4/3] object-cover" />
                    {on && (
                      <span className="absolute top-1 right-1 bg-ink text-paper text-[10px] w-5 h-5 grid place-items-center">
                        {idx + 1}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="flex justify-between items-center">
              <p className="text-[12px] text-ink-muted">
                Selected {sequencePicks.length} / 10 — order = click order
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSequencePicker(false)}
                  className="px-3 py-2 text-[11px] tracking-[0.16em] uppercase border border-line"
                >
                  Cancel
                </button>
                <button
                  onClick={startSequence}
                  disabled={sequencePicks.length === 0}
                  className="px-3 py-2 text-[11px] tracking-[0.16em] uppercase bg-ink text-paper disabled:opacity-40"
                >
                  Start sequence
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RoomsModal({
  currentRoom,
  favorites,
  onPickRoom,
  onClose,
  onToggleFavorite,
}: {
  currentRoom: StockRoom
  favorites: Set<string>
  onPickRoom: (r: StockRoom) => void
  onClose: () => void
  onToggleFavorite?: (roomId: string) => void
}) {
  const [tab, setTab] = useState<'suggested' | 'favorites' | 'all'>('suggested')
  const suggested = useMemo(() => {
    return STOCK_ROOMS.filter(
      r =>
        r.id !== currentRoom.id &&
        (r.orientation === currentRoom.orientation ||
          r.perspective === currentRoom.perspective ||
          r.category === currentRoom.category),
    )
  }, [currentRoom])
  const list =
    tab === 'all' ? STOCK_ROOMS : tab === 'favorites' ? STOCK_ROOMS.filter(r => favorites.has(r.id)) : suggested

  // Escape close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rooms-modal-title"
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-paper rounded-md w-full max-w-[1100px] max-h-[88vh] overflow-y-auto shadow-pop"
        onClick={e => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 bg-paper border-b border-line px-6 h-14 flex items-center gap-4">
          <p id="rooms-modal-title" className="text-meta uppercase text-ink-muted">
            Room mockups
          </p>
          <div className="flex gap-1 bg-surface rounded-full p-1">
            {(['suggested', 'favorites', 'all'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`h-7 px-3 text-[11px] tracking-[0.14em] uppercase rounded-full transition-colors ease-snap ${
                  tab === t ? 'bg-ink text-paper' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {t === 'suggested' && `Suggested · ${suggested.length}`}
                {t === 'favorites' && `Favorites · ${favorites.size}`}
                {t === 'all' && `All · ${STOCK_ROOMS.length}`}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-auto grid place-items-center w-9 h-9 text-ink-muted hover:text-ink rounded-full hover:bg-line/40"
          >
            <X size={16} />
          </button>
        </header>
        <div className="p-6">
          {!list.length && (
            <div className="py-16 text-center">
              <p className="text-[12px] text-ink-muted">
                {tab === 'favorites'
                  ? 'No favorites yet — tap the heart on any room to save it here.'
                  : 'No rooms match.'}
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {list.map(r => (
              <div key={r.id} className="relative group">
                <button
                  onClick={() => onPickRoom(r)}
                  className={`block w-full bg-paper rounded-md overflow-hidden border transition-all ease-snap hover:shadow-card hover:-translate-y-0.5 ${
                    r.id === currentRoom.id ? 'border-accent ring-2 ring-accent' : 'border-line'
                  }`}
                  title={r.name}
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-line/40">
                    <img
                      src={r.thumb}
                      alt={r.name}
                      className="w-full h-full object-cover transition-transform duration-300 ease-snap group-hover:scale-[1.04]"
                    />
                    {r.smart && (
                      <span className="absolute top-2 left-2 text-[9px] tracking-[0.16em] uppercase bg-accent text-paper px-1.5 py-0.5 rounded-xs">
                        Smart
                      </span>
                    )}
                  </div>
                  <p className="px-3 py-2 text-[12px] text-left truncate">{r.name}</p>
                </button>
                {onToggleFavorite && (
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      onToggleFavorite(r.id)
                    }}
                    aria-label={favorites.has(r.id) ? 'Unfavorite' : 'Favorite'}
                    className="absolute top-2 right-2 w-9 h-9 grid place-items-center bg-paper/90 backdrop-blur rounded-full hover:bg-paper transition-colors"
                  >
                    <Heart
                      size={14}
                      fill={favorites.has(r.id) ? '#e11d48' : 'transparent'}
                      stroke={favorites.has(r.id) ? '#e11d48' : '#475569'}
                    />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function BCSSliders({ bcs, onChange }: { bcs: BCS; onChange: (b: BCS) => void }) {
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-3 items-end">
      <div className="min-w-[220px]">
        <Slider
          label={`Brightness: ${bcs.brightness}`}
          min={0}
          max={200}
          step={1}
          value={bcs.brightness}
          onChange={v => onChange({ ...bcs, brightness: v })}
        />
      </div>
      <div className="min-w-[220px]">
        <Slider
          label={`Contrast: ${bcs.contrast}`}
          min={0}
          max={200}
          step={1}
          value={bcs.contrast}
          onChange={v => onChange({ ...bcs, contrast: v })}
        />
      </div>
      <div className="min-w-[220px]">
        <Slider
          label={`Saturation: ${bcs.saturation}`}
          min={0}
          max={200}
          step={1}
          value={bcs.saturation}
          onChange={v => onChange({ ...bcs, saturation: v })}
        />
      </div>
    </div>
  )
}

function ThumbStrip({
  artworks,
  placedCount,
  onAdd,
}: {
  artworks: Artwork[]
  placedCount: number
  onAdd: (a: Artwork) => void
}) {
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return artworks.slice(0, 200)
    return artworks
      .filter(a =>
        [a.title, a.artist, a.medium, a.collection]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 2000)
  }, [artworks, q])

  return (
    <div className="border-t border-line pt-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-[11px] tracking-[0.18em] uppercase text-ink-muted">
          Click to add — {filtered.length} of {artworks.length} · {placedCount} on wall
        </p>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search title / artist…"
          className="border border-line px-2 py-1 text-[12px] w-48"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {filtered.map(a => (
          <button
            key={a.id}
            onClick={() => onAdd(a)}
            title={`${a.title}${a.artist ? ' — ' + a.artist : ''}`}
            className="shrink-0 w-20 h-20 border border-line bg-paper hover:border-ink overflow-hidden relative"
          >
            {a.thumb || a.image ? (
              <img
                src={a.thumb || a.image || ''}
                alt={a.title}
                loading="lazy"
                className="w-full h-full object-cover"
                onError={e => {
                  const t = e.currentTarget
                  t.style.display = 'none'
                  const parent = t.parentElement
                  if (parent && !parent.querySelector('.fb')) {
                    const span = document.createElement('span')
                    span.className = 'fb absolute inset-0 grid place-items-center text-[9px] text-ink-muted px-1 text-center'
                    span.textContent = a.title.slice(0, 20)
                    parent.appendChild(span)
                  }
                }}
              />
            ) : (
              <span className="text-[10px] text-ink-muted">{a.title}</span>
            )}
          </button>
        ))}
      </div>
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
  step,
  value,
  onChange,
  disabled,
}: {
  label: string
  min: number
  max: number
  step?: number
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
        step={step ?? 1}
        value={value}
        disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
  )
}
