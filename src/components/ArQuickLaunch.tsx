'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Artwork } from '@/types'

// QR-scan landing for a single artwork. No catalogue, no sample-room —
// one big "Place on your wall" button that jumps straight into the
// device's system AR camera (iOS Quick Look or Android Scene Viewer).
//
// Browsers don't allow auto-firing an AR intent on page load (security:
// it requires a user gesture), so the first paint is a single CTA tap.
// On desktop where AR isn't available we show a 3D preview + a QR back
// to this page so the visitor can scan with their phone and continue.

type Platform = 'ios' | 'android' | 'desktop'

function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  const iPadLike = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  if (/iPad|iPhone|iPod/.test(ua) || iPadLike) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

function sceneViewerHref(absoluteGlb: string, fallbackUrl: string, title: string): string {
  const file = encodeURIComponent(absoluteGlb)
  const fb = encodeURIComponent(fallbackUrl)
  const t = encodeURIComponent(title)
  return `intent://arvr.google.com/scene-viewer/1.0?file=${file}&mode=ar_preferred&title=${t}#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${fb};end`
}

// Lazy-load model-viewer custom element only when the desktop fallback
// actually renders. Saves ~140KB on mobile where it's never used.
let modelViewerLoaded = false
function ensureModelViewer() {
  if (modelViewerLoaded || typeof document === 'undefined') return
  if (document.querySelector('script[data-mv]')) {
    modelViewerLoaded = true
    return
  }
  const s = document.createElement('script')
  s.type = 'module'
  s.async = true
  s.dataset.mv = '1'
  s.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js'
  document.head.appendChild(s)
  modelViewerLoaded = true
}

interface Props {
  artwork: Artwork
  origin: string  // Absolute https://host for Scene Viewer + QR
}

