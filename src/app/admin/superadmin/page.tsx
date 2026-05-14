'use client'
import dynamic from 'next/dynamic'

const SuperAdmin = dynamic(() => import('@/components/SuperAdmin'), { ssr: false })

export default function Page() {
  return <SuperAdmin />
}
