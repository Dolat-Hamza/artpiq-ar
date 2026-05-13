'use client'
import dynamic from 'next/dynamic'
import MarketingTabs from '@/components/ui/MarketingTabs'

const SocialCalendar = dynamic(() => import('@/components/SocialCalendar'), { ssr: false })

export default function Page() {
  return (
    <>
      <MarketingTabs />
      <SocialCalendar />
    </>
  )
}
