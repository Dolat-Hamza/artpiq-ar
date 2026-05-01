'use client'
import dynamic from 'next/dynamic'
const ContactsAdmin = dynamic(() => import('@/components/ContactsAdmin'), { ssr: false })
export default function Page() {
  return (
    <>
      <ContactsAdmin />
    </>
  )
}
