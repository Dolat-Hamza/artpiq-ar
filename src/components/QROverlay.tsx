'use client'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '@/store'
import QrCanvas from '@/components/atoms/QrCanvas'

// Only called while open, so window is defined.
function shareUrl(artworkId?: string) {
  const base = window.location.origin + window.location.pathname
  return artworkId ? `${base}?artwork=${artworkId}` : base
}

export default function QROverlay() {
  const { qrOpen, closeQR, current } = useStore()

  return (
    <AnimatePresence>
      {qrOpen && (
        <motion.div
          className="fixed inset-0 z-[200] bg-ink/50 flex items-center justify-center p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) closeQR() }}
        >
          <motion.div
            className="bg-paper border border-line p-8 text-center max-w-[320px]"
            initial={{ scale: .96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .96, opacity: 0 }}
          >
            <p className="text-[11px] tracking-[0.18em] uppercase text-ink-muted mb-3">Scan to view</p>
            <h3 className="font-display text-[22px] leading-tight mb-5">
              Continue on your phone
            </h3>
            <QrCanvas value={shareUrl(current?.id)} size={240} className="mx-auto" />
            <button
              onClick={closeQR}
              className="mt-5 h-10 px-5 border border-ink text-ink text-[12px] hover:bg-ink hover:text-paper transition-colors"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
