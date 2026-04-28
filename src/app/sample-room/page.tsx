'use client'
import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { useStore } from '@/store'
import { ARTWORKS, fetchWikiImages } from '@/lib/artworks'
import SiteNav from '@/components/SiteNav'

const SampleRoom = dynamic(() => import('@/components/SampleRoom'), { ssr: false })

export default function Page() {
  const { setArtworks } = useStore()
  useEffect(() => {
    setArtworks([...ARTWORKS])
    fetchWikiImages([...ARTWORKS]).then(() => setArtworks([...ARTWORKS])).catch(() => {})
  }, [setArtworks])
  return (
    <>
      <SiteNav />
      <SampleRoom />
    </>
  )
}
