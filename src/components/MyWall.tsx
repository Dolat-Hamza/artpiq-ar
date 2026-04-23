'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Camera, ImagePlus, Download, Trash2, Copy, ArrowUp, Plus } from 'lucide-react'
import { useGesture } from '@use-gesture/react'
import { useStore } from '@/store'
import { ARTWORKS } from '@/lib/artworks'
import type { Artwork, WallLayer } from '@/types'

const STORAGE_KEY = 'myWall:v1'

interface StoredState {
  bgDataUrl: string | null
  layers: WallLayer[]
  nextId: number
}

function loadStored(): StoredState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredState
  } catch { return null }
}

function saveStored(s: StoredState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch {}
}

async function readFileAsImage(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || name.endsWith('.heic') || name.endsWith('.heif')
  if (isHeic) {
    const mod = await import('heic2any')
    const blob = await mod.default({ blob: file, toType: 'image/jpeg', quality: 0.9 })
    const out = Array.isArray(blob) ? blob[0] : blob
    return URL.createObjectURL(out)
  }
  return URL.createObjectURL(file)
}

async function dataUrlFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || name.endsWith('.heic') || name.endsWith('.heif')
  let blob: Blob = file
  if (isHeic) {
    const mod = await import('heic2any')
    const out = await mod.default({ blob: file, toType: 'image/jpeg', quality: 0.9 })
    blob = Array.isArray(out) ? out[0] : out
  }
  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}

