'use client'
import dynamic from 'next/dynamic'
import { use, useEffect, useRef, useState } from 'react'
import { useStore } from '@/store'
import { ARTWORKS, fetchWikiImages } from '@/lib/artworks'
import { listWidgetArtworks } from '@/lib/db/artworks'
import { parseWidgetMode, parseWidgetParams, type WidgetParams } from '@/lib/embed/widgetParams'
import { tellHostClose, tellHostOwnClose } from '@/lib/embed/hostMessages'

const SampleRoom = dynamic(() => import('@/components/SampleRoom'), { ssr: false })
const MyWall = dynamic(() => import('@/components/MyWall'), { ssr: false })
const CatalogueGrid = dynamic(() => import('@/components/CatalogueGrid'), { ssr: false })
const DetailSheet = dynamic(() => import('@/components/DetailSheet'), { ssr: false })
const ArSheet = dynamic(() => import('@/components/organisms/ArSheet'), { ssr: false })
const Toast = dynamic(() => import('@/components/Toast'), { ssr: false })

type Status = 'loading' | 'ready' | 'error'

function Notice({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh flex items-center justify-center bg-paper text-body text-ink-muted p-6">{children}</div>
}

export default function EmbedPage({ params }: { params: Promise<{ mode: string }> }) {
  const m = parseWidgetMode(use(params).mode)
  const { setArtworks, artworks, openDetail, openMyWall, myWallOpen } = useStore()
  const [query, setQuery] = useState<WidgetParams | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const deepLinked = useRef(false)
  const wallWasOpen = useRef(false)

  // URL is only readable client-side.
  useEffect(() => {
    setQuery(parseWidgetParams(new URLSearchParams(window.location.search)))
  }, [])

  useEffect(() => {
    if (!query) return
    let cancelled = false
    if (!query.owner) {
      setArtworks([...ARTWORKS])
      setStatus('ready')
      fetchWikiImages([...ARTWORKS]).then(() => { if (!cancelled) setArtworks([...ARTWORKS]) }).catch(() => {})
    } else {
      setStatus('loading')
      // A real owner never falls back to demo art.
      listWidgetArtworks({ owner: query.owner, collections: query.collections })
        .then(list => { if (!cancelled) { setArtworks(list); setStatus('ready') } })
        .catch(() => { if (!cancelled) setStatus('error') })
    }
    return () => { cancelled = true }
  }, [query, setArtworks])

  // Run once: later artwork refreshes must not reopen what the user closed.
  useEffect(() => {
    if (status !== 'ready' || !query || deepLinked.current) return
    deepLinked.current = true
    const { artwork } = query
    if (m === 'my-wall') openMyWall(artwork ? [artwork] : [])
    if (m === 'view' && artwork) {
      const aw = artworks.find(a => a.id === artwork)
      if (aw) openDetail(aw)
    }
  }, [status, query, artworks, m, openDetail, openMyWall])

  useEffect(() => { tellHostOwnClose(myWallOpen) }, [myWallOpen])

  // Closing My Wall in the widget closes the host page's overlay.
  useEffect(() => {
    if (myWallOpen) { wallWasOpen.current = true; return }
    if (!wallWasOpen.current || m !== 'my-wall') return
    wallWasOpen.current = false
    if (window.parent === window) return
    tellHostClose()
    // The host keeps this iframe, so be back in My Wall when it reopens.
    openMyWall([])
  }, [myWallOpen, m, openMyWall])

  if (status === 'error') return <Notice>This collection is unavailable right now.</Notice>
  if (status === 'loading') return <Notice>Loading…</Notice>
  if (m === 'sample-room') return <SampleRoom />

  // Iframe-friendly: grid and overlays only, no marketing hero or footer.
  return (
    <div className="min-h-dvh bg-paper text-ink">
      {query?.owner && !artworks.length
        ? <Notice>No artworks to show yet.</Notice>
        : <CatalogueGrid />}
      <DetailSheet />
      <ArSheet />
      <MyWall />
      <Toast />
    </div>
  )
}
