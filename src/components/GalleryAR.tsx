'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { useStore } from '@/store'

type Platform = 'ios' | 'android' | 'desktop'
type Status = 'idle' | 'building' | 'ready' | 'error'

function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  const iPadLike = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  if (/iPad|iPhone|iPod/.test(ua) || iPadLike) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

function galleryUrl(ids: string[], format: 'glb' | 'usdz'): string {
  const q = new URLSearchParams({ ids: ids.join(','), format })
  return `/api/ar/gallery?${q.toString()}`
}

function sceneViewerHref(modelUrl: string, fallbackUrl: string): string {
  const file = encodeURIComponent(modelUrl)
  const fallback = encodeURIComponent(fallbackUrl)
  return `intent://arvr.google.com/scene-viewer/1.0?file=${file}&mode=ar_preferred#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${fallback};end`
}

export default function GalleryAR() {
  const { galleryArOpen, galleryArIds: rawIds, closeGalleryAR, artworks, showToast } = useStore()
  // AR limited to 1 artwork — Quick Look / Scene Viewer don't support per-piece manipulation
  const galleryArIds = rawIds.slice(0, 1)
  const iosLinkRef = useRef<HTMLAnchorElement>(null)
  const platform = useMemo(detectPlatform, [])
  const [origin, setOrigin] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => { setOrigin(window.location.origin) }, [])

  // Warm the server cache so the first AR launch doesn't stall.
  useEffect(() => {
    if (!galleryArOpen || galleryArIds.length === 0) return
    setStatus('building')
    const format = platform === 'ios' ? 'usdz' : 'glb'
    fetch(galleryUrl(galleryArIds, format), { method: 'GET' })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.blob()
      })
      .then(() => setStatus('ready'))
      .catch(e => {
        console.error('[GalleryAR] warmup failed', e)
        setStatus('error')
        showToast('AR build failed. Try fewer artworks.')
      })
  }, [galleryArOpen, galleryArIds, platform, showToast])

  if (!galleryArOpen) return null

  const selected = galleryArIds
    .map(id => artworks.find(a => a.id === id))
    .filter(Boolean) as typeof artworks

  const absGlb = origin ? `${origin}${galleryUrl(galleryArIds, 'glb')}` : galleryUrl(galleryArIds, 'glb')
  const usdzRel = galleryUrl(galleryArIds, 'usdz')
  const androidHref = sceneViewerHref(absGlb, origin || 'https://artpiq.art')

  function launch() {
    if (status !== 'ready') { showToast('Still preparing scene…'); return }
    if (platform === 'ios') iosLinkRef.current?.click()
    else if (platform === 'android') window.location.href = androidHref
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[320] bg-paper flex flex-col"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <a
          ref={iosLinkRef}
          rel="ar"
          href={usdzRel}
          style={{ display: 'none' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/transparent.png" alt="" />
        </a>

        <div className="flex items-center h-[56px] px-6 md:px-12 border-b border-line">
          <p className="text-[11px] tracking-[0.18em] uppercase text-ink-muted flex-1">
            Artwork in AR
          </p>
          <button
            onClick={closeGalleryAR}
            className="h-10 w-10 border border-line flex items-center justify-center hover:border-ink"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-content mx-auto px-6 md:px-12 lg:px-20 py-10 md:py-16">
            <h2 className="font-display text-[36px] md:text-[48px] leading-[1.02] tracking-tight text-ink">
              {selected[0]?.title || 'Artwork'} in AR
            </h2>
            <p className="mt-3 text-[14px] text-ink-muted max-w-[560px]">
              Place the work on your wall at true scale. AR is single-artwork only — Quick Look
              and Scene Viewer don&rsquo;t support per-piece manipulation.
            </p>

            <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {selected.map(aw => (
                <div key={aw.id} className="bg-slate-100">
                  <div className="aspect-[3/4] overflow-hidden">
                    {aw.image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={aw.thumb || aw.image}
                        alt={aw.title}
                        referrerPolicy="no-referrer-when-downgrade"
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="p-3">
                    <p className="font-display text-[14px] text-ink leading-tight">{aw.title}</p>
                    <p className="text-[10px] tracking-[0.12em] uppercase text-ink-muted mt-1">
                      {aw.artist}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 flex flex-col sm:flex-row gap-3 max-w-[520px]">
              {platform === 'desktop' ? (
                <p className="text-[13px] text-ink-muted leading-relaxed border border-line p-5 flex-1">
                  Open this page on an iPhone or recent Android device to place the gallery on your wall.
                </p>
              ) : (
                <button
                  onClick={launch}
                  disabled={status !== 'ready'}
                  className="h-12 px-8 bg-accent text-accent-ink text-[14px] hover:bg-ink transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 flex-1"
                >
                  {status === 'building' && <Loader2 size={14} className="animate-spin" />}
                  {status === 'ready' && 'Enter AR'}
                  {status === 'building' && 'Preparing scene…'}
                  {status === 'error' && 'Build failed — retry'}
                  {status === 'idle' && 'Enter AR'}
                </button>
              )}
              <button
                onClick={closeGalleryAR}
                className="h-12 px-8 bg-transparent text-ink border border-ink text-[14px] hover:bg-ink hover:text-paper transition-colors"
              >
                Close
              </button>
            </div>

            {platform === 'ios' && (
              <p className="mt-6 text-[11px] text-ink-muted leading-relaxed max-w-[520px]">
                For multi-artwork composition, use the Sample Room or My Wall views.
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
