'use client'
import dynamic from 'next/dynamic'

const AdminShell = dynamic(() => import('@/components/AdminShell'), { ssr: false })

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
