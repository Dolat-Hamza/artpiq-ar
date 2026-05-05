'use client'
import dynamic from 'next/dynamic'
const OrganizationsAdmin = dynamic(() => import('@/components/OrganizationsAdmin'), { ssr: false })
export default function Page() { return <OrganizationsAdmin /> }
