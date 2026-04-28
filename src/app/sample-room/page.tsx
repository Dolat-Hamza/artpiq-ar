'use client'
import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { useStore } from '@/store'
import { ARTWORKS, fetchWikiImages } from '@/lib/artworks'

const SampleRoom = dynamic(() => import('@/components/SampleRoom'), { ssr: false })

export default function Page() {
  const { setArtworks } = useStore()
  useEffect(() => {
    setArtworks([...ARTWORKS])
    fetchWikiImages([...ARTWORKS]).then(() => setArtworks([...ARTWORKS])).catch(() => {})
  }, [setArtworks])
  return <SampleRoom />
}
