'use client'
import dynamic from 'next/dynamic'
const ArtShowsList = dynamic(() => import('@/components/ArtShowsList'), { ssr: false })
export default function Page() {
  return (
    <>
      <ArtShowsList />
    </>
  )
}
