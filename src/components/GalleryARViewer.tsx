'use client'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Loader2, RefreshCcw } from 'lucide-react'
import { useStore } from '@/store'
import { buildGalleryGLB, preloadArtworkTextures } from '@/lib/three-builder'

type Status = 'loading' | 'ready' | 'error'

/**
 * iOS / non-WebXR fallback for multi-artwork AR.
 * Builds a single combined GLB (all paintings in a row) and launches
 * model-viewer's AR mode (Quick Look on iOS, Scene Viewer on Android).
 *
 * Limitation: once in Quick Look, scene is fixed. User can close → re-select
 * to change artwork set. We show a "Change selection" button to make that fast.
 */
export default function GalleryARViewer() {
  const { galleryArOpen, galleryArArtworks, closeGalleryAR, showToast, enterSelectMode } = useStore()
  const mvRef = useRef<HTMLElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [hint, setHint] = useState('Building combined AR scene…')

  async function buildAndLaunch() {
    setStatus('loading')
    setHint('Preloading textures…')
    try {
      await preloadArtworkTextures(galleryArArtworks)
      setHint('Building combined scene…')
      const buf = await buildGalleryGLB(galleryArArtworks)
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = URL.createObjectURL(new Blob([buf], { type: 'model/gltf-binary' }))

      const mv = mvRef.current as HTMLElement & {
        setAttribute: (name: string, value: string) => void
        activateAR?: () => Promise<void>
      } | null
      if (!mv) { setStatus('error'); return }
      mv.setAttribute('src', blobUrlRef.current)

      setStatus('ready')
      setHint('Tap "Enter AR" to place gallery')
    } catch (err) {
      console.error('[GalleryAR] build failed', err)
      setStatus('error')
      setHint(err instanceof Error ? err.message : 'Scene build failed')
    }
  }

  async function handleEnterAR() {
    const mv = mvRef.current as (HTMLElement & { activateAR?: () => Promise<void> }) | null
    if (mv?.activateAR) {
      try { await mv.activateAR() }
      catch (e) { showToast('AR failed to launch: ' + (e instanceof Error ? e.message : 'unknown')) }
    }
  }

  function handleClose() {
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null }
    closeGalleryAR()
  }

  function handleChangeSelection() {
    handleClose()
    setTimeout(() => enterSelectMode(), 120)
  }

  useEffect(() => {
    if (galleryArOpen && galleryArArtworks.length) buildAndLaunch()
    return () => {
      if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galleryArOpen])

  const paintings = galleryArArtworks.filter(a => a.type === 'painting')

  return (
    <AnimatePresence>
      {galleryArOpen && (
        <motion.div
          className="fixed inset-0 z-[340] bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 z-10 px-4 py-3 flex items-center gap-3 bg-gradient-to-b from-black/80 via-black/30 to-transparent">
            <div className="flex-1 flex items-center gap-2">
              <div className="text-white text-[13px] font-semibold">Gallery AR</div>
              <div className="text-white/75 text-[12px] bg-white/10 px-2 py-0.5 rounded-full">
                {paintings.length} artworks
              </div>
            </div>
            <button
              onClick={handleClose}
              aria-label="Close"
              className="bg-white/18 backdrop-blur-md border-none text-white w-9 h-9 rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            >
              <X size={16} />
            </button>
          </div>

          {/* model-viewer (AR launcher) */}
          <model-viewer
            ref={mvRef as React.Ref<HTMLElement>}
            ar
            ar-modes="webxr scene-viewer quick-look"
            ar-scale="fixed"
            ar-placement="wall"
            camera-controls
            shadow-intensity="1"
            exposure="1"
            tone-mapping="aces"
            style={{ width: '100%', height: '100%', background: '#0a0a0a' }}
          />

          {/* Preview thumbnails — shown while model-viewer loads */}
          {status !== 'ready' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex flex-col items-center gap-4 px-6">
                <div className="flex gap-2">
                  {paintings.map(aw => aw.thumb && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      key={aw.id}
                      src={aw.thumb}
                      alt={aw.title}
                      referrerPolicy="no-referrer-when-downgrade"
                      className="w-16 h-16 rounded-lg object-cover border-2 border-[--accent]/60 bg-[#222] shadow-lg"
                    />
                  ))}
                </div>
                {status === 'loading' && (
                  <div className="flex items-center gap-2 text-white/85 text-[13px]">
                    <Loader2 size={16} className="animate-spin" /> {hint}
                  </div>
                )}
                {status === 'error' && (
                  <div className="text-red-300 text-[13px] text-center max-w-[280px]">
                    {hint}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom dock */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-4 flex flex-col gap-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
            <div className="text-white/80 text-[12px] text-center px-2 leading-snug">
              {status === 'ready'
                ? 'All paintings combined as one scene · Quick Look on iOS'
                : hint}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleChangeSelection}
                className="flex-1 bg-white/12 backdrop-blur-md border border-white/15 text-white py-3 rounded-xl text-[13px] font-semibold cursor-pointer active:scale-[.97] transition-transform flex items-center justify-center gap-1.5"
              >
                <RefreshCcw size={14} /> Change
              </button>
              <button
                onClick={handleEnterAR}
                disabled={status !== 'ready'}
                className="flex-[2] bg-[--accent] disabled:opacity-50 disabled:cursor-not-allowed border-none text-[#0c0c0c] py-3 rounded-xl text-[14px] font-extrabold cursor-pointer active:scale-[.97] transition-transform"
              >
                {status === 'ready' ? '📱 Enter AR' : 'Preparing…'}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
