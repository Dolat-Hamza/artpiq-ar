'use client'
import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '@/store'

export default function QROverlay() {
  const { qrOpen, closeQR, current } = useStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!qrOpen || !canvasRef.current) return
    const base = window.location.origin + window.location.pathname
    const url = current ? `${base}?artwork=${current.id}` : base
    import('qrcode').then(QRCode => {
      QRCode.toCanvas(canvasRef.current!, url, {
        width: 240, color: { dark: '#141210', light: '#faf7f2' },
      })
    })
  }, [qrOpen, current])

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
            <canvas ref={canvasRef} className="mx-auto" />
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
