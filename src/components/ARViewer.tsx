'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, ImageIcon } from 'lucide-react'
import { useStore } from '@/store'
import { ARTWORKS } from '@/lib/artworks'
import type { Artwork } from '@/types'

type ARStatus = 'idle' | 'loading' | 'ready' | 'scanning' | 'placed' | 'error'

function detectIOS(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  // Treat iPadOS 13+ (which reports as Mac + touch) as iOS too.
  const iPadLike = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return (/iPad|iPhone|iPod/.test(ua) || iPadLike) && !(window as unknown as { MSStream?: unknown }).MSStream
}

function arUrl(aw: Artwork, format: 'glb' | 'usdz'): string {
  const base = aw.type === 'sculpture' ? '/api/ar/sculpture' : '/api/ar/painting'
  return `${base}/${aw.id}?format=${format}`
}

export default function ARViewer() {
  const { arOpen, current, closeAR, openMyWall, openQR } = useStore()
  const mvRef = useRef<HTMLElement>(null)
  const iosLinkRef = useRef<HTMLAnchorElement>(null)
  const [status, setStatus] = useState<ARStatus>('idle')
  const [hint, setHint] = useState('')
  const [showInstructions, setShowInstructions] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showGesture, setShowGesture] = useState(false)
  const surfaceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const instTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const isIOS = useMemo(() => detectIOS(), [])

  async function loadAndLaunch(aw: Artwork | null) {
    if (!aw) return
    setStatus('loading')
    setHint('Preparing AR model…')
    setShowGesture(false)
    setShowHelp(false)
    setShowInstructions(false)
    clearTimeout(surfaceTimer.current)

    // iOS path — Apple's documented reliable Quick Look trigger: <a rel="ar">.
    // We just click the hidden anchor; Safari intercepts the USDZ and opens
    // Quick Look directly, bypassing model-viewer entirely.
    if (isIOS) {
      try {
        setStatus('ready')
        setHint('Opening AR Quick Look…')
        // Defer to next tick so the href (updated via state-driven render) is
        // committed before we click.
        await new Promise(r => requestAnimationFrame(r))
        iosLinkRef.current?.click()
      } catch (err) {
        setStatus('error')
        setHint('⚠️ ' + (err instanceof Error ? err.message : 'Failed to launch AR'))
      }
      return
    }

    // Non-iOS path — use <model-viewer> with server GLB URL for both the
    // 3D preview and for launching WebXR / Scene Viewer.
    const mv = mvRef.current as HTMLElement & {
      canActivateAR: boolean
      activateAR: () => void
      src: string
      setAttribute: (name: string, value: string) => void
      removeAttribute: (name: string) => void
      addEventListener: (event: string, handler: (e: Event) => void, options?: AddEventListenerOptions) => void
      style: CSSStyleDeclaration
    } | null
    if (!mv) return

    mv.setAttribute('ar-placement', aw.type === 'sculpture' ? 'floor' : 'wall')
    mv.setAttribute('ar-scale', aw.type === 'sculpture' ? 'auto' : 'fixed')
    mv.src = ''
    await new Promise(r => requestAnimationFrame(r))

    try {
      mv.src = arUrl(aw, 'glb')
      // ios-src helps if a desktop-Safari user somehow reaches this branch.
      mv.setAttribute('ios-src', arUrl(aw, 'usdz'))

      await new Promise<void>((res, rej) => {
        const onLoad = () => res()
        const onErr = () => rej(new Error('Model load failed'))
        mv.addEventListener('load', onLoad, { once: true })
        mv.addEventListener('error', onErr, { once: true })
        setTimeout(() => rej(new Error('Timeout')), 20000)
      })

      setStatus('ready')
      mv.style.opacity = '1'
      setHint(aw.type === 'sculpture'
        ? 'Point at the floor then tap the AR button ↙'
        : 'Point at a wall then tap the AR button ↙')

      await new Promise(r => setTimeout(r, 300))
      if (mv.canActivateAR) mv.activateAR()
      else { closeAR(); openQR() }
    } catch (err) {
      setStatus('error')
      setHint('⚠️ ' + (err instanceof Error ? err.message : 'Failed to load'))
    }
  }

  useEffect(() => {
    if (!arOpen || !current) return
    loadAndLaunch(current)
    return () => {
      clearTimeout(surfaceTimer.current)
      clearTimeout(instTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arOpen, current?.id])

  // ar-status events (non-iOS)
  useEffect(() => {
    const mv = mvRef.current
    if (!mv || isIOS) return
    const handler = (e: Event) => {
      const s = (e as CustomEvent).detail?.status
      if (s === 'session-started') {
        mv.removeAttribute('auto-rotate')
        setHint(current?.type === 'sculpture'
          ? 'Move camera over floor until a ring appears'
          : 'Move camera slowly over a wall until a ring appears')
        setStatus('scanning')
        setShowGesture(false)
        setShowHelp(false)
        setShowInstructions(true)
        clearTimeout(instTimer.current)
        instTimer.current = setTimeout(() => setShowInstructions(false), 5000)
        clearTimeout(surfaceTimer.current)
        surfaceTimer.current = setTimeout(() => setShowHelp(true), 35000)
      } else if (s === 'object-placed') {
        clearTimeout(surfaceTimer.current)
        setHint('✓ Placed!')
        setStatus('placed')
        setShowGesture(true)
        setShowHelp(false)
        setShowInstructions(false)
        clearTimeout(instTimer.current)
        if (navigator.vibrate) navigator.vibrate([40, 30, 40])
        setTimeout(() => setHint(''), 2500)
      } else if (s === 'failed') {
        setHint('⚠️ AR unavailable on this device')
        setStatus('error')
      } else if (s === 'not-presenting') {
        setStatus('ready')
      }
    }
    mv.addEventListener('ar-status', handler)
    return () => mv.removeEventListener('ar-status', handler)
  }, [current, isIOS])

  function handleClose() {
    clearTimeout(surfaceTimer.current)
    clearTimeout(instTimer.current)
    closeAR()
    setStatus('idle')
    setShowGesture(false)
    setShowHelp(false)
    setShowInstructions(false)
  }

  if (!current) return null

  // Use server GLB URL for 3D preview on all platforms.
  const previewGlb = arUrl(current, 'glb')
  const iosUsdz = arUrl(current, 'usdz')

  return (
    <AnimatePresence>
      {arOpen && (
        <motion.div
          className="fixed inset-0 bg-black z-[300] flex flex-col"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          {/* Hidden iOS Quick Look anchor — clicked programmatically. */}
          <a
            ref={iosLinkRef}
            rel="ar"
            href={iosUsdz}
            style={{ display: 'none' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/transparent.png" alt="" />
          </a>

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 z-10 px-4 py-3.5 flex items-center justify-between bg-gradient-to-b from-black/72 to-transparent">
            <div className="text-[13px] font-semibold text-white flex-1 truncate">{current.title}</div>
            <button
              onClick={handleClose}
              className="bg-white/18 backdrop-blur-md border-none text-white w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          {/* 3D preview (all platforms) + AR launcher on non-iOS */}
          <model-viewer
            ref={mvRef}
            ar={!isIOS ? true : undefined}
            ar-modes="webxr scene-viewer"
            ar-placement={current.type === 'sculpture' ? 'floor' : 'wall'}
            ar-scale={current.type === 'sculpture' ? 'auto' : 'fixed'}
            camera-controls
            shadow-intensity="0.8"
            exposure="1.1"
            tone-mapping="commerce"
            interpolation-decay="200"
            src={previewGlb}
            ios-src={iosUsdz}
            style={{ width: '100%', height: '100%', background: '#0a0a0a' }}
          />

          {/* Loading spinner */}
          {status === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-3.5 pointer-events-none">
              <div className="w-12 h-12 rounded-full border-[3px] border-[rgba(200,169,110,.3)] border-t-[--accent]" style={{ animation: 'sp .7s linear infinite' }} />
              <div className="text-[13px] text-[#ccc] text-center">Preparing AR model…</div>
            </div>
          )}

          {/* AR instructions overlay */}
          <AnimatePresence>
            {showInstructions && (
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-black/82 backdrop-blur-xl rounded-2xl p-5 text-center pointer-events-none max-w-[300px]"
                initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .9 }}
              >
                <div className="text-[15px] font-bold mb-3.5 text-white">How to use AR</div>
                <div className="flex gap-5 justify-center">
                  {[['☝️', 'One finger to move'], ['🤏', 'Two fingers resize'], ['🔄', 'Twist to rotate']].map(([icon, label]) => (
                    <div key={label} className="flex flex-col items-center gap-1">
                      <span className="text-3xl">{icon}</span>
                      <span className="text-[11px] text-[#ccc] max-w-[72px] text-center leading-snug">{label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom area */}
          <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-7 flex flex-col items-center gap-2.5 bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
            {status === 'scanning' && (
              <div className="w-[70px] h-[70px] rounded-full border-[3px] border-[rgba(200,169,110,.4)]" style={{ animation: 'ring-pulse 2s ease-in-out infinite' }} />
            )}

            {hint && (
              <div className="bg-black/65 backdrop-blur-lg text-white px-[18px] py-2 rounded-full text-[13px] font-medium text-center max-w-[300px]">
                {hint}
              </div>
            )}

            <div className="flex gap-2 pointer-events-auto">
              {isIOS && (
                <button
                  onClick={() => iosLinkRef.current?.click()}
                  className="bg-[--accent] border-none text-[#0c0c0c] px-5 py-2.5 rounded-full text-[13px] font-bold cursor-pointer"
                >
                  📱 Enter AR
                </button>
              )}
              {status === 'placed' && (
                <button
                  onClick={() => { loadAndLaunch(current) }}
                  className="bg-white/18 backdrop-blur-md border border-white/28 text-white px-[17px] py-2.5 rounded-full text-[13px] font-semibold cursor-pointer"
                >
                  ↩ Re-place
                </button>
              )}
              {current.type === 'painting' && (
                <button
                  onClick={() => { handleClose(); openMyWall(current) }}
                  className="bg-white/18 backdrop-blur-md border border-white/28 text-white px-[17px] py-2.5 rounded-full text-[13px] font-semibold cursor-pointer flex items-center gap-1.5"
                >
                  <ImageIcon size={13} /> My Wall
                </button>
              )}
            </div>
          </div>

          {/* Gesture guide */}
          <AnimatePresence>
            {showGesture && (
              <motion.div
                className="absolute left-1/2 -translate-x-1/2 z-10 bg-black/70 backdrop-blur-lg rounded-xl px-4 py-3 flex gap-4 whitespace-nowrap"
                style={{ bottom: 130 }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              >
                {[['☝️', 'Drag to move'], ['🤏', 'Pinch to resize'], ['🔄', 'Two-finger rotate']].map(([icon, label]) => (
                  <div key={label} className="flex flex-col items-center gap-0.5 text-[11px] text-[#ccc]">
                    <span className="text-xl">{icon}</span>
                    <span>{label}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Troubleshooting help */}
          <AnimatePresence>
            {showHelp && (
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-black/80 backdrop-blur-xl rounded-2xl p-5 max-w-[280px] text-center"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              >
                <h4 className="text-[14px] font-bold mb-2">Having trouble?</h4>
                <ul className="list-none text-left text-[12px] text-[#ccc] leading-7 mb-3">
                  {['Move to a well-lit room', 'Aim at a wall with texture', 'Move camera in a figure-8', 'Get closer then step back'].map(tip => (
                    <li key={tip}><span className="text-[--accent]">→ </span>{tip}</li>
                  ))}
                </ul>
                <button
                  onClick={() => { setShowHelp(false); loadAndLaunch(current) }}
                  className="bg-[--accent] border-none text-[#0c0c0c] px-5 py-2.5 rounded-lg text-[13px] font-bold cursor-pointer w-full"
                >
                  ↩ Retry AR
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <ArtworkSwitcher currentAw={current} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ArtworkSwitcher({ currentAw }: { currentAw: Artwork }) {
  const { openAR, setCurrent } = useStore()
  const artworks = ARTWORKS

  return (
    <div className="absolute bottom-0 left-0 right-0 z-15 px-3 pb-5 pt-2 flex gap-2 overflow-x-auto bg-gradient-to-t from-black/85 via-black/60 to-transparent" style={{ scrollbarWidth: 'none' }}>
      {artworks.map(aw => (
        <button
          key={aw.id}
          onClick={() => { setCurrent(aw); openAR(aw) }}
          className={`flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer bg-transparent border-none p-0 transition-transform active:scale-[.93] ${aw.id === currentAw.id ? '' : 'opacity-70'}`}
        >
          {aw.thumb ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={aw.thumb}
              alt={aw.title}
              referrerPolicy="no-referrer-when-downgrade"
              className={`w-12 h-12 rounded-lg object-cover border-2 transition-all ${aw.id === currentAw.id ? 'border-[--accent] shadow-[0_0_0_2px_var(--accent)]' : 'border-white/20'}`}
            />
          ) : (
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl bg-[#222] border-2 ${aw.id === currentAw.id ? 'border-[--accent]' : 'border-white/20'}`}>
              {aw.id === 'bronze-helix' ? '🗿' : '💎'}
            </div>
          )}
          <span className="text-[9px] text-white/70 max-w-[54px] text-center overflow-hidden text-ellipsis whitespace-nowrap">{aw.title}</span>
        </button>
      ))}
    </div>
  )
}
