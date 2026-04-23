'use client'
import { useEffect } from 'react'
import { useStore } from '@/store'
import { ARTWORKS, fetchWikiImages } from '@/lib/artworks'
import Header from './Header'
import Catalogue from './Catalogue'
import DetailSheet from './DetailSheet'
import ARViewer from './ARViewer'
import MyWallViewer from './MyWallViewer'
import WebXRViewer from './WebXRViewer'
import GalleryARViewer from './GalleryARViewer'
import QROverlay from './QROverlay'
import GalleryBar from './GalleryBar'
import Toast from './Toast'

export default function AppShell() {
  const { setArtworks, artworks, openDetail } = useStore()

  useEffect(() => {
    // Render immediately with hardcoded images
    setArtworks([...ARTWORKS])
    // Upgrade to higher-res wiki images in background
    fetchWikiImages([...ARTWORKS]).then(() => setArtworks([...ARTWORKS])).catch(() => {})
  }, [setArtworks])

  // Deep-link: ?artwork=id → open detail sheet
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('artwork')
    if (!id || !artworks.length) return
    const aw = artworks.find(a => a.id === id)
    if (aw) openDetail(aw)
  }, [artworks, openDetail])

  return (
    <div className="min-h-dvh bg-[--bg] text-[--text]">
      <Header />
      <Catalogue />
      <DetailSheet />
      <ARViewer />
      <MyWallViewer />
      <WebXRViewer />
      <GalleryARViewer />
      <QROverlay />
      <GalleryBar />
      <Toast />
    </div>
  )
}