export default function ArQuickLaunch({ artwork: aw, origin }: Props) {
  const platform = useMemo(detectPlatform, [])
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  // Pretty extensions via next.config.ts rewrites. iOS Quick Look only
  // fires reliably when the URL ends in `.usdz`; Android Scene Viewer takes
  // a `.glb` directly. Both rewrite to /api/ar/<type>/<id>?format=...
  const sculpturePath = aw.type === 'sculpture' ? 'sculpture/' : ''
  const absGlb  = `${origin}/ar/${sculpturePath}${aw.id}.glb`
  const usdzHref = `${origin}/ar/${sculpturePath}${aw.id}.usdz`
  const androidHref = sceneViewerHref(absGlb, `${origin}/ar/${aw.id}`, aw.title)
  const dims = aw.type === 'sculpture'
    ? `${aw.heightCm} cm tall`
    : `${aw.widthCm} × ${aw.heightCm} cm`

  useEffect(() => {
    if (platform === 'desktop') ensureModelViewer()
  }, [platform])

  // Render the QR canvas on desktop fallback
  useEffect(() => {
    if (platform !== 'desktop' || !qrCanvasRef.current) return
    let cancelled = false
    import('qrcode').then(QRCode => {
      if (cancelled || !qrCanvasRef.current) return
      QRCode.toCanvas(qrCanvasRef.current, `${origin}/ar/${aw.id}`, {
        width: 220,
        margin: 1,
        color: { dark: '#141210', light: '#ffffff' },
      })
    })
    return () => { cancelled = true }
  }, [platform, origin, aw.id])

  // arDenied flips only if 4.5s pass after click WITHOUT page visibility
  // changing — i.e. Quick Look / Scene Viewer never opened. If the page
  // hides (AR launched) we clear the timer so the warning never shows on
  // a successful launch.
  const [arDenied, setArDenied] = useState(false)
  const denyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function armDenyCheck() {
    if (denyTimerRef.current) clearTimeout(denyTimerRef.current)
    setArDenied(false)
    denyTimerRef.current = setTimeout(() => setArDenied(true), 4500)
    const onVis = () => {
      if (document.hidden) {
        if (denyTimerRef.current) clearTimeout(denyTimerRef.current)
        setArDenied(false)
        document.removeEventListener('visibilitychange', onVis)
      }
    }
    document.addEventListener('visibilitychange', onVis)
  }

  // iOS / Android single-tap CTA layout. CRITICAL: the CTA itself must be
  // an `<a>` element so iOS Quick Look fires on a trusted user gesture.
  // Programmatic .click() on a hidden anchor was the previous bug — Safari
  // silently no-ops it on many iOS versions.
  if (platform !== 'desktop') {
    return (
      <div className="min-h-dvh bg-paper text-ink flex flex-col">
        <div className="flex-1 flex flex-col justify-between p-6">
          <div>
            <p className="text-[10px] tracking-[0.18em] uppercase text-ink-muted">
              ARTPIQ AR
            </p>
            <h1 className="font-display text-[34px] leading-tight mt-3">{aw.title}</h1>
            <p className="text-[14px] text-ink-muted mt-1">{aw.artist} {aw.year ? `· ${aw.year}` : ''}</p>

            <div className="mt-6 aspect-[4/5] bg-slate-100 overflow-hidden border border-line">
              {aw.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={aw.image}
                  alt={aw.title}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-display text-[60px] text-ink-muted">
                  {aw.title[0]}
                </div>
              )}
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-y-2 text-[13px] border-t border-line pt-4">
              <dt className="text-[11px] tracking-[0.10em] uppercase text-ink-muted">Medium</dt>
              <dd className="text-ink">{aw.medium}</dd>
              <dt className="text-[11px] tracking-[0.10em] uppercase text-ink-muted">Size</dt>
              <dd className="text-ink">{dims}</dd>
            </dl>
          </div>

          <div className="mt-8">
            {platform === 'ios' ? (
              // Apple AR Quick Look spec: anchor MUST have rel="ar" AND a
              // single <img> child. The image is what user sees in the
              // pre-AR banner; we use the artwork itself for a nice preview.
              <a
                rel="ar"
                href={usdzHref}
                className="relative w-full h-14 bg-ink text-paper text-[15px] font-medium tracking-wide hover:bg-black active:scale-[.98] transition flex items-center justify-center overflow-hidden"
                onClick={armDenyCheck}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={aw.thumb || aw.image || '/transparent.png'}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-0"
                />
                <span className="relative z-[1]">Place on your wall</span>
              </a>
            ) : (
              // Android Scene Viewer: a regular anchor to the intent:// URI.
              // Same trusted-gesture rule applies; an `<a>` works, but Chrome
              // also accepts window.location.href = intent: redirect.
              <a
                href={androidHref}
                className="w-full h-14 bg-ink text-paper text-[15px] font-medium tracking-wide hover:bg-black active:scale-[.98] transition flex items-center justify-center"
                onClick={armDenyCheck}
              >
                Place on your wall
              </a>
            )}
            <p className="mt-3 text-[11px] text-ink-muted text-center leading-relaxed">
              Opens your camera in {platform === 'ios' ? 'AR Quick Look' : 'Google Scene Viewer'}.
              Point at a wall, tap to place at true size.
            </p>
            {arDenied && (
              <p className="mt-3 text-[12px] text-amber-600 text-center">
                Didn&apos;t open? Make sure you&apos;re using Safari (iOS) or Chrome (Android), then tap the button again.
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Desktop fallback — 3D preview + QR for phone hand-off
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <div className="max-w-content mx-auto px-6 md:px-12 py-10 md:py-14 grid grid-cols-1 md:grid-cols-12 gap-10">
        <div className="md:col-span-7">
          <div className="aspect-[4/5] bg-slate-100 overflow-hidden border border-line">
            <model-viewer
              src={`/ar/${sculpturePath}${aw.id}.glb`}
              camera-controls
              shadow-intensity="0.6"
              exposure="1.0"
              auto-rotate
              style={{ width: '100%', height: '100%', background: '#ece4d3' }}
            />
          </div>
        </div>
        <div className="md:col-span-5">
          <p className="text-[10px] tracking-[0.18em] uppercase text-ink-muted">ARTPIQ AR</p>
          <h1 className="font-display text-[40px] leading-tight mt-3">{aw.title}</h1>
          <p className="text-[14px] text-ink-muted mt-1">{aw.artist} {aw.year ? `· ${aw.year}` : ''}</p>

          <dl className="mt-8 grid grid-cols-2 gap-y-3 text-[13px] border-t border-line pt-5">
            <dt className="text-[11px] tracking-[0.12em] uppercase text-ink-muted">Medium</dt>
            <dd>{aw.medium}</dd>
            <dt className="text-[11px] tracking-[0.12em] uppercase text-ink-muted">Size</dt>
            <dd>{dims}</dd>
          </dl>

          <div className="mt-10 border border-line p-6 flex items-start gap-5">
            <canvas ref={qrCanvasRef} className="shrink-0" />
            <div>
              <p className="text-[11px] tracking-[0.12em] uppercase text-ink-muted">Scan to view in AR</p>
              <h3 className="font-display text-[20px] mt-2 leading-snug">
                Open this on your phone
              </h3>
              <p className="text-[12px] text-ink-muted mt-2 leading-relaxed">
                Scan with your phone camera. The AR camera will open so you can place {aw.title} on a real wall at true scale.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
