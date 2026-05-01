'use client'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useStore } from '@/store'
import { ARTWORKS } from '@/lib/artworks'

export default function GalleryBar() {
  const { selectedIds, isSelectMode, exitSelectMode, openMyWall, openGalleryAR, showToast } = useStore()

  if (!isSelectMode || selectedIds.size === 0) return null

  const selected = [...selectedIds]
    .map(id => ARTWORKS.find(a => a.id === id))
    .filter(Boolean) as typeof ARTWORKS

  function toMyWall() {
    if (selected.length < 1) { showToast('Select at least one painting'); return }
    const ids = selected.map(a => a.id)
    exitSelectMode()
    openMyWall(ids)
  }

  function toGalleryAR() {
    const paintings = selected.filter(a => a.type === 'painting')
    if (paintings.length < 1) { showToast('Select at least one painting'); return }
    if (paintings.length > 1) {
      showToast('AR shows one artwork — first selection used')
    }
    openGalleryAR([paintings[0].id])
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-[90] bg-paper border-t border-line"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <div className="max-w-content mx-auto px-6 md:px-12 lg:px-20 py-4 flex items-center gap-4">
          <div className="flex -space-x-2">
            {selected.slice(0, 6).map(aw => aw.thumb ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={aw.id}
                src={aw.thumb}
                alt={aw.title}
                referrerPolicy="no-referrer-when-downgrade"
                className="w-10 h-10 object-cover border border-line bg-surface"
              />
            ) : null)}
          </div>
          <p className="text-[12px] tracking-[0.12em] uppercase text-ink-muted">
            {selectedIds.size} selected
          </p>
          <div className="flex-1" />
          <button
            onClick={exitSelectMode}
            className="h-10 px-3 text-[12px] text-ink-muted hover:text-ink"
          >
            Clear
          </button>
          <button
            onClick={toGalleryAR}
            className="h-10 px-4 bg-transparent text-ink border border-ink text-[13px] hover:bg-ink hover:text-paper transition-colors"
          >
            View in AR
          </button>
          <button
            onClick={toMyWall}
            className="h-10 px-4 bg-accent text-accent-ink text-[13px] inline-flex items-center gap-2 hover:bg-ink transition-colors"
          >
            My Wall <ArrowRight size={14} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
