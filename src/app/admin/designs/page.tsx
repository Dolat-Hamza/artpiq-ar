'use client'
import dynamic from 'next/dynamic'
import SiteNav from '@/components/SiteNav'

const DesignsGrid = dynamic(() => import('@/components/DesignsGrid'), { ssr: false })

export default function Page() {
  return (
    <>
      <SiteNav />
      <DesignsGrid />
    </>
  )
}
