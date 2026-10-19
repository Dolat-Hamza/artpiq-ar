'use client'
import dynamic from 'next/dynamic'

const SquarespaceSyncAdmin = dynamic(() => import('@/components/SquarespaceSyncAdmin'), { ssr: false })

export default function Page() {
  return <SquarespaceSyncAdmin />
}
