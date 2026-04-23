'use client'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Share2 } from 'lucide-react'
import { useStore } from '@/store'

export default function DetailSheet() {
  const { current, detailOpen, closeDetail, openAR, openMyWall, showToast } = useStore()

  async function share() {
    if (!current) return
    const url = `${window.location.origin}${window.location.pathname}?artwork=${current.id}`
    if (navigator.share) {
      try { await navigator.share({ title: current.title, url }); return } catch {}
    }
    try { await navigator.clipboard.writeText(url); showToast('Link copied') }
    catch { showToast(url) }
  }

  if (!current) return null

  const sizeLabel = current.type === 'sculpture'
    ? `${current.heightCm} cm tall`
    : `${current.widthCm} × ${current.heightCm} cm`

  return (
    <AnimatePresence>
      {detailOpen && (
        <motion.div
          key="backdrop"
          className="fixed inset-0 z-[100] bg-ink/40"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={closeDetail}
        >
          <motion.aside
            className="absolute inset-0 md:left-auto md:top-0 md:right-0 md:bottom-0 md:w-[min(920px,90vw)] bg-paper flex flex-col md:flex-row overflow-hidden"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
            onClick={e => e.stopPropagation()}
          >
            <div className="relative md:flex-1 bg-[#ece4d3] md:min-h-full">
              {current.image ? (
                <img
                  src={current.image}
                  alt={current.title}
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-full max-h-[45vh] md:max-h-none object-contain md:object-cover"
                />
              ) : (
                <div className="w-full h-full min-h-[45vh] flex items-center justify-center">
                  <span className="font-display text-[72px] text-ink-muted">
                    {current.type === 'sculpture' ? 'III' : 'II'}
                  </span>
                </div>
              )}
              <button
                onClick={closeDetail}
                className="absolute top-4 left-4 h-10 w-10 bg-paper border border-line flex items-center justify-center text-ink hover:border-ink"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="md:w-[380px] lg:w-[420px] flex-shrink-0 flex flex-col border-t md:border-t-0 md:border-l border-line overflow-y-auto">
              <div className="flex-1 p-6 md:p-10">
                <p className="text-[11px] tracking-[0.18em] uppercase text-ink-muted mb-4">
                  {current.type === 'sculpture' ? 'Sculpture' : 'Painting'}
                </p>
                <h2 className="font-display text-[32px] md:text-[40px] leading-[1.05] tracking-tight text-ink">
                  {current.title}
                </h2>
                <p className="mt-3 text-[14px] text-ink-muted">
                  {current.artist} — {current.year}
                </p>

                <dl className="mt-8 grid grid-cols-2 gap-y-4 text-[13px] border-t border-line pt-6">
                  <dt className="text-[11px] tracking-[0.12em] uppercase text-ink-muted">Medium</dt>
                  <dd className="text-ink">{current.medium}</dd>
                  <dt className="text-[11px] tracking-[0.12em] uppercase text-ink-muted">Dimensions</dt>
                  <dd className="text-ink">{sizeLabel}</dd>
                  <dt className="text-[11px] tracking-[0.12em] uppercase text-ink-muted">Year</dt>
                  <dd className="text-ink">{current.year}</dd>
                </dl>

                {current.description && (
                  <p className="mt-8 text-[14px] leading-relaxed text-ink border-t border-line pt-6">
                    {current.description}
                  </p>
                )}
              </div>

              <div className="p-6 md:p-10 border-t border-line bg-surface flex flex-col gap-3">
                {current.type === 'painting' && (
                  <button
                    onClick={() => openMyWall([current.id])}
                    className="h-12 px-5 bg-accent text-accent-ink text-[14px] hover:bg-ink transition-colors"
                  >
                    Try on My Wall
                  </button>
                )}
                <button
                  onClick={() => openAR(current)}
                  className="h-12 px-5 bg-transparent text-ink border border-ink text-[14px] hover:bg-ink hover:text-paper transition-colors"
                >
                  View in AR
                </button>
                <button
                  onClick={share}
                  className="h-10 text-[12px] text-ink-muted hover:text-ink transition-colors inline-flex items-center justify-center gap-2"
                >
                  <Share2 size={13} /> Share this work
                </button>
              </div>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
