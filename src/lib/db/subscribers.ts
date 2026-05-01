import { Subscriber } from '@/types'
import { Database } from './types'
import { supabase } from './client'

type Row = Database['public']['Tables']['subscribers']['Row']

function rowToSub(r: Row): Subscriber {
  return {
    id: r.id,
    ownerId: r.owner_id,
    email: r.email,
    name: r.name,
    source: r.source,
    optedInAt: r.opted_in_at,
    optedOutAt: r.opted_out_at,
    createdAt: r.created_at,
  }
}

export async function listSubscribers(ownerId: string): Promise<Subscriber[]> {
  const { data, error } = await supabase()
    .from('subscribers')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(rowToSub)
}

export async function deleteSubscriber(id: string): Promise<void> {
  const { error } = await supabase().from('subscribers').delete().eq('id', id)
  if (error) throw error
}

export function subscribersToCsv(list: Subscriber[]): string {
  const head = ['Email Address', 'First Name', 'Last Name', 'Source', 'Opt In Date']
  const esc = (v: unknown) => {
    if (v == null) return ''
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const rows = list
    .filter(s => !s.optedOutAt)
    .map(s => {
      const parts = (s.name || '').split(/\s+/)
      const first = parts[0] || ''
      const last = parts.slice(1).join(' ')
      return [s.email, first, last, s.source, s.optedInAt].map(esc).join(',')
    })
  return [head.join(','), ...rows].join('\n')
}

export function downloadSubscribersCsv(list: Subscriber[]) {
  const csv = subscribersToCsv(list)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
