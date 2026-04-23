'use client'

import dynamic from 'next/dynamic'

// All interactive — load client-only, skip SSR
const AppShell = dynamic(() => import('@/components/AppShell'), { ssr: false })

export default function Page() {
  return <AppShell />
}
