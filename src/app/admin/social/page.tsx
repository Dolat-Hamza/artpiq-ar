'use client'
import dynamic from 'next/dynamic'

const SocialCalendar = dynamic(() => import('@/components/SocialCalendar'), { ssr: false })

export default function Page() {
  return <SocialCalendar />
}
