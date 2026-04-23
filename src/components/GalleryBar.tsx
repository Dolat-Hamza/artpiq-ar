'use client'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { useStore } from '@/store'
import { ARTWORKS } from '@/lib/artworks'

/** True if device supports WebXR immersive-ar (Android Chrome, Oculus) */
async function hasWebXR(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.xr) return false
  try { return await navigator.xr.isSessionSupported('immersive-ar') }
  catch { return false }
}

export default function GalleryBar() {
  const { selectedIds, isSelectMode, exitSelectMode, openXR, openGalleryAR, showToast } = useStore()

  if (!isSelectMode || selectedIds.size === 0) return null

  const selected = [...selectedIds]
    .map(id => ARTWORKS.find(a => a.id === id))
    .filter(Boolean) as typeof ARTWORKS

  async function launchGalleryAR() {
    if (selected.length < 2) { showToast('Select at least 2 paintings'); return }
    exitSelectMode()

    const webxrOk = await hasWebXR()
    if (webxrOk) {
      // Android/Chrome: place artworks individually via WebXR
      openXR(selected)
    } else {
      // iOS / unsupported: combined GLB via model-viewer Quick Look
      openGalleryAR(selected)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-[90] bg-[rgba(12,12,12,.96)] backdrop-blur-xl border-t border-[--border] px-4 pt-3 pb-6 flex flex-col gap-2.5"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5 flex-1 overflow-hidden">
            {selected.map(aw => aw.thumb ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={aw.id}
                src={aw.thumb}
                alt={aw.title}
                referrerPolicy="no-referrer-when-downgrade"
                className="w-10 h-10 rounded-md object-cover border border-[--border] bg-[#222] flex-shrink-0"
              />
            ) : null)}
          </div>
          <div className="text-[13px] font-bold text-[--accent] whitespace-nowrap">
            {selectedIds.size} {selectedIds.size === 1 ? 'painting' : 'paintings'}
          </div>
          <button
            onClick={exitSelectMode}
            className="bg-transparent border-none text-[--muted] text-[12px] cursor-pointer p-0"
          >
            ✕ Clear
          </button>
        </div>
        <button
          onClick={launchGalleryAR}
          className="bg-[--accent] border-none text-[#0c0c0c] py-3.5 rounded-[12px] text-[14px] font-extrabold cursor-pointer w-full flex items-center justify-center gap-2 active:opacity-85 active:scale-[.98] transition-all"
        >
          <Sparkles size={16} /> View Gallery in AR
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
