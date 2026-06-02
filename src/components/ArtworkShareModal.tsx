'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Check, Copy, AlertTriangle } from 'lucide-react'
import type { Artwork } from '@/types'

// Per-artwork share/embed modal. Three tabs:
//   1. Link — direct anchor URL for buttons / email / social
//   2. Iframe — drop into Squarespace / Webflow Code block (camera/AR allow attrs included)
//   3. QR — printable QR PNG + raw URL fallback
//
// Privacy gate: artwork must be `privacy: 'public'` for the QR URL to load
// (RLS scopes anon SELECT to public rows). Modal surfaces a warning + one-click
// fix when the artwork is private; the actual privacy flip is done back in the
// editor since we don't own state here.

type Tab = 'link' | 'iframe' | 'qr'

interface Props {
  artwork: Artwork
  origin?: string             // override for tests; defaults to window.location.origin
  onClose: () => void
  // When privacy is private and the user clicks 'Make public', the parent
  // flips the field. Saving still up to the parent's existing Save flow.
  onRequestMakePublic?: () => void
}

function buildIframe(url: string): string {
  // allow attrs are essential — without them iOS Safari refuses to fire
  // Quick Look from inside an iframe.
  return `<iframe
  src="${url}"
  width="100%"
  height="800"
  style="border:0;max-width:520px;display:block;margin:0 auto;"
  allow="camera; xr-spatial-tracking; accelerometer; gyroscope"
  loading="lazy"
></iframe>`
}

function buildQrCardHtml(url: string, title: string): string {
  // Uses a free public QR generator that returns a PNG. No script, no auth.
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(url)}`
  const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<div style="text-align:center;padding:24px;border:1px solid #e6e6e6;max-width:300px;margin:0 auto;font-family:sans-serif">
  <img src="${qrSrc}" width="240" height="240" alt="Scan to view in AR" />
  <p style="margin:12px 0 4px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#737373">Scan to view in AR</p>
  <p style="margin:0;font-size:14px">${safeTitle}</p>
</div>`
}

