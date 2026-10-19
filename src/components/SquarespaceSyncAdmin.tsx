'use client'
import { useState } from 'react'
import { useAuth } from '@/lib/db/auth'
import { authedFetch } from '@/lib/db/authedFetch'
import type { SyncChanges } from '@/lib/sqsp/syncPlan'
import LoginForm from './LoginForm'
import AdminPageHeader from './ui/AdminPageHeader'
import Button from './ui/Button'
import { useConfirm } from './ui/ConfirmDialog'
import { useToast } from './ui/toast'

interface SyncResult {
  applied: boolean
  counts: { create: number; update: number; unchanged: number; skipped: number }
  create: { title: string; sku: string; widthCm: number; heightCm: number; privacy: string; price?: number }[]
  update: { title: string; sku: string; changes: SyncChanges }[]
  skipped: { name: string; reason: string }[]
}

const LABEL = 'text-[11px] uppercase tracking-wider text-ink-muted font-semibold'

function describe(c: SyncChanges): string {
  const parts: string[] = []
  if (c.price !== undefined) parts.push(`price ${c.price}`)
  if (c.currency !== undefined) parts.push(`currency ${c.currency}`)
  if (c.sold !== undefined) parts.push(c.sold ? 'mark sold' : 'mark available')
  return parts.join(' · ')
}

export default function SquarespaceSyncAdmin() {
  const { user, loading } = useAuth()
  const confirm = useConfirm()
  const toast = useToast()
  const [result, setResult] = useState<SyncResult | null>(null)
  const [busy, setBusy] = useState<'preview' | 'apply' | null>(null)
  const [error, setError] = useState('')

  async function run(apply: boolean) {
    setBusy(apply ? 'apply' : 'preview')
    setError('')
    try {
      const res = await authedFetch('/api/squarespace/sync', { method: 'POST', body: JSON.stringify({ apply }) })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? `Sync failed (${res.status})`); return }
      setResult(json)
      if (apply) toast.success(`Created ${json.counts.create}, updated ${json.counts.update}`)
    } finally {
      setBusy(null)
    }
  }

  async function apply() {
    if (!result) return
    const ok = await confirm({
      title: 'Apply Squarespace changes?',
      description: `Create ${result.counts.create} artworks and update ${result.counts.update} in your ArtPiq catalogue. Existing titles, sizes and images are not changed, and nothing is deleted.`,
      confirmLabel: 'Apply',
    })
    if (ok) await run(true)
  }

  if (loading) return <div className="p-8 text-body text-ink-muted">Loading…</div>
  if (!user) return <div className="min-h-dvh flex items-center justify-center p-6"><LoginForm /></div>

  const pending = result && !result.applied && result.counts.create + result.counts.update > 0

  return (
    <div className="min-h-dvh bg-bg">
      <AdminPageHeader title="Squarespace Sync" />
      <main className="px-6 md:px-10 py-6 max-w-content space-y-6">
        <p className="text-body text-ink-muted max-w-[640px]">
          Brings products from your Squarespace store into ArtPiq, matched by SKU. New products become artworks;
          existing ones only take price and sold status from Squarespace. Nothing is deleted.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => run(false)} loading={busy === 'preview'} disabled={!!busy}>Preview changes</Button>
          {pending && (
            <Button variant="primary" onClick={apply} loading={busy === 'apply'} disabled={!!busy}>
              Apply {result.counts.create + result.counts.update} changes
            </Button>
          )}
        </div>
        {error && <p className="text-body text-red-600">{error}</p>}

        {result && (
          <>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(['create', 'update', 'unchanged', 'skipped'] as const).map(k => (
                <div key={k} className="border border-line bg-paper p-4">
                  <dt className={LABEL}>{k === 'create' ? 'New artworks' : k === 'update' ? 'Updates' : k}</dt>
                  <dd className="font-display text-[28px] mt-1">{result.counts[k]}</dd>
                </div>
              ))}
            </dl>
            {result.applied && <p className="text-body text-ink">Applied. Preview again to confirm everything is in step.</p>}

            {result.update.length > 0 && (
              <section>
                <h2 className={`${LABEL} mb-2`}>Updates</h2>
                <ul className="border border-line bg-paper divide-y divide-line text-body">
                  {result.update.map(u => (
                    <li key={u.sku} className="px-4 py-2 flex justify-between gap-4">
                      <span>{u.title} <span className="text-ink-muted">· {u.sku}</span></span>
                      <span className="text-ink-muted">{describe(u.changes)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {result.create.length > 0 && (
              <section>
                <h2 className={`${LABEL} mb-2`}>New artworks</h2>
                <ul className="border border-line bg-paper divide-y divide-line text-body">
                  {result.create.map(c => (
                    <li key={c.sku} className="px-4 py-2 flex justify-between gap-4">
                      <span>{c.title} <span className="text-ink-muted">· {c.sku}{c.privacy === 'private' ? ' · hidden in Squarespace' : ''}</span></span>
                      <span className="text-ink-muted">
                        {c.widthCm > 0 ? `${c.widthCm} × ${c.heightCm} cm (shipping size — check)` : 'no size — set it to enable AR'}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {result.skipped.length > 0 && (
              <section>
                <h2 className={`${LABEL} mb-2`}>Skipped</h2>
                <ul className="text-body text-ink-muted">
                  {result.skipped.map((s, i) => <li key={i}>{s.name} — {s.reason}</li>)}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
