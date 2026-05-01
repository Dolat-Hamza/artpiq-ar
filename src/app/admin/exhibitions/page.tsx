'use client'
import dynamic from 'next/dynamic'
import SiteNav from '@/components/SiteNav'
const ExhibitionsList = dynamic(() => import('@/components/ExhibitionsList'), { ssr: false })
export default function Page() {
  return (
    <>
      <SiteNav />
      <ExhibitionsList />
    </>
  )
}