export default function MyWall() {
  const { myWallOpen, myWallArtworkIds, closeMyWall, showToast } = useStore()

  const stageRef = useRef<HTMLDivElement>(null)
  const [bgUrl, setBgUrl] = useState<string | null>(null)
  const [bgAspect, setBgAspect] = useState<number>(3 / 4)
  const [layers, setLayers] = useState<WallLayer[]>([])
  const [nextId, setNextId] = useState(0)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [loading, setLoading] = useState(false)

  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const paintings = useMemo(() => ARTWORKS.filter(a => a.type === 'painting'), [])

  // Restore from localStorage on open
  useEffect(() => {
    if (!myWallOpen) return
    const stored = loadStored()
    if (stored && stored.bgDataUrl) {
      setBgUrl(stored.bgDataUrl)
      const img = new Image()
      img.onload = () => setBgAspect(img.width / img.height)
      img.src = stored.bgDataUrl
      setLayers(stored.layers ?? [])
      setNextId(stored.nextId ?? 0)
    }
  }, [myWallOpen])

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

  // Persist on change
  useEffect(() => {
    if (!myWallOpen) return
    saveStored({ bgDataUrl: bgUrl, layers, nextId })
  }, [bgUrl, layers, nextId, myWallOpen])

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
      const dataUrl = await dataUrlFromFile(file)
      const img = new Image()
      img.onload = () => {
        setBgAspect(img.width / img.height)
        setBgUrl(dataUrl)
        setLoading(false)
      }
      img.onerror = () => { setLoading(false); showToast('Could not read image') }
      img.src = dataUrl
    } catch {
      setLoading(false)
      showToast('Could not convert image')
    }
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
    setBgUrl(null); setLayers([]); setNextId(0); setActiveId(null)
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  async function exportImage() {
    const stage = stageRef.current
    if (!stage || !bgUrl) return
    showToast('Composing image…')

    const bgImg = await loadImg(bgUrl)
    const targetW = Math.min(2400, bgImg.naturalWidth)
    const scale = targetW / bgImg.naturalWidth
    const targetH = Math.round(bgImg.naturalHeight * scale)

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bgImg, 0, 0, targetW, targetH)

    // Convert on-screen coords to canvas coords.
    const rect = stage.getBoundingClientRect()
    const sx = targetW / rect.width
    const sy = targetH / rect.height
    const cx0 = rect.width / 2
    const cy0 = rect.height / 2

    for (const l of layers) {
      const aw = ARTWORKS.find(a => a.id === l.artworkId)
      const src = aw?.image || aw?.thumb
      if (!src) continue
      let img: HTMLImageElement
      try { img = await loadImg(src, true) } catch { continue }

      // Base on-screen width for painting (see LayerNode).
      const baseW = Math.min(rect.width * 0.35, 260)
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
      ctx.shadowColor = 'rgba(0,0,0,0.45)'
      ctx.shadowBlur = 24 * sx
      ctx.shadowOffsetY = 10 * sy
      // Dark frame
      const fw = Math.max(6, dw * 0.035)
      ctx.fillStyle = '#1a110a'
      ctx.fillRect(-dw / 2 - fw, -dh / 2 - fw, dw + fw * 2, dh + fw * 2)
      ctx.shadowColor = 'transparent'
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh)
      ctx.restore()
    }

    const blob: Blob = await new Promise((res) => canvas.toBlob(b => res(b!), 'image/jpeg', 0.92))
    const file = new File([blob], 'my-wall.jpg', { type: 'image/jpeg' })

    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
    if (nav.canShare?.({ files: [file] }) && navigator.share) {
      try { await navigator.share({ files: [file], title: 'My Wall' }); return } catch {}
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'my-wall.jpg'
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
        <div className="flex items-center h-[56px] px-5 md:px-10 border-b border-line flex-shrink-0">
          <p className="text-[11px] tracking-[0.18em] uppercase text-ink-muted flex-1">My Wall</p>
          {bgUrl && (
            <button
              onClick={resetAll}
              className="hidden sm:inline-block h-9 px-3 text-[12px] text-ink-muted hover:text-ink mr-2"
            >
              Start over
            </button>
          )}
          {bgUrl && (
            <button
              onClick={exportImage}
              className="h-9 px-3 text-[12px] bg-ink text-paper flex items-center gap-2 mr-2"
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
            onCamera={() => cameraRef.current?.click()}
            onGallery={() => galleryRef.current?.click()}
            loading={loading}
          />
        ) : (
          <div
            ref={stageRef}
            className="relative flex-1 overflow-hidden bg-[#15100c]"
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) setActiveId(null)
            }}
          >
            <img
              src={bgUrl}
              alt=""
              draggable={false}
              style={{ aspectRatio: `${bgAspect}` }}
              className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
            />

            {layers.map(l => {
              const aw = ARTWORKS.find(a => a.id === l.artworkId)
              if (!aw) return null
              return (
                <LayerNode
                  key={l.id}
                  layer={l}
                  artwork={aw}
                  active={activeId === l.id}
                  onSelect={() => { setActiveId(l.id); bringToFront(l.id) }}
                  onChange={(p) => updateLayer(l.id, p)}
                  onRemove={() => removeLayer(l.id)}
                  onDuplicate={() => duplicateLayer(l.id)}
                  onBringToFront={() => bringToFront(l.id)}
                />
              )
            })}
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
                const aw = ARTWORKS.find(a => a.id === l.artworkId)
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

function EmptyState({ onCamera, onGallery, loading }:
  { onCamera: () => void; onGallery: () => void; loading: boolean }) {
  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <div className="max-w-[520px] text-center">
        <p className="text-[11px] tracking-[0.18em] uppercase text-ink-muted mb-4">Step one</p>
        <h2 className="font-display text-[36px] md:text-[48px] leading-[1.05] tracking-tight text-ink">
          Show us your <em className="italic text-accent">wall.</em>
        </h2>
        <p className="mt-4 text-[14px] text-ink-muted leading-relaxed">
          Take a straight-on photo of the wall you want to decorate, or pick one from your library. Then drop paintings onto it and arrange freely.
        </p>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            disabled={loading}
            onClick={onCamera}
            className="h-12 bg-accent text-accent-ink text-[14px] flex items-center justify-center gap-2 hover:bg-ink transition-colors disabled:opacity-50"
          >
            <Camera size={16} /> Take a photo
          </button>
          <button
            disabled={loading}
            onClick={onGallery}
            className="h-12 bg-transparent border border-ink text-ink text-[14px] flex items-center justify-center gap-2 hover:bg-ink hover:text-paper transition-colors disabled:opacity-50"
          >
            <ImagePlus size={16} /> Choose from library
          </button>
        </div>
        {loading && (
          <p className="mt-6 text-[12px] text-ink-muted flex items-center justify-center gap-2">
            <span className="inline-block w-3 h-3 border border-ink border-t-transparent rounded-full" style={{ animation: 'sp .7s linear infinite' }} />
            Preparing image…
          </p>
        )}
      </div>
    </div>
  )
}

