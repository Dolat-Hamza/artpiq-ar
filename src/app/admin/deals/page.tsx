'use client'
import dynamic from 'next/dynamic'
const DealsAdmin = dynamic(() => import('@/components/DealsAdmin'), { ssr: false })
export default function Page() { return <DealsAdmin /> }
