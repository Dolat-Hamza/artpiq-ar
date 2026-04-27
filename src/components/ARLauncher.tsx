'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useStore } from '@/store'
import type { Artwork } from '@/types'

type Platform = 'ios' | 'android' | 'desktop'

function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  const iPadLike = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  if (/iPad|iPhone|iPod/.test(ua) || iPadLike) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

function arUrl(aw: Artwork, format: 'glb' | 'usdz'): string {
  const base = aw.type === 'sculpture' ? '/api/ar/sculpture' : '/api/ar/painting'
  return `${base}/${aw.id}?format=${format}`
}

function sceneViewerHref(modelUrl: string, fallbackUrl: string): string {
  const file = encodeURIComponent(modelUrl)
  const fallback = encodeURIComponent(fallbackUrl)
  return `intent://arvr.google.com/scene-viewer/1.0?file=${file}&mode=ar_preferred#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${fallback};end`
}

export default function ARLauncher() {
  const { arOpen, current, closeAR, openMyWall } = useStore()
  const iosLinkRef = useRef<HTMLAnchorElement>(null)
  const platform = useMemo(detectPlatform, [])
  const [origin, setOrigin] = useState('')

  useEffect(() => { setOrigin(window.location.origin) }, [])

  if (!current) return null

  const dims = current.type === 'sculpture'
    ? `${current.heightCm} cm tall`
    : `${current.widthCm} × ${current.heightCm} cm`

  const absGlb = origin ? `${origin}${arUrl(current, 'glb')}` : arUrl(current, 'glb')
  const usdzRel = arUrl(current, 'usdz')
  const androidHref = sceneViewerHref(absGlb, origin || 'https://artpiq.art')

  function launch() {
    if (platform === 'ios') {
      iosLinkRef.current?.click()
    } else if (platform === 'android') {
      window.location.href = androidHref
    }
  }

  return (
    <AnimatePresence>
      {arOpen && (
        <motion.div
          className="fixed inset-0 z-[300] bg-paper flex flex-col"
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
              Augmented reality
            </p>
            <button
              onClick={closeAR}
              className="h-10 w-10 border border-line flex items-center justify-center hover:border-ink"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-content mx-auto px-6 md:px-12 lg:px-20 py-10 md:py-16 grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
              <div className="md:col-span-7">
                <div className="aspect-[4/5] bg-slate-100 overflow-hidden">
                  {platform === 'desktop' ? (
                    <model-viewer
                      src={arUrl(current, 'glb')}
                      camera-controls
                      shadow-intensity="0.6"
                      exposure="1.0"
                      style={{ width: '100%', height: '100%', background: '#ece4d3' }}
                    />
                  ) : current.image ? (
                    <img
                      src={current.image}
                      alt={current.title}
                      referrerPolicy="no-referrer-when-downgrade"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="font-display text-[80px] text-ink-muted">
                        {current.type === 'sculpture' ? 'III' : 'II'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-5">
                <p className="text-[11px] tracking-[0.18em] uppercase text-ink-muted mb-4">
                  {current.type === 'sculpture' ? 'Sculpture' : 'Painting'}
                </p>
                <h2 className="font-display text-[36px] md:text-[48px] leading-[1.02] tracking-tight text-ink">
                  {current.title}
                </h2>
                <p className="mt-3 text-[14px] text-ink-muted">
                  {current.artist} — {current.year}
                </p>

                <dl className="mt-8 grid grid-cols-2 gap-y-3 text-[13px] border-t border-line pt-6">
                  <dt className="text-[11px] tracking-[0.12em] uppercase text-ink-muted">Medium</dt>
                  <dd className="text-ink">{current.medium}</dd>
                  <dt className="text-[11px] tracking-[0.12em] uppercase text-ink-muted">Dimensions</dt>
                  <dd className="text-ink">{dims}</dd>
                </dl>

                <div className="mt-10 flex flex-col gap-3">
                  {platform === 'desktop' ? (
                    <p className="text-[13px] text-ink-muted leading-relaxed border border-line p-5">
                      Open this page on an iPhone, iPad or recent Android device to place the work in your room.
                    </p>
                  ) : (
                    <button
                      onClick={launch}
                      className="h-12 bg-accent text-accent-ink text-[14px] hover:bg-ink transition-colors"
                    >
                      Enter AR
                    </button>
                  )}
                  {current.type === 'painting' && (
                    <button
                      onClick={() => { closeAR(); openMyWall([current.id]) }}
                      className="h-12 bg-transparent text-ink border border-ink text-[14px] hover:bg-ink hover:text-paper transition-colors"
                    >
                      Try on My Wall
                    </button>
                  )}
                </div>

                <p className="mt-6 text-[11px] text-ink-muted leading-relaxed">
                  {current.type === 'painting'
                    ? 'Point your camera at a wall and drop the painting at life size.'
                    : 'Point your camera at the floor to place the sculpture.'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
