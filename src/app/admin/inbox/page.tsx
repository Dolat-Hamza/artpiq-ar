'use client'
import dynamic from 'next/dynamic'
import MarketingTabs from '@/components/ui/MarketingTabs'

const InboxAdmin = dynamic(() => import('@/components/InboxAdmin'), { ssr: false })

export default function Page() {
  return (
    <>
      <MarketingTabs />
      <InboxAdmin />
    </>
  )
}
