'use client'
import { use } from 'react'
import dynamic from 'next/dynamic'
import SiteNav from '@/components/SiteNav'
const ArtShowEditor = dynamic(() => import('@/components/ArtShowEditor'), { ssr: false })
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <>
      <SiteNav />
      <ArtShowEditor id={id} />
    </>
  )
}
