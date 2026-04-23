'use client'
import { useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Share2, Smartphone, ImageIcon } from 'lucide-react'
import { useStore } from '@/store'

export default function DetailSheet() {
  const { current, detailOpen, closeDetail, openAR, openMyWall, showToast } = useStore()
  const startY = useRef(0)

  async function shareOrCopy() {
    if (!current) return
    const base = window.location.origin + window.location.pathname
    const url = `${base}?artwork=${current.id}`
    if (navigator.share) {
      try { await navigator.share({ title: `${current.title} — View in AR`, url }); return } catch {}
    }
    try { await navigator.clipboard.writeText(url); showToast('Link copied!') }
    catch { showToast('Copy: ' + url) }
  }

  if (!current) return null

  return (
    <AnimatePresence>
      {detailOpen && (
        <motion.div
          className="fixed inset-0 bg-black/78 z-[100] flex items-end justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) closeDetail() }}
        >
          <motion.div
            className="bg-[--s1] rounded-t-xl w-full max-w-lg px-[18px] pt-3 pb-9 max-h-[88dvh] overflow-y-auto"
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onTouchStart={(e) => { startY.current = e.touches[0].clientY }}
            onTouchEnd={(e) => { if (e.changedTouches[0].clientY - startY.current > 70) closeDetail() }}
          >
            {/* Handle */}
            <div className="w-9 h-1 bg-[#3a3a3a] rounded-sm mx-auto mb-3.5" />

            {current.image && (
              <img
                src={current.image}
                alt={current.title}
                referrerPolicy="no-referrer"
                className="w-full max-h-[200px] object-contain rounded-lg bg-[#111] mb-3"
              />
            )}

            <div className="flex items-start gap-2.5 mb-1.5">
              <div className="flex-1">
                <div className="text-[17px] font-bold mb-0.5">{current.title}</div>
                <div className="text-[11px] text-[--muted]">{current.artist} · {current.year} · {current.medium}</div>
              </div>
              <button
                onClick={shareOrCopy}
                className="flex-shrink-0 bg-transparent border border-[--border] text-[--muted] w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors hover:text-[--text] hover:border-[--muted]"
                title="Share artwork link"
              >
                <Share2 size={14} />
              </button>
            </div>

            {current.description && (
              <p className="text-[12px] text-[--muted] leading-relaxed mb-2.5">{current.description}</p>
            )}

            <div className="flex gap-4 mb-3.5 p-2.5 px-3 bg-[--s2] rounded-lg">
              <div>
                <div className="text-[10px] text-[--muted] uppercase tracking-wide mb-0.5">Width</div>
                <div className="text-[13px] font-bold">{current.widthCm} cm</div>
              </div>
              <div>
                <div className="text-[10px] text-[--muted] uppercase tracking-wide mb-0.5">Height</div>
                <div className="text-[13px] font-bold">{current.heightCm} cm</div>
              </div>
              <div>
                <div className="text-[10px] text-[--muted] uppercase tracking-wide mb-0.5">Type</div>
                <div className="text-[13px] font-bold">{current.type === 'sculpture' ? '3D' : 'Flat'}</div>
              </div>
            </div>

            <div className="flex gap-2">
              {current.type === 'painting' && (
                <button
                  onClick={() => openMyWall(current)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3.5 px-2 rounded-[10px] bg-[--s2] text-[--text] text-[14px] font-bold transition-opacity active:scale-95 cursor-pointer"
                >
                  <ImageIcon size={16} />
                  My Wall
                </button>
              )}
              <button
                onClick={() => openAR(current)}
                className="flex-1 flex items-center justify-center gap-1.5 py-3.5 px-2 rounded-[10px] bg-[--accent] text-[#0c0c0c] text-[14px] font-bold transition-opacity active:scale-95 cursor-pointer"
              >
                <Smartphone size={16} />
                View in AR
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
