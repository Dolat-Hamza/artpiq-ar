'use client'
import dynamic from 'next/dynamic'

const MarketingPortal = dynamic(() => import('@/components/MarketingPortal'), { ssr: false })

export default function Page() {
  return <MarketingPortal />
}
