'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Save, Plus } from 'lucide-react'
import { useStore } from '@/store'
import { ARTWORKS } from '@/lib/artworks'
import { Artwork, WallLayer } from '@/types'

export default function MyWallViewer() {
  const { myWallOpen, myWallInitArtwork, closeMyWall, showToast } = useStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef   = useRef<HTMLDivElement>(null)

  // Photo + layers state
  const photoRef    = useRef<HTMLImageElement | null>(null)
  const [layers, setLayers]     = useState<WallLayer[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [nextId, setNextId]     = useState(0)
  const [hasPhoto, setHasPhoto] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  // Drag state (refs to avoid stale closure issues)
  const dragging  = useRef(false)
  const dragOff   = useRef({ x: 0, y: 0 })
  const pinchDist = useRef(0)
  const pinchSize = useRef({ w: 0, h: 0 })
  const activeIdRef = useRef<number | null>(null)

  useEffect(() => { activeIdRef.current = activeId }, [activeId])

  // Redraw whenever layers or photo changes
  const redraw = useCallback((lrs: WallLayer[], photo: HTMLImageElement | null) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (photo) ctx.drawImage(photo, 0, 0, canvas.width, canvas.height)
    lrs.forEach(l => {
      const fw = Math.max(6, l.w * 0.04)
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 20
      ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 10
      ctx.fillStyle = '#1a0e06'
      ctx.fillRect(l.x - fw, l.y - fw, l.w + fw * 2, l.h + fw * 2)
      ctx.restore()
      if (l.img?.complete && l.img.naturalWidth) ctx.drawImage(l.img, l.x, l.y, l.w, l.h)
      else { ctx.fillStyle = '#888'; ctx.fillRect(l.x, l.y, l.w, l.h) }
      if (l.id === activeIdRef.current) {
        ctx.strokeStyle = 'rgba(200,169,110,.8)'
        ctx.lineWidth = Math.max(2, l.w * 0.008)
        ctx.setLineDash([6, 4]); ctx.strokeRect(l.x, l.y, l.w, l.h); ctx.setLineDash([])
      }
    })
  }, [])

  // Sync redraw when layers/activeId change
  useEffect(() => { redraw(layers, photoRef.current) }, [layers, activeId, redraw])

  // Reset when overlay closes
  useEffect(() => {
    if (!myWallOpen) {
      photoRef.current = null; setLayers([]); setNextId(0); setActiveId(null)
      setHasPhoto(false); setShowPicker(false)
    }
  }, [myWallOpen])

  // Auto-add initArtwork after photo is picked
  const pendingArtwork = useRef<Artwork | null>(null)
  useEffect(() => { pendingArtwork.current = myWallInitArtwork }, [myWallInitArtwork])

  async function handleFile(file: File | undefined) {
    if (!file) return
    const photo = new Image()
    photo.src = URL.createObjectURL(file)
    await new Promise<void>(r => { photo.onload = () => r() })
    photoRef.current = photo

    const canvas = canvasRef.current
    const wrap   = wrapRef.current
    if (!canvas || !wrap) return

    // Full resolution buffer (fixes quality degradation)
    canvas.width  = photo.width
    canvas.height = photo.height
    const maxW = wrap.clientWidth  - 24
    const maxH = wrap.clientHeight - 80
    const ds   = Math.min(1, maxW / photo.width, maxH / photo.height)
    canvas.style.width  = Math.round(photo.width  * ds) + 'px'
    canvas.style.height = Math.round(photo.height * ds) + 'px'

    setHasPhoto(true)
    if (pendingArtwork.current) {
      await addLayer(pendingArtwork.current, [])
      pendingArtwork.current = null
    } else {
      redraw([], photo)
    }
  }

  async function addLayer(aw: Artwork, currentLayers: WallLayer[]) {
    if (currentLayers.length >= 6) { showToast('Max 6 artworks'); return }
    let img: HTMLImageElement | null = null
    const src = aw.image || aw.thumb
    if (src) {
      const i = new Image(); i.crossOrigin = 'anonymous'; i.referrerPolicy = 'no-referrer'
      i.src = src
      await new Promise<void>(r => { i.onload = () => r(); i.onerror = () => r() })
      img = i.complete && i.naturalWidth ? i : null
    }
    const canvas = canvasRef.current!
    const initW  = canvas.width * 0.35
    const aspect = (aw.heightCm || 60) / (aw.widthCm || 80)
    const id     = nextId
    const newLayer: WallLayer = {
      id, aw, img,
      x: (canvas.width  - initW) / 2,
      y: (canvas.height - initW * aspect) / 2,
      w: initW, h: initW * aspect,
    }
    setNextId(n => n + 1)
    setLayers(prev => { const next = [...prev, newLayer]; redraw(next, photoRef.current); return next })
    setActiveId(id)
    setShowPicker(false)
  }

  function canvasXY(e: PointerEvent | TouchEvent): { x: number, y: number } {
    const canvas = canvasRef.current!
    const r  = canvas.getBoundingClientRect()
    const sx = canvas.width  / r.width
    const sy = canvas.height / r.height
    const src = 'touches' in e ? e.touches[0] : e
    return { x: (src.clientX - r.left) * sx, y: (src.clientY - r.top) * sy }
  }

  function hitLayer(x: number, y: number): WallLayer | null {
    for (let i = layers.length - 1; i >= 0; i--) {
      const l = layers[i]
      if (x >= l.x && x <= l.x + l.w && y >= l.y && y <= l.y + l.h) return l
    }
    return null
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (showPicker) { setShowPicker(false); return }
    const { x, y } = canvasXY(e.nativeEvent)
    const hit = hitLayer(x, y)
    if (!hit) return
    setActiveId(hit.id)
    dragging.current = true
    dragOff.current = { x: x - hit.x, y: y - hit.y }
    canvasRef.current!.setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragging.current) return
    const { x, y } = canvasXY(e.nativeEvent)
    const canvas = canvasRef.current!
    setLayers(prev => {
      const next = prev.map(l => {
        if (l.id !== activeIdRef.current) return l
        return {
          ...l,
          x: Math.max(0, Math.min(canvas.width  - l.w, x - dragOff.current.x)),
          y: Math.max(0, Math.min(canvas.height - l.h, y - dragOff.current.y)),
        }
      })
      redraw(next, photoRef.current)
      return next
    })
  }

  function handlePointerUp() { dragging.current = false }

  function handleTouchStart(e: React.TouchEvent<HTMLCanvasElement>) {
    if (e.touches.length !== 2) return
    const t = e.touches
    pinchDist.current = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
    const l = layers.find(l => l.id === activeIdRef.current)
    if (l) pinchSize.current = { w: l.w, h: l.h }
  }

  function handleTouchMove(e: React.TouchEvent<HTMLCanvasElement>) {
    if (e.touches.length !== 2 || pinchDist.current === 0) return
    e.preventDefault()
    const t = e.touches
    const dist  = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
    const scale = Math.max(0.2, Math.min(5, dist / pinchDist.current))
    setLayers(prev => {
      const next = prev.map(l => {
        if (l.id !== activeIdRef.current) return l
        const cx = l.x + l.w / 2, cy = l.y + l.h / 2
        const nw = pinchSize.current.w * scale, nh = pinchSize.current.h * scale
        return { ...l, w: nw, h: nh, x: cx - nw / 2, y: cy - nh / 2 }
      })
      redraw(next, photoRef.current); return next
    })
  }

  function handleWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.08 : 0.93
    setLayers(prev => {
      const next = prev.map(l => {
        if (l.id !== activeIdRef.current) return l
        const cx = l.x + l.w / 2, cy = l.y + l.h / 2
        const nw = Math.max(30, l.w * factor), nh = Math.max(30, l.h * factor)
        return { ...l, w: nw, h: nh, x: cx - nw / 2, y: cy - nh / 2 }
      })
      redraw(next, photoRef.current); return next
    })
  }

  function save() {
    const canvas = canvasRef.current!
    const clean = document.createElement('canvas')
    clean.width = canvas.width; clean.height = canvas.height
    const ctx = clean.getContext('2d')!
    if (photoRef.current) ctx.drawImage(photoRef.current, 0, 0, clean.width, clean.height)
    layers.forEach(l => {
      const fw = Math.max(6, l.w * 0.04)
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 20
      ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 10; ctx.fillStyle = '#1a0e06'
      ctx.fillRect(l.x - fw, l.y - fw, l.w + fw * 2, l.h + fw * 2); ctx.restore()
      if (l.img?.complete && l.img.naturalWidth) ctx.drawImage(l.img, l.x, l.y, l.w, l.h)
    })
    const link = document.createElement('a')
    link.download = 'artpiq-mywall.jpg'
    link.href = clean.toDataURL('image/jpeg', 0.92)
    link.click()
    showToast('Image saved!')
  }

  return (
    <AnimatePresence>
      {myWallOpen && (
        <motion.div
          className="fixed inset-0 z-[300] bg-black flex flex-col"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          {/* Top bar */}
          <div className="px-4 py-3 flex items-center gap-2.5 bg-black/80 backdrop-blur-lg border-b border-[--border] flex-shrink-0">
            <h3 className="flex-1 text-[14px] font-semibold">📸 My Wall</h3>
            {hasPhoto && (
              <button
                onClick={() => setShowPicker(p => !p)}
                className="bg-white/12 border-none text-white px-3.5 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer flex items-center gap-1"
              >
                <Plus size={13} /> Add
              </button>
            )}
            {hasPhoto && (
              <button
                onClick={save}
                className="bg-white/12 border-none text-white px-3.5 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer flex items-center gap-1"
              >
                <Save size={13} /> Save
              </button>
            )}
            <button
              onClick={closeMyWall}
              className="bg-white/12 border-none text-white px-3.5 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer flex items-center gap-1"
            >
              <X size={13} /> Close
            </button>
          </div>

          {/* Canvas area */}
          <div ref={wrapRef} className="flex-1 flex items-center justify-center p-3 overflow-hidden relative">
            {!hasPhoto ? (
              <UploadPrompt onFile={handleFile} />
            ) : (
              <canvas
                ref={canvasRef}
                style={{ display: 'block', borderRadius: 10, touchAction: 'none', cursor: 'crosshair' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onTouchStart={handleTouchStart as unknown as React.TouchEventHandler}
                onTouchMove={handleTouchMove as unknown as React.TouchEventHandler}
                onWheel={handleWheel}
              />
            )}

            {/* Artwork picker panel */}
            <AnimatePresence>
              {showPicker && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 bg-[--s1] rounded-t-xl p-3.5 max-h-[55%] overflow-y-auto z-10"
                  initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                >
                  <div className="text-[13px] font-bold mb-2.5">Add artwork to wall</div>
                  <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))' }}>
                    {ARTWORKS.filter(a => a.type === 'painting').map(aw => (
                      <div
                        key={aw.id}
                        onClick={() => addLayer(aw, layers)}
                        className="cursor-pointer rounded-lg overflow-hidden border-2 border-transparent hover:border-[--accent] transition-colors bg-[--s2]"
                      >
                        {aw.thumb && (
                          <img src={aw.thumb} alt={aw.title} referrerPolicy="no-referrer-when-downgrade"
                            className="w-full aspect-[4/3] object-cover block" />
                        )}
                        <div className="text-[9px] p-1 text-center text-[--muted] overflow-hidden text-ellipsis whitespace-nowrap">{aw.title}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Layer strip */}
          {hasPhoto && layers.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto px-3.5 py-2 bg-black/85 border-t border-[--border] flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
              {layers.map(l => (
                <div key={l.id} className="relative flex-shrink-0 cursor-pointer" onClick={() => setActiveId(l.id)}>
                  {l.img ? (
                    <img
                      src={l.aw.image || l.aw.thumb || ''}
                      alt={l.aw.title}
                      referrerPolicy="no-referrer-when-downgrade"
                      className={`w-12 h-12 rounded-lg object-cover border-2 ${l.id === activeId ? 'border-[--accent] shadow-[0_0_0_2px_var(--accent)]' : 'border-white/20'}`}
                    />
                  ) : (
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl bg-[#222] border-2 ${l.id === activeId ? 'border-[--accent]' : 'border-white/20'}`}>🎨</div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setLayers(prev => { const next = prev.filter(x => x.id !== l.id); redraw(next, photoRef.current); return next }); if (activeId === l.id) setActiveId(null) }}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/90 border-none text-white text-[9px] flex items-center justify-center cursor-pointer z-10"
                  >✕</button>
                </div>
              ))}
              <button
                onClick={() => setShowPicker(true)}
                className="flex-shrink-0 w-12 h-12 rounded-lg border-2 border-dashed border-white/35 bg-transparent text-white text-xl flex items-center justify-center cursor-pointer"
              >+</button>
            </div>
          )}

          {/* Footer hint */}
          {hasPhoto && (
            <div className="py-3 px-4 bg-black/80 border-t border-[--border] text-center text-[12px] text-[--muted] flex-shrink-0">
              ☝️ Tap artwork to select · Drag to move · 🤏 Pinch to resize
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function UploadPrompt({ onFile }: { onFile: (f: File | undefined) => void }) {
  const cameraRef  = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col items-center justify-center gap-3 h-full text-[--muted]">
      <div className="text-5xl">📷</div>
      <p className="text-[13px] text-center max-w-[220px]">Take or upload a photo of your wall to try artworks on it</p>
      <div className="flex gap-2.5 flex-wrap justify-center">
        <button
          onClick={() => cameraRef.current?.click()}
          className="bg-[--accent] border-none text-[#0c0c0c] px-7 py-3.5 rounded-xl text-[15px] font-bold cursor-pointer"
        >📷 Take Photo</button>
        <button
          onClick={() => galleryRef.current?.click()}
          className="bg-[--s2] border border-[--border] text-[--text] px-7 py-3.5 rounded-xl text-[15px] font-bold cursor-pointer"
        >🖼 From Gallery</button>
      </div>
      <p className="text-[12px]">Camera or any image from your library</p>
      <input ref={cameraRef}  type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { onFile(e.target.files?.[0]); e.target.value = '' }} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden"
        onChange={e => { onFile(e.target.files?.[0]); e.target.value = '' }} />
    </div>
  )
}
