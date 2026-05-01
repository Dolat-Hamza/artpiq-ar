'use client'
import dynamic from 'next/dynamic'
import SiteNav from '@/components/SiteNav'
const DiscoverProfileEditor = dynamic(() => import('@/components/DiscoverProfileEditor'), { ssr: false })
export default function Page() {
  return (
    <>
      <SiteNav />
      <DiscoverProfileEditor />
    </>
  )
}
