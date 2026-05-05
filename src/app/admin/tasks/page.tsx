'use client'
import dynamic from 'next/dynamic'
const TasksAdmin = dynamic(() => import('@/components/TasksAdmin'), { ssr: false })
export default function Page() { return <TasksAdmin /> }