function LayerNode({
  layer, artwork, active, onSelect, onChange, onRemove, onDuplicate, onBringToFront,
}: {
  layer: WallLayer
  artwork: Artwork
  active: boolean
  onSelect: () => void
  onChange: (p: Partial<WallLayer>) => void
  onRemove: () => void
  onDuplicate: () => void
  onBringToFront: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const localRef = useRef({ x: layer.x, y: layer.y, scale: layer.scale, rotation: layer.rotation })
  useEffect(() => { localRef.current = { x: layer.x, y: layer.y, scale: layer.scale, rotation: layer.rotation } },
    [layer.x, layer.y, layer.scale, layer.rotation])

  useGesture(
    {
      onDragStart: () => onSelect(),
      onDrag: ({ offset: [ox, oy] }) => {
        onChange({ x: ox, y: oy })
      },
      onPinch: ({ offset: [s, a], first }) => {
        if (first) onSelect()
        onChange({ scale: Math.max(0.2, Math.min(4, s)), rotation: a })
      },
    },
    {
      target: ref,
      drag: { from: () => [localRef.current.x, localRef.current.y], filterTaps: true },
      pinch: { from: () => [localRef.current.scale, localRef.current.rotation], scaleBounds: { min: 0.2, max: 4 } },
    }
  )

  const aspect = (artwork.heightCm || 60) / (artwork.widthCm || 80)
  const baseW = 'min(35vw, 260px)'

  return (
    <div
      ref={ref}
      onPointerDown={onSelect}
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: baseW,
        transform: `translate(-50%, -50%) translate(${layer.x}px, ${layer.y}px) scale(${layer.scale}) rotate(${layer.rotation}deg)`,
        transformOrigin: 'center',
        touchAction: 'none',
        cursor: 'grab',
      }}
      className="select-none"
    >
      <div
        className={`relative bg-[#1a110a] p-[4%] shadow-[0_14px_40px_rgba(0,0,0,0.45)] ${
          active ? 'ring-1 ring-accent ring-offset-0' : ''
        }`}
      >
        <img
          src={artwork.image || artwork.thumb || ''}
          alt={artwork.title}
          referrerPolicy="no-referrer-when-downgrade"
          draggable={false}
          className="block w-full pointer-events-none"
          style={{ aspectRatio: `${1 / aspect}` }}
        />
      </div>

      {active && (
        <div
          className="absolute left-1/2 -translate-x-1/2 -top-12 flex items-center gap-1 bg-paper border border-line px-1 py-1 shadow-sm"
          style={{ transform: `translateX(-50%) scale(${1 / layer.scale}) rotate(${-layer.rotation}deg)`, transformOrigin: 'center bottom' }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <IconBtn onClick={onDuplicate} label="Duplicate"><Copy size={13} /></IconBtn>
          <IconBtn onClick={onBringToFront} label="Bring forward"><ArrowUp size={13} /></IconBtn>
          <IconBtn onClick={onRemove} label="Remove"><Trash2 size={13} /></IconBtn>
        </div>
      )}
    </div>
  )
}

function IconBtn({ children, onClick, label }:
  { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      title={label}
      className="h-7 w-7 flex items-center justify-center text-ink hover:bg-ink hover:text-paper transition-colors"
    >
      {children}
    </button>
  )
}

function loadImg(src: string, cors = false): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image()
    if (cors) i.crossOrigin = 'anonymous'
    i.referrerPolicy = 'no-referrer'
    i.onload = () => res(i)
    i.onerror = rej
    i.src = src
  })
}
