'use client'
import dynamic from 'next/dynamic'
const DiscoverProfileEditor = dynamic(() => import('@/components/DiscoverProfileEditor'), { ssr: false })
export default function Page() {
  return (
    <>
      <DiscoverProfileEditor />
    </>
  )
}
