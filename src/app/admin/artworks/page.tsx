'use client'
import dynamic from 'next/dynamic'

const AdminArtworks = dynamic(() => import('@/components/AdminArtworks'), { ssr: false })

export default function Page() {
  return <AdminArtworks />
}
