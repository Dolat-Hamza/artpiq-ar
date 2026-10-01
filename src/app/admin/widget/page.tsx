'use client'
import dynamic from 'next/dynamic'

const WidgetAdmin = dynamic(() => import('@/components/WidgetAdmin'), { ssr: false })

export default function Page() {
  return <WidgetAdmin />
}
