'use client'
import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { useStore } from '@/store'
import { ARTWORKS, fetchWikiImages } from '@/lib/artworks'
import { listArtworks } from '@/lib/db/artworks'
import { hasSupabase } from '@/lib/db/client'
import SiteNav from '@/components/SiteNav'

const SampleRoom = dynamic(() => import('@/components/SampleRoom'), { ssr: false })

export default function Page() {
  const { setArtworks } = useStore()
  useEffect(() => {
    setArtworks([...ARTWORKS])
    fetchWikiImages([...ARTWORKS]).then(() => setArtworks([...ARTWORKS])).catch(() => {})
    if (hasSupabase()) {
      listArtworks()
        .then(db => {
          if (db.length) {
            const ids = new Set(db.map(a => a.id))
            setArtworks([...db, ...ARTWORKS.filter(a => !ids.has(a.id))])
          }
        })
        .catch(() => {})
    }
  }, [setArtworks])
  return (
    <>
      <SiteNav />
      <SampleRoom />
    </>
  )
}
