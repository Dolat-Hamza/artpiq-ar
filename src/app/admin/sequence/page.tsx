'use client'
import dynamic from 'next/dynamic'

const SequenceAdmin = dynamic(() => import('@/components/SequenceAdmin'), { ssr: false })

export default function Page() {
  return <SequenceAdmin />
}
