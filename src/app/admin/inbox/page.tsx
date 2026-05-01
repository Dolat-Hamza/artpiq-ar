'use client'
import dynamic from 'next/dynamic'
import SiteNav from '@/components/SiteNav'
const InboxAdmin = dynamic(() => import('@/components/InboxAdmin'), { ssr: false })
export default function Page() {
  return (
    <>
      <SiteNav />
      <InboxAdmin />
    </>
  )
}
