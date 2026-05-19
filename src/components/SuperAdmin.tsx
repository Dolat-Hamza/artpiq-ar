'use client'
import { useEffect, useState } from 'react'
import { Plus, RefreshCw, Shield, ShieldCheck, Trash2, X } from 'lucide-react'
import { supabase } from '@/lib/db/client'
import { useAuth } from '@/lib/db/auth'
import { useFeatures, type FeatureKey } from '@/lib/db/features'
import AdminPageHeader from './ui/AdminPageHeader'
import LoginForm from './LoginForm'

const FEATURE_LABELS: Record<FeatureKey, string> = {
  visualise: 'Visualise',
  crm: 'CRM',
  marketing: 'Marketing',
  ar: 'AR Demo',
}

const ALL_FEATURES: FeatureKey[] = ['visualise', 'crm', 'marketing', 'ar']

const PLAN_PRESETS: { id: string; label: string; features: FeatureKey[] }[] = [
  { id: 'studio', label: 'Studio', features: ['visualise'] },
  { id: 'gallery', label: 'Gallery', features: ['visualise', 'crm'] },
  { id: 'agency', label: 'Agency', features: ['visualise', 'crm', 'marketing'] },
  { id: 'full', label: 'Full', features: ['visualise', 'crm', 'marketing', 'ar'] },
]

interface ApiUser {
  id: string
  email: string
  createdAt: string
  lastSignInAt: string | null
  features: FeatureKey[]
  plan: string
  notes: string | null
  counts: {
    artworks: number
    contacts: number
    deals: number
    content: number
    presentations: number
  }
}

interface AdminRow {
  email: string
  role: string
  created_at: string
}

