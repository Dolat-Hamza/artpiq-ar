'use client'
import dynamic from 'next/dynamic'

const DesignsGrid = dynamic(() => import('@/components/DesignsGrid'), { ssr: false })

export default function Page() {
  return (
    <>
      <DesignsGrid />
    </>
  )
}
