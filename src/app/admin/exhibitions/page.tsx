'use client'
import dynamic from 'next/dynamic'
const ExhibitionsList = dynamic(() => import('@/components/ExhibitionsList'), { ssr: false })
export default function Page() {
  return (
    <>
      <ExhibitionsList />
    </>
  )
}
