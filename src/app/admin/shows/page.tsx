'use client'
import dynamic from 'next/dynamic'
import SiteNav from '@/components/SiteNav'
const ArtShowsList = dynamic(() => import('@/components/ArtShowsList'), { ssr: false })
export default function Page() {
  return (
    <>
      <SiteNav />
      <ArtShowsList />
    </>
  )
}
