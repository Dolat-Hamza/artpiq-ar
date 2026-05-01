'use client'
import { use } from 'react'
import dynamic from 'next/dynamic'
const ArtShowEditor = dynamic(() => import('@/components/ArtShowEditor'), { ssr: false })
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <>
      <ArtShowEditor id={id} />
    </>
  )
}
