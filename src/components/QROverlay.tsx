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
    const url  = current ? `${base}?artwork=${current.id}` : base
    import('qrcode').then(QRCode => {
      QRCode.toCanvas(canvasRef.current!, url, {
        width: 220, color: { dark: '#191919', light: '#ffffff' },
      })
    })
  }, [qrOpen, current])

  return (
    <AnimatePresence>
      {qrOpen && (
        <motion.div
          className="fixed inset-0 z-[200] bg-black/85 flex items-center justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) closeQR() }}
        >
          <motion.div
            className="bg-[--s1] rounded-xl p-6 text-center max-w-[280px] shadow-art"
            initial={{ scale: .9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .9, opacity: 0 }}
          >
            <h3 className="text-[15px] font-semibold mb-1">Scan to view in AR</h3>
            <p className="text-[11px] text-[--muted] mb-3.5 leading-relaxed">Open on your phone to place this artwork in your space</p>
            <canvas ref={canvasRef} className="rounded-md" />
            <button
              onClick={closeQR}
              className="block mt-3 mx-auto bg-transparent border border-[--border] text-[--text] px-[18px] py-1.5 rounded-lg cursor-pointer text-[12px]"
            >Close</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
