'use client'
import dynamic from 'next/dynamic'
import { use, useEffect } from 'react'
import { useStore } from '@/store'
import { ARTWORKS, fetchWikiImages } from '@/lib/artworks'

const SampleRoom = dynamic(() => import('@/components/SampleRoom'), { ssr: false })
const MyWall = dynamic(() => import('@/components/MyWall'), { ssr: false })
const Catalogue = dynamic(() => import('@/components/Catalogue'), { ssr: false })
const DetailSheet = dynamic(() => import('@/components/DetailSheet'), { ssr: false })
const ARLauncher = dynamic(() => import('@/components/ARLauncher'), { ssr: false })
const Toast = dynamic(() => import('@/components/Toast'), { ssr: false })

type Mode = 'view' | 'sample-room' | 'my-wall'

export default function EmbedPage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = use(params)
  const m = (['view', 'sample-room', 'my-wall'].includes(mode) ? mode : 'view') as Mode
  const { setArtworks, artworks, openDetail, openMyWall } = useStore()

  useEffect(() => {
    setArtworks([...ARTWORKS])
    fetchWikiImages([...ARTWORKS]).then(() => setArtworks([...ARTWORKS])).catch(() => {})
  }, [setArtworks])

  // deep-link via ?artwork=id (SQSP product-page integration)
  useEffect(() => {
    if (!artworks.length) return
    const id = new URLSearchParams(window.location.search).get('artwork')
    if (!id) return
    const aw = artworks.find(a => a.id === id)
    if (!aw) return
    if (m === 'view') openDetail(aw)
    if (m === 'my-wall') openMyWall([aw.id])
  }, [artworks, m, openDetail, openMyWall])

  if (m === 'sample-room') return <SampleRoom />

  // view + my-wall both render catalogue+overlays. Iframe-friendly: no header.
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <Catalogue />
      <DetailSheet />
      <ARLauncher />
      <MyWall />
      <Toast />
    </div>
  )
}
