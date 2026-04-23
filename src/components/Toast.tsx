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
          className="fixed bottom-6 left-1/2 z-[9999] bg-[#2a2a2a] text-[--text] px-[18px] py-2.5 rounded-full text-[13px] pointer-events-none whitespace-nowrap"
          style={{ x: '-50%' }}
          initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        >
          {toast.msg}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
