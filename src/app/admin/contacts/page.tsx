'use client'
import dynamic from 'next/dynamic'
import SiteNav from '@/components/SiteNav'
const ContactsAdmin = dynamic(() => import('@/components/ContactsAdmin'), { ssr: false })
export default function Page() {
  return (
    <>
      <SiteNav />
      <ContactsAdmin />
    </>
  )
}
