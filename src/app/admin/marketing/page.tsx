'use client'
import dynamic from 'next/dynamic'
import MarketingTabs from '@/components/ui/MarketingTabs'

const MarketingPortal = dynamic(() => import('@/components/MarketingPortal'), { ssr: false })

export default function Page() {
  return (
    <>
      <MarketingTabs />
      <MarketingPortal />
    </>
  )
}
