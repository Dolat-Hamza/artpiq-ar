'use client'
import { useEffect } from 'react'
import { useStore } from '@/store'
import { ARTWORKS, fetchWikiImages } from '@/lib/artworks'
import Header from './Header'
import Catalogue from './Catalogue'
import DetailSheet from './DetailSheet'
import ARLauncher from './ARLauncher'
import GalleryAR from './GalleryAR'
import MyWall from './MyWall'
import QROverlay from './QROverlay'
import GalleryBar from './GalleryBar'
import Toast from './Toast'

export default function AppShell() {
  const { setArtworks, artworks, openDetail } = useStore()

  useEffect(() => {
    setArtworks([...ARTWORKS])
    fetchWikiImages([...ARTWORKS]).then(() => setArtworks([...ARTWORKS])).catch(() => {})
  }, [setArtworks])

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('artwork')
    if (!id || !artworks.length) return
    const aw = artworks.find(a => a.id === id)
    if (aw) openDetail(aw)
  }, [artworks, openDetail])

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <Header />
      <Catalogue />
      <DetailSheet />
      <ARLauncher />
      <GalleryAR />
      <MyWall />
      <QROverlay />
      <GalleryBar />
      <Toast />
    </div>
  )
}
