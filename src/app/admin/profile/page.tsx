'use client'
import dynamic from 'next/dynamic'
import MarketingTabs from '@/components/ui/MarketingTabs'

const DiscoverProfileEditor = dynamic(() => import('@/components/DiscoverProfileEditor'), { ssr: false })

export default function Page() {
  return (
    <>
      <MarketingTabs />
      <DiscoverProfileEditor />
    </>
  )
}
