'use client'
import dynamic from 'next/dynamic'

const PresentationsAdmin = dynamic(() => import('@/components/PresentationsAdmin'), { ssr: false })

export default function Page() {
  return <PresentationsAdmin />
}
