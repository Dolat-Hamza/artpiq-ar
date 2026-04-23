'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Loader2, RefreshCcw } from 'lucide-react'
import { useStore } from '@/store'

type Status = 'loading' | 'ready' | 'error'

function detectIOS(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  const iPadLike = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return (/iPad|iPhone|iPod/.test(ua) || iPadLike) && !(window as unknown as { MSStream?: unknown }).MSStream
}

/**
 * Gallery AR — builds a combined server-side scene of all selected paintings
 * and launches it via platform-native AR (Quick Look on iOS via <a rel="ar">,
 * WebXR/Scene Viewer elsewhere via model-viewer).
 *
 * No more blob URLs, no client-side Three.js exports.
 */
export default function GalleryARViewer() {
  const { galleryArOpen, galleryArArtworks, closeGalleryAR, showToast, enterSelectMode } = useStore()
  const mvRef = useRef<HTMLElement | null>(null)
  const iosLinkRef = useRef<HTMLAnchorElement>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [hint, setHint] = useState('Preparing combined AR scene…')

  const isIOS = useMemo(() => detectIOS(), [])

  const paintings = galleryArArtworks.filter(a => a.type === 'painting')
  const idsParam = paintings.map(a => a.id).join(',')
  const glbUrl = idsParam ? `/api/ar/gallery?ids=${encodeURIComponent(idsParam)}&format=glb` : ''
  const usdzUrl = idsParam ? `/api/ar/gallery?ids=${encodeURIComponent(idsParam)}&format=usdz` : ''

  async function ensureModelViewerReady() {
    // Just a lightweight probe: set src (done declaratively below) and wait
    // for model-viewer to fire `load` or timeout.
    if (isIOS) { setStatus('ready'); setHint('Tap "Enter AR" to open in Quick Look'); return }
    const mv = mvRef.current as (HTMLElement & {
      addEventListener: (e: string, h: (ev: Event) => void, opts?: AddEventListenerOptions) => void
    }) | null
    if (!mv) { setStatus('error'); setHint('model-viewer not available'); return }

    await new Promise<void>((res, rej) => {
      const onLoad = () => res()
      const onErr = () => rej(new Error('Model load failed'))
      mv.addEventListener('load', onLoad, { once: true })
      mv.addEventListener('error', onErr, { once: true })
      setTimeout(() => rej(new Error('Timeout building gallery scene')), 30000)
    }).then(
      () => { setStatus('ready'); setHint('Tap "Enter AR" to place gallery on wall') },
      (err: Error) => { setStatus('error'); setHint(err.message) },
    )
  }

  async function handleEnterAR() {
    if (isIOS) {
      iosLinkRef.current?.click()
      return
    }
    const mv = mvRef.current as (HTMLElement & { activateAR?: () => Promise<void> }) | null
    if (mv?.activateAR) {
      try { await mv.activateAR() }
      catch (e) { showToast('AR failed to launch: ' + (e instanceof Error ? e.message : 'unknown')) }
    }
  }

  function handleClose() { closeGalleryAR() }
  function handleChangeSelection() {
    handleClose()
    setTimeout(() => enterSelectMode(), 120)
  }

  useEffect(() => {
    if (galleryArOpen && paintings.length) {
      setStatus('loading')
      setHint('Building combined AR scene on server…')
      ensureModelViewerReady()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galleryArOpen, idsParam])

  return (
    <AnimatePresence>
      {galleryArOpen && (
        <motion.div
          className="fixed inset-0 z-[340] bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Hidden iOS Quick Look anchor */}
          <a
            ref={iosLinkRef}
            rel="ar"
            href={usdzUrl}
            style={{ display: 'none' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/transparent.png" alt="" />
          </a>

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

          {/* model-viewer: 3D preview on all platforms, AR launcher on non-iOS. */}
          <model-viewer
            ref={mvRef as React.Ref<HTMLElement>}
            ar={!isIOS ? true : undefined}
            ar-modes="webxr scene-viewer"
            ar-scale="fixed"
            ar-placement="wall"
            camera-controls
            shadow-intensity="1"
            exposure="1"
            tone-mapping="aces"
            src={glbUrl}
            ios-src={usdzUrl}
            style={{ width: '100%', height: '100%', background: '#0a0a0a' }}
          />

          {/* Preview thumbnails while loading */}
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
                ? 'Combined scene served by backend · Quick Look / WebXR ready'
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
                disabled={status !== 'ready' && !isIOS}
                className="flex-[2] bg-[--accent] disabled:opacity-50 disabled:cursor-not-allowed border-none text-[#0c0c0c] py-3 rounded-xl text-[14px] font-extrabold cursor-pointer active:scale-[.97] transition-transform"
              >
                {isIOS || status === 'ready' ? '📱 Enter AR' : 'Preparing…'}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
