'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Download, Plus } from 'lucide-react'
import { useStore } from '@/store'
import { loadImage } from '@/lib/image/loadImage'
import { decodeBitmap, normalizeToBlob } from '@/lib/image/decode'
import { STORAGE_KEY, loadStored, saveStored } from './myWall/storage'
import EmptyState from './myWall/EmptyState'
import LayerNode from './myWall/LayerNode'
import type { Artwork, WallLayer } from '@/types'

export default function MyWall() {
  const { artworks, myWallOpen, myWallArtworkIds, closeMyWall, showToast } = useStore()
  const byId = useMemo(() => new Map(artworks.map(a => [a.id, a])), [artworks])

  const stageRef = useRef<HTMLDivElement>(null)
  const [bgBlob, setBgBlob] = useState<Blob | null>(null)
  const [bgUrl, setBgUrl] = useState<string | null>(null)
  const [bgNatural, setBgNatural] = useState<{ w: number; h: number }>({ w: 0, h: 0 })
  const bgAspect = bgNatural.w && bgNatural.h ? bgNatural.w / bgNatural.h : 3 / 4
  const [layers, setLayers] = useState<WallLayer[]>([])
  const [nextId, setNextId] = useState(0)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [loading, setLoading] = useState(false)
  // True-cm scaling: user tells us how wide (cm) of wall is visible in their photo.
  // Without this we cannot place artworks at real scale; default 300 cm = ~3 m wall.
  const [wallWidthCm, setWallWidthCm] = useState<number>(300)

  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [stageW, setStageW] = useState(0)

  useEffect(() => {
    const update = () => setStageW(stageRef.current?.clientWidth ?? 0)
    update()
    const ro = new ResizeObserver(update)
    if (stageRef.current) ro.observe(stageRef.current)
    return () => ro.disconnect()
  }, [bgUrl])

  const pxPerCm = stageW > 0 && wallWidthCm > 0 ? stageW / wallWidthCm : null

  const paintings = useMemo(() => artworks.filter(a => a.type === 'painting'), [artworks])

  // Restore layers (only) from localStorage on open. Bg photo is per-session.
  useEffect(() => {
    if (!myWallOpen) return
    const stored = loadStored()
    if (stored) {
      setLayers(stored.layers ?? [])
      setNextId(stored.nextId ?? 0)
    }
  }, [myWallOpen])

  // Revoke blob URL when bg changes / unmounts to avoid leaks.
  useEffect(() => {
    return () => { if (bgUrl) URL.revokeObjectURL(bgUrl) }
  }, [bgUrl])

  useEffect(() => {
    if (!myWallOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMyWall() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [myWallOpen, closeMyWall])

  // Seed layers from openMyWall(ids)
  useEffect(() => {
    if (!myWallOpen || !bgUrl || !myWallArtworkIds.length) return
    const existingIds = new Set(layers.map(l => l.artworkId))
    const toAdd = myWallArtworkIds.filter(id => !existingIds.has(id))
    if (!toAdd.length) return
    let id = nextId
    const extras: WallLayer[] = toAdd.map((aid, i) => ({
      id: id++,
      artworkId: aid,
      x: (i - (toAdd.length - 1) / 2) * 120,
      y: 0,
      scale: 1,
      rotation: 0,
    }))
    setLayers(prev => [...prev, ...extras])
    setNextId(id)
    setActiveId(extras[extras.length - 1]?.id ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myWallOpen, bgUrl, myWallArtworkIds])

  // Persist layout (layers only — bg photo stays in memory)
  useEffect(() => {
    if (!myWallOpen) return
    saveStored({ layers, nextId })
  }, [layers, nextId, myWallOpen])

  // Reset transient state on close
  useEffect(() => {
    if (!myWallOpen) {
      setShowPicker(false)
      setActiveId(null)
    }
  }, [myWallOpen])

  async function onFile(file: File | undefined) {
    if (!file) return
    setLoading(true)
    try {
      const blob = await normalizeToBlob(file)
      const decoded = await decodeBitmap(blob)
      // Replace any prior bg URL atomically.
      if (bgUrl) URL.revokeObjectURL(bgUrl)
      setBgBlob(blob)
      setBgUrl(decoded.url)
      setBgNatural({ w: decoded.width, h: decoded.height })
    } catch (e) {
      console.error('[MyWall] photo load failed', e)
      showToast(e instanceof Error && e.message.includes('HEIC')
        ? 'HEIC convert failed — try JPEG'
        : 'Could not read photo. Try again.')
    } finally {
      setLoading(false)
    }
  }

  // Open the file picker. Pre-clear input.value so iOS Safari fires `change`
  // even when the user re-picks the same source after a previous attempt.
  function openPicker(which: 'camera' | 'gallery') {
    const el = which === 'camera' ? cameraRef.current : galleryRef.current
    if (!el) return
    el.value = ''
    el.click()
  }

  function addArtwork(aw: Artwork) {
    if (layers.length >= 8) { showToast('Maximum eight works'); return }
    setLayers(prev => [...prev, {
      id: nextId,
      artworkId: aw.id,
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
    }])
    setActiveId(nextId)
    setNextId(n => n + 1)
    setShowPicker(false)
  }

  function updateLayer(id: number, patch: Partial<WallLayer>) {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))
  }

  function removeLayer(id: number) {
    setLayers(prev => prev.filter(l => l.id !== id))
    if (activeId === id) setActiveId(null)
  }

  function duplicateLayer(id: number) {
    const l = layers.find(x => x.id === id)
    if (!l) return
    setLayers(prev => [...prev, { ...l, id: nextId, x: l.x + 30, y: l.y + 30 }])
    setActiveId(nextId)
    setNextId(n => n + 1)
  }

  function bringToFront(id: number) {
    setLayers(prev => {
      const l = prev.find(x => x.id === id)
      if (!l) return prev
      return [...prev.filter(x => x.id !== id), l]
    })
  }

  function resetAll() {
    if (bgUrl) URL.revokeObjectURL(bgUrl)
    setBgBlob(null); setBgUrl(null); setBgNatural({ w: 0, h: 0 })
    setLayers([]); setNextId(0); setActiveId(null)
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  async function exportImage() {
    const stage = stageRef.current
    if (!stage || !bgBlob) return
    showToast('Composing image…')

    // Decode bg fresh at native resolution (with EXIF orientation).
    let bgSource: CanvasImageSource
    let targetW: number
    let targetH: number
    try {
      const decoded = await decodeBitmap(bgBlob)
      targetW = decoded.width
      targetH = decoded.height
      bgSource = decoded.bitmap ?? await loadImage(decoded.url)
    } catch (e) {
      console.error('[MyWall] export bg decode failed', e)
      showToast('Export failed. Re-pick photo.')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')!
    // High-quality resampling for any incidental scaling done downstream.
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bgSource, 0, 0, targetW, targetH)

    // Convert on-screen coords to canvas coords.
    const rect = stage.getBoundingClientRect()
    const sx = targetW / rect.width
    const sy = targetH / rect.height
    const cx0 = rect.width / 2
    const cy0 = rect.height / 2

    for (const l of layers) {
      const aw = byId.get(l.artworkId)
      const src = aw?.image || aw?.thumb
      if (!src) continue
      let img: HTMLImageElement
      try { img = await loadImage(src, { cors: true }) } catch { continue }

      // True-scale: artwork.widthCm * px-per-cm derived from user's wall width.
      const baseW = pxPerCm && aw!.widthCm > 0
        ? aw!.widthCm * pxPerCm
        : Math.min(rect.width * 0.35, 260)
      const aspect = (aw!.heightCm || 60) / (aw!.widthCm || 80)
      const w = baseW * l.scale
      const h = w * aspect

      const cx = (cx0 + l.x) * sx
      const cy = (cy0 + l.y) * sy
      const dw = w * sx
      const dh = h * sy

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate((l.rotation * Math.PI) / 180)
      // Frame shadow
      ctx.shadowColor = 'rgba(15,23,42,0.18)'
      ctx.shadowBlur = 18 * sx
      ctx.shadowOffsetY = 8 * sy
      // Light frame (matches minimal UI)
      const fw = Math.max(6, dw * 0.03)
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(-dw / 2 - fw, -dh / 2 - fw, dw + fw * 2, dh + fw * 2)
      ctx.shadowColor = 'transparent'
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh)
      ctx.restore()
    }

    const blob: Blob = await new Promise((res) => canvas.toBlob(b => res(b!), 'image/jpeg', 0.92))

    // Filename prompt — default name_artist_01 from first layer if available.
    const slug = (s: string) =>
      (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    const firstLayer = layers[0]
    const firstAw = firstLayer ? byId.get(firstLayer.artworkId) : null
    const def = firstAw
      ? `${slug(firstAw.title) || 'artwork'}_${slug(firstAw.artist) || 'artist'}_01`
      : 'my-wall'
    const name = (typeof window !== 'undefined' ? window.prompt('Image filename (without .jpg)', def) : def) || def

    const file = new File([blob], `${name}.jpg`, { type: 'image/jpeg' })
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
    if (nav.canShare?.({ files: [file] }) && navigator.share) {
      try { await navigator.share({ files: [file], title: name }); return } catch {}
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${name}.jpg`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  if (!myWallOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[300] bg-paper flex flex-col"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center h-[56px] px-5 md:px-10 border-b border-line flex-shrink-0 gap-2">
          <p className="text-[11px] tracking-[0.18em] uppercase text-ink-muted flex-1">My Wall</p>
          {bgUrl && (
            <label className="hidden sm:flex items-center gap-1.5 text-[11px] tracking-[0.14em] uppercase text-ink-muted">
              Wall width
              <input
                type="number"
                min={50}
                max={2000}
                step={10}
                value={wallWidthCm}
                onChange={e => setWallWidthCm(Number(e.target.value) || 300)}
                className="w-16 h-8 px-2 border border-line text-ink text-[12px] tabular-nums"
                title="Real wall width visible in your photo (cm). Drives true-scale artwork sizing."
              />
              cm
            </label>
          )}
          {bgUrl && (
            <button
              onClick={resetAll}
              className="hidden sm:inline-block h-9 px-3 text-[12px] text-ink-muted hover:text-ink"
            >
              Start over
            </button>
          )}
          {bgUrl && (
            <button
              onClick={exportImage}
              className="h-9 px-3 text-[12px] bg-ink text-paper flex items-center gap-2"
            >
              <Download size={14} /> Save
            </button>
          )}
          <button
            onClick={closeMyWall}
            className="h-10 w-10 border border-line flex items-center justify-center hover:border-ink"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {!bgUrl ? (
          <EmptyState
            onCamera={() => openPicker('camera')}
            onGallery={() => openPicker('gallery')}
            loading={loading}
          />
        ) : (
          <div
            className="relative flex-1 overflow-hidden bg-obsidian flex items-center justify-center"
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) setActiveId(null)
            }}
          >
            <div
              ref={stageRef}
              className="relative max-w-full max-h-full"
              style={{ aspectRatio: `${bgAspect}`, width: bgAspect >= 1 ? '100%' : 'auto', height: bgAspect >= 1 ? 'auto' : '100%' }}
              onPointerDown={(e) => {
                if (e.target === e.currentTarget) setActiveId(null)
              }}
            >
              <img
                src={bgUrl ?? ''}
                alt=""
                draggable={false}
                className="absolute inset-0 w-full h-full object-fill select-none pointer-events-none"
              />

            {layers.map(l => {
              const aw = byId.get(l.artworkId)
              if (!aw) return null
              return (
                <LayerNode
                  key={l.id}
                  layer={l}
                  artwork={aw}
                  active={activeId === l.id}
                  pxPerCm={pxPerCm}
                  onSelect={() => { setActiveId(l.id); bringToFront(l.id) }}
                  onChange={(p) => updateLayer(l.id, p)}
                  onRemove={() => removeLayer(l.id)}
                  onDuplicate={() => duplicateLayer(l.id)}
                  onBringToFront={() => bringToFront(l.id)}
                />
              )
            })}
            </div>
          </div>
        )}

        {bgUrl && (
          <div className="flex-shrink-0 border-t border-line bg-paper">
            <div className="flex items-center gap-3 px-5 md:px-10 py-4 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setShowPicker(true)}
                className="flex-shrink-0 h-12 px-4 border border-line text-[12px] flex items-center gap-2 hover:border-ink"
              >
                <Plus size={14} /> Add artwork
              </button>
              {layers.map(l => {
                const aw = byId.get(l.artworkId)
                if (!aw) return null
                return (
                  <button
                    key={l.id}
                    onClick={() => setActiveId(l.id)}
                    className={`flex-shrink-0 w-12 h-12 overflow-hidden border-2 transition-colors ${
                      activeId === l.id ? 'border-accent' : 'border-line'
                    }`}
                  >
                    {aw.thumb && (
                      <img src={aw.thumb} alt={aw.title}
                        referrerPolicy="no-referrer-when-downgrade"
                        className="w-full h-full object-cover" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <AnimatePresence>
          {showPicker && (
            <motion.div
              className="fixed inset-0 z-10 bg-ink/40"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowPicker(false)}
            >
              <motion.div
                className="absolute bottom-0 left-0 right-0 bg-paper border-t border-line p-6 md:p-10"
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
                onClick={e => e.stopPropagation()}
              >
                <div className="max-w-content mx-auto">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-display text-[24px]">Add a painting</h3>
                    <button onClick={() => setShowPicker(false)} className="h-9 w-9 flex items-center justify-center">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4 max-h-[50vh] overflow-y-auto">
                    {paintings.map(aw => (
                      <button
                        key={aw.id}
                        onClick={() => addArtwork(aw)}
                        className="text-left group"
                      >
                        <div className="aspect-[3/4] bg-surface border border-line overflow-hidden">
                          {aw.thumb && (
                            <img src={aw.thumb} alt={aw.title}
                              referrerPolicy="no-referrer-when-downgrade"
                              className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]" />
                          )}
                        </div>
                        <p className="mt-2 text-[11px] leading-tight text-ink line-clamp-2">{aw.title}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <input ref={cameraRef} type="file" accept="image/*,.heic,.heif" capture="environment"
          className="hidden" onChange={e => { onFile(e.target.files?.[0]); e.target.value = '' }} />
        <input ref={galleryRef} type="file" accept="image/*,.heic,.heif"
          className="hidden" onChange={e => { onFile(e.target.files?.[0]); e.target.value = '' }} />
      </motion.div>
    </AnimatePresence>
  )
}