export default function SuperAdmin() {
  const { user, loading: authLoading } = useAuth()
  const { isSuperAdmin, loading: featLoading } = useFeatures()
  const [users, setUsers] = useState<ApiUser[]>([])
  const [admins, setAdmins] = useState<AdminRow[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [newAdminEmail, setNewAdminEmail] = useState('')

  // Get the caller's JWT to send to API routes (since they verify via Bearer).
  async function authedFetch(input: string, init?: RequestInit) {
    const session = (await supabase().auth.getSession()).data.session
    const token = session?.access_token
    return fetch(input, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'content-type': 'application/json',
      },
    })
  }

  async function refresh() {
    setLoading(true)
    setErr(null)
    try {
      const [u, a] = await Promise.all([
        authedFetch('/api/superadmin/users'),
        authedFetch('/api/superadmin/admins'),
      ])
      const uText = await u.text()
      const aText = await a.text()
      if (!u.ok) {
        let msg = `users ${u.status}`
        try { msg = JSON.parse(uText).error || msg } catch {}
        throw new Error(`Users API: ${msg}. Likely SUPABASE_SERVICE_ROLE_KEY missing on Vercel.`)
      }
      if (!a.ok) {
        let msg = `admins ${a.status}`
        try { msg = JSON.parse(aText).error || msg } catch {}
        throw new Error(`Admins API: ${msg}`)
      }
      setUsers(JSON.parse(uText).users || [])
      setAdmins(JSON.parse(aText).admins || [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isSuperAdmin) refresh()
  }, [isSuperAdmin])

  if (authLoading || featLoading) return <div className="p-8 text-body text-ink-muted">Loading…</div>
  if (!user) return <div className="min-h-dvh flex items-center justify-center p-6"><LoginForm /></div>
  if (!isSuperAdmin) {
    return (
      <div className="min-h-dvh grid place-items-center p-8 text-center">
        <div>
          <ShieldCheck size={36} className="text-ink-muted mx-auto mb-3" />
          <p className="font-display text-h3">Restricted</p>
          <p className="text-body text-ink-muted mt-1">You are not a super-admin.</p>
        </div>
      </div>
    )
  }

  async function setFeatures(u: ApiUser, features: FeatureKey[]) {
    // Optimistic
    setUsers(prev => prev.map(p => p.id === u.id ? { ...p, features } : p))
    const r = await authedFetch('/api/superadmin/user-features', {
      method: 'POST',
      body: JSON.stringify({ ownerId: u.id, features }),
    })
    if (!r.ok) {
      setErr((await r.json()).error || 'Update failed')
      refresh()
    }
  }

  async function setPlan(u: ApiUser, planId: string) {
    const preset = PLAN_PRESETS.find(p => p.id === planId)
    const features = preset?.features ?? u.features
    setUsers(prev => prev.map(p => p.id === u.id ? { ...p, plan: planId, features } : p))
    const r = await authedFetch('/api/superadmin/user-features', {
      method: 'POST',
      body: JSON.stringify({ ownerId: u.id, plan: planId, features }),
    })
    if (!r.ok) {
      setErr((await r.json()).error || 'Update failed')
      refresh()
    }
  }

  async function addAdmin() {
    const email = newAdminEmail.trim().toLowerCase()
    if (!email) return
    const r = await authedFetch('/api/superadmin/admins', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
    if (!r.ok) {
      setErr((await r.json()).error || 'Add admin failed')
      return
    }
    setNewAdminEmail('')
    refresh()
  }

  async function removeAdmin(email: string) {
    if (!confirm(`Remove ${email} as super-admin?`)) return
    const r = await authedFetch(`/api/superadmin/admins?email=${encodeURIComponent(email)}`, { method: 'DELETE' })
    if (!r.ok) {
      setErr((await r.json()).error || 'Remove admin failed')
      return
    }
    refresh()
  }

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <AdminPageHeader
        title="Super Admin"
        actions={
          <button onClick={refresh} disabled={loading} className="btn-outline disabled:opacity-40">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        }
        subBar={
          <>
            <span><Shield size={11} className="inline mr-1" /> {admins.length} admin{admins.length === 1 ? '' : 's'}</span>
            <span className="text-ink-muted">·</span>
            <span>{users.length} user{users.length === 1 ? '' : 's'}</span>
          </>
        }
      />
      <main className="px-6 md:px-10 py-6 grid gap-6">
        {err && <p className="text-red-600 text-meta">{err}</p>}

        {/* Admins block */}
        <section className="bg-paper border border-line rounded-md p-5">
          <p className="font-display text-[14px] mb-3">Super-admins</p>
          <div className="grid gap-2">
            {admins.map(a => (
              <div key={a.email} className="border border-line rounded-sm px-3 py-2 flex items-center gap-3">
                <Shield size={14} className="text-ink-muted" />
                <span className="flex-1 font-bold text-body">{a.email}</span>
                <span className="text-meta uppercase tracking-[0.12em] text-ink-muted">{a.role}</span>
                <button
                  onClick={() => removeAdmin(a.email)}
                  className="text-red-600 hover:text-red-700"
                  title="Remove admin"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-2">
              <input
                value={newAdminEmail}
                onChange={e => setNewAdminEmail(e.target.value)}
                placeholder="email@example.com"
                className="input flex-1"
                onKeyDown={e => { if (e.key === 'Enter') addAdmin() }}
              />
              <button onClick={addAdmin} disabled={!newAdminEmail.trim()} className="btn-primary disabled:opacity-40">
                <Plus size={13} /> Add admin
              </button>
            </div>
          </div>
        </section>

        {/* Users block */}
        <section>
          <p className="font-display text-[14px] mb-3">Users · feature gates</p>
          <div className="bg-paper border border-line rounded-md overflow-hidden">
            <table className="w-full text-body">
              <thead className="border-b border-line bg-bg text-meta uppercase tracking-[0.14em] text-ink-muted">
                <tr>
                  <th className="text-left py-2 px-3">Email</th>
                  <th className="text-left py-2 px-3">Plan</th>
                  <th className="text-left py-2 px-3">Features</th>
                  <th className="text-right py-2 px-3 hidden lg:table-cell">Data</th>
                  <th className="text-right py-2 px-3 hidden xl:table-cell">Last sign-in</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-line/60">
                    <td className="py-2 px-3 align-top">
                      <p className="font-bold truncate">{u.email}</p>
                      <p className="text-[10px] text-ink-muted">{u.id.slice(0, 8)}…</p>
                    </td>
                    <td className="py-2 px-3 align-top">
                      <select
                        value={u.plan}
                        onChange={e => setPlan(u, e.target.value)}
                        className="input !h-8 !py-1 text-[11px]"
                      >
                        {PLAN_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                        <option value="custom">Custom</option>
                      </select>
                    </td>
                    <td className="py-2 px-3 align-top">
                      <div className="flex flex-wrap gap-1.5">
                        {ALL_FEATURES.map(f => {
                          const on = u.features.includes(f)
                          return (
                            <button
                              key={f}
                              onClick={() => {
                                const next = on
                                  ? u.features.filter(x => x !== f)
                                  : [...u.features, f]
                                setFeatures(u, next as FeatureKey[])
                              }}
                              className={`text-meta uppercase tracking-[0.12em] font-bold px-2 py-0.5 rounded-xs border transition-colors ${
                                on
                                  ? 'bg-accent text-paper border-accent'
                                  : 'bg-bg text-ink-muted border-line hover:border-ink'
                              }`}
                              title={on ? `Disable ${FEATURE_LABELS[f]}` : `Enable ${FEATURE_LABELS[f]}`}
                            >
                              {on ? '✓ ' : ''}{FEATURE_LABELS[f]}
                            </button>
                          )
                        })}
                      </div>
                    </td>
                    <td className="py-2 px-3 align-top hidden lg:table-cell text-right text-meta text-ink-muted whitespace-nowrap">
                      <span>{u.counts.artworks}aw</span>
                      <span className="mx-1">·</span>
                      <span>{u.counts.contacts}c</span>
                      <span className="mx-1">·</span>
                      <span>{u.counts.deals}d</span>
                      <span className="mx-1">·</span>
                      <span>{u.counts.content}p</span>
                    </td>
                    <td className="py-2 px-3 align-top hidden xl:table-cell text-right text-meta text-ink-muted">
                      {u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'never'}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-ink-muted text-meta">No users.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Stock rooms — bulk-add sample wall photos */}
        <StockRoomsPanel authedFetch={authedFetch} onError={setErr} />
      </main>
    </div>
  )
}

// ============================================================
// Stock rooms admin: bulk-add clean-wall sample photos so every user
// has plenty of room mockups to drop artworks into.
// ============================================================
const WALL_PRESETS: { id: string; label: string; quad: number[][] }[] = [
  { id: 'front-large',  label: 'Front-flat — large wall',  quad: [[0.06, 0.05], [0.94, 0.05], [0.94, 0.62], [0.06, 0.62]] },
  { id: 'front-medium', label: 'Front-flat — medium wall', quad: [[0.12, 0.06], [0.88, 0.06], [0.88, 0.58], [0.12, 0.58]] },
  { id: 'front-narrow', label: 'Front-flat — narrow wall', quad: [[0.22, 0.08], [0.78, 0.08], [0.78, 0.55], [0.22, 0.55]] },
  { id: 'gallery-tall', label: 'Gallery — tall white wall', quad: [[0.08, 0.03], [0.92, 0.03], [0.92, 0.75], [0.08, 0.75]] },
]

const ROOM_CATEGORIES = [
  'living', 'bedroom', 'office', 'gallery', 'hallway', 'dining', 'studio',
  'kitchen', 'lobby', 'cafe', 'restaurant', 'plain',
]

function StockRoomsPanel({
  authedFetch,
  onError,
}: {
  authedFetch: (url: string, init?: RequestInit) => Promise<Response>
  onError: (msg: string | null) => void
}) {
  const [category, setCategory] = useState('living')
  const [presetId, setPresetId] = useState(WALL_PRESETS[1].id)
  const [wallWidthCm, setWallWidthCm] = useState('350')
  const [namePrefix, setNamePrefix] = useState('')
  const [urls, setUrls] = useState('')
  const [busy, setBusy] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)

  async function submit() {
    const lines = urls.split('\n').map(s => s.trim()).filter(s => s.length > 0)
    if (lines.length === 0) return
    const preset = WALL_PRESETS.find(p => p.id === presetId) ?? WALL_PRESETS[1]
    const prefix = namePrefix.trim() || `${category[0].toUpperCase() + category.slice(1)}`
    // Build a request body matching the SQL function's expected shape.
    const rooms = lines.map((url, i) => ({
      name: `${prefix} ${i + 1}`,
      category,
      image_url: url,
      wall_quad: preset.quad,
      wall_width_cm: Number(wallWidthCm) || 350,
      smart: false,
    }))
    setBusy(true)
    onError(null)
    try {
      const res = await authedFetch('/api/superadmin/stock-rooms', {
        method: 'POST',
        body: JSON.stringify({ rooms }),
      })
      const json = await res.json()
      if (!res.ok) {
        onError(json.error || 'Bulk add failed')
        return
      }
      setLastResult(`${json.inserted} rooms added.`)
      setUrls('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="bg-paper border border-line rounded-md p-5">
      <p className="font-display text-[14px] mb-3">Stock rooms — bulk add</p>
      <p className="text-meta text-ink-muted mb-4">
        Paste image URLs (one per line). Each becomes a room mockup with the chosen wall preset.
        Free sources: <a className="underline" href="https://unsplash.com/s/photos/empty-wall-interior" target="_blank" rel="noopener noreferrer">Unsplash empty-wall</a> ·{' '}
        <a className="underline" href="https://www.pexels.com/search/minimalist%20interior/" target="_blank" rel="noopener noreferrer">Pexels minimalist interior</a> ·{' '}
        <a className="underline" href="https://www.pexels.com/search/empty%20wall/" target="_blank" rel="noopener noreferrer">Pexels empty wall</a>.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <label className="block">
          <span className="block text-meta uppercase tracking-[0.14em] text-ink-muted mb-1">Category</span>
          <select value={category} onChange={e => setCategory(e.target.value)} className="input">
            {ROOM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-meta uppercase tracking-[0.14em] text-ink-muted mb-1">Wall preset</span>
          <select value={presetId} onChange={e => setPresetId(e.target.value)} className="input">
            {WALL_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-meta uppercase tracking-[0.14em] text-ink-muted mb-1">Wall width (cm)</span>
          <input
            value={wallWidthCm}
            onChange={e => setWallWidthCm(e.target.value)}
            inputMode="numeric"
            className="input"
          />
        </label>
        <label className="block">
          <span className="block text-meta uppercase tracking-[0.14em] text-ink-muted mb-1">Name prefix</span>
          <input
            value={namePrefix}
            onChange={e => setNamePrefix(e.target.value)}
            placeholder={`e.g. ${category}`}
            className="input"
          />
        </label>
      </div>
      <label className="block">
        <span className="block text-meta uppercase tracking-[0.14em] text-ink-muted mb-1">Image URLs (one per line)</span>
        <textarea
          value={urls}
          onChange={e => setUrls(e.target.value)}
          rows={6}
          placeholder={`https://images.unsplash.com/photo-…?w=1600&q=82\nhttps://images.pexels.com/photos/…/pexels-photo-….jpeg`}
          className="input font-mono text-[12px]"
        />
      </label>
      <div className="flex items-center justify-between mt-3 gap-3">
        <p className="text-meta text-ink-muted">
          {(urls.split('\n').map(s => s.trim()).filter(Boolean).length)} URL(s) ready
          {lastResult && <span className="ml-2 text-emerald-700">· {lastResult}</span>}
        </p>
        <button
          onClick={submit}
          disabled={busy || urls.trim().length === 0}
          className="btn-primary disabled:opacity-40"
        >
          {busy ? 'Adding…' : 'Bulk add rooms'}
        </button>
      </div>
    </section>
  )
}
