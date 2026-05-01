'use client'
import dynamic from 'next/dynamic'
const InboxAdmin = dynamic(() => import('@/components/InboxAdmin'), { ssr: false })
export default function Page() {
  return (
    <>
      <InboxAdmin />
    </>
  )
}