export default function ArtworkShareModal({ artwork, origin: originProp, onClose, onRequestMakePublic }: Props) {
  const [tab, setTab] = useState<Tab>('link')
  const [origin, setOrigin] = useState(originProp ?? '')
  const [copied, setCopied] = useState<Tab | null>(null)
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!originProp && typeof window !== 'undefined') setOrigin(window.location.origin)
  }, [originProp])

  const url = origin ? `${origin}/ar/${artwork.id}` : `/ar/${artwork.id}`
  const isPublic = (artwork.privacy ?? 'public') === 'public'

  const payload = useMemo(() => ({
    link: url,
    iframe: buildIframe(url),
    qr: buildQrCardHtml(url, artwork.title),
  }), [url, artwork.title])

  // Render QR canvas on the QR tab (in addition to the printable HTML snippet).
  useEffect(() => {
    if (tab !== 'qr' || !qrCanvasRef.current) return
    let cancelled = false
    import('qrcode').then(QRCode => {
      if (cancelled || !qrCanvasRef.current) return
      QRCode.toCanvas(qrCanvasRef.current, url, {
        width: 220,
        margin: 1,
        color: { dark: '#141210', light: '#ffffff' },
      })
    })
    return () => { cancelled = true }
  }, [tab, url])

  async function copy(content: string, which: Tab) {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(which)
      setTimeout(() => setCopied(null), 1800)
    } catch {
      // Fallback for non-https contexts: nothing graceful to do here other
      // than highlight the textarea so the user can ctrl-c manually.
    }
  }

  function downloadQrPng() {
    if (!qrCanvasRef.current) return
    const a = document.createElement('a')
    a.href = qrCanvasRef.current.toDataURL('image/png')
    a.download = `artpiq-ar-${artwork.id}.png`
    a.click()
  }

  return (
    <div
      className="fixed inset-0 z-[400] bg-black/50 grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] bg-paper rounded-md shadow-pop max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <header className="sticky top-0 bg-paper border-b border-line px-5 h-14 flex items-center justify-between z-10">
          <h2 className="font-display text-[14px] tracking-[0.18em] uppercase">Share &amp; embed</h2>
          <button onClick={onClose} className="p-2 hover:bg-bg rounded" aria-label="Close">
            <X size={16} />
          </button>
        </header>

        <div className="px-5 py-4">
          <p className="text-[12px] text-ink-muted leading-relaxed">
            Embed the AR camera flow on your website. Scan or tap → phone camera → place this artwork on a real wall at true scale.
          </p>

          {!isPublic && (
            <div className="mt-4 border border-amber-400 bg-amber-50 px-3 py-2.5 rounded flex items-start gap-2">
              <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
              <div className="text-[12px] text-amber-900 leading-relaxed flex-1">
                This artwork is private — visitors will see a 404 until you flip it to public.
                {onRequestMakePublic && (
                  <button
                    onClick={onRequestMakePublic}
                    className="ml-2 underline font-medium hover:no-underline"
                  >
                    Make public
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="mt-4 flex gap-1 border-b border-line">
            {(['link', 'iframe', 'qr'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-2 text-[12px] tracking-[0.1em] uppercase border-b-2 -mb-px ${tab === t ? 'border-ink text-ink font-semibold' : 'border-transparent text-ink-muted hover:text-ink'}`}
              >
                {t === 'link' ? 'Link' : t === 'iframe' ? 'Iframe' : 'QR code'}
              </button>
            ))}
          </div>

          {/* Tab body */}
          <div className="mt-4">
            {tab === 'link' && (
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-ink-muted font-semibold mb-1.5">
                  Direct URL
                </label>
                <div className="flex gap-2">
                  <input className="input flex-1 font-mono text-[12px]" readOnly value={payload.link} />
                  <button onClick={() => copy(payload.link, 'link')} className="btn-outline shrink-0 flex items-center gap-1.5">
                    {copied === 'link' ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                  </button>
                </div>
                <p className="text-[11px] text-ink-muted mt-2 leading-relaxed">
                  Paste as a button URL on Squarespace, Substack, or anywhere a link goes.
                </p>
                <a href={payload.link} target="_blank" rel="noopener noreferrer" className="text-[12px] underline text-ink mt-2 inline-block">
                  Open preview →
                </a>
              </div>
            )}

            {tab === 'iframe' && (
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-ink-muted font-semibold mb-1.5">
                  Embed HTML (Squarespace, Webflow, Wordpress …)
                </label>
                <textarea
                  className="input w-full font-mono text-[11px] min-h-[140px]"
                  readOnly
                  value={payload.iframe}
                />
                <div className="flex justify-end mt-2">
                  <button onClick={() => copy(payload.iframe, 'iframe')} className="btn-outline flex items-center gap-1.5">
                    {copied === 'iframe' ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy embed code</>}
                  </button>
                </div>
                <p className="text-[11px] text-ink-muted mt-2 leading-relaxed">
                  On Squarespace: <span className="font-medium">Add Block → Code → paste</span>. The <code className="font-mono">allow</code> attributes
                  are required for iOS Safari to launch Quick Look from inside the iframe.
                </p>
              </div>
            )}

            {tab === 'qr' && (
              <div>
                <div className="flex items-start gap-4 mb-4">
                  <div className="border border-line p-2 shrink-0">
                    <canvas ref={qrCanvasRef} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[12px] text-ink-muted leading-relaxed">
                      Print this QR on a wall card next to the artwork. Visitors scan with their phone camera and land directly on the AR launcher.
                    </p>
                    <button onClick={downloadQrPng} className="btn-outline mt-3">
                      Download PNG
                    </button>
                  </div>
                </div>

                <label className="block text-[11px] uppercase tracking-wider text-ink-muted font-semibold mb-1.5">
                  Or paste this HTML to render a QR card on a webpage
                </label>
                <textarea
                  className="input w-full font-mono text-[11px] min-h-[120px]"
                  readOnly
                  value={payload.qr}
                />
                <div className="flex justify-end mt-2">
                  <button onClick={() => copy(payload.qr, 'qr')} className="btn-outline flex items-center gap-1.5">
                    {copied === 'qr' ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy HTML</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
