'use client'
import dynamic from 'next/dynamic'
import SiteNav from '@/components/SiteNav'

const AdminArtworks = dynamic(() => import('@/components/AdminArtworks'), { ssr: false })

export default function Page() {
  return (
    <>
      <SiteNav />
      <AdminArtworks />
    </>
  )
}
