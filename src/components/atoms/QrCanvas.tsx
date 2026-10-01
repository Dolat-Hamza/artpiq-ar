'use client'
import { useEffect, useRef } from 'react'

interface Props {
  value: string
  size?: number
  className?: string
}

export default function QrCanvas({ value, size = 220, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let cancelled = false
    import('qrcode').then(QRCode => {
      if (cancelled || !ref.current) return
      QRCode.toCanvas(ref.current, value, {
        width: size,
        margin: 1,
        color: { dark: '#1E293B', light: '#ffffff' },
      })
    })
    return () => { cancelled = true }
  }, [value, size])

  return <canvas ref={ref} width={size} height={size} className={className} />
}
