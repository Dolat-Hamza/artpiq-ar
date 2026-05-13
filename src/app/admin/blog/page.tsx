'use client'
import dynamic from 'next/dynamic'
import MarketingTabs from '@/components/ui/MarketingTabs'

const BlogList = dynamic(() => import('@/components/BlogList'), { ssr: false })

export default function Page() {
  return (
    <>
      <MarketingTabs />
      <BlogList />
    </>
  )
}
