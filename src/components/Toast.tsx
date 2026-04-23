'use client'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '@/store'

export default function Toast() {
  const { toast } = useStore()
  return (
    <AnimatePresence>
      {toast.visible && (
        <motion.div
          key={toast.msg}
          className="fixed bottom-6 left-1/2 z-[9999] bg-ink text-paper px-5 py-2.5 text-[12px] tracking-wide pointer-events-none whitespace-nowrap"
          style={{ x: '-50%' }}
          initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {toast.msg}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
