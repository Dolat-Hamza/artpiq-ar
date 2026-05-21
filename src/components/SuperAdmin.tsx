'use client'
import { useEffect, useRef, useState } from 'react'
import { Plus, RefreshCw, Shield, ShieldCheck, Trash2, X } from 'lucide-react'
import { supabase } from '@/lib/db/client'
import { useAuth } from '@/lib/db/auth'
import { useFeatures, type FeatureKey } from '@/lib/db/features'
import AdminPageHeader from './ui/AdminPageHeader'
import LoginForm from './LoginForm'
import WallQuadEditor from './superadmin/WallQuadEditor'

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

        {/* Demo content — seed ~12 realistic social/blog/newsletter rows */}
        <DemoContentPanel users={users} currentUserId={user?.id} onError={setErr} />
      </main>
    </div>
  )
}

// ============================================================
// Demo content seeder — fills `content_items` with ~12 realistic posts so the
// Social Calendar / Marketing Portal / Blog / Newsletter areas look alive in
// a demo. Idempotent: re-running deletes prior demo rows first.
// ============================================================
function DemoContentPanel({
  users,
  currentUserId,
  onError,
}: {
  users: ApiUser[]
  currentUserId?: string
  onError: (msg: string | null) => void
}) {
  const [targetOwner, setTargetOwner] = useState<string>(currentUserId ?? '')
  const [busy, setBusy] = useState<null | 'seed' | 'wipe'>(null)
  const [lastResult, setLastResult] = useState<string | null>(null)

  useEffect(() => {
    if (!targetOwner && currentUserId) setTargetOwner(currentUserId)
  }, [currentUserId, targetOwner])

  async function seed() {
    if (!targetOwner) return
    setBusy('seed')
    onError(null)
    setLastResult(null)
    try {
      const { data, error } = await supabase().rpc('superadmin_seed_demo_content', { target_owner: targetOwner })
      if (error) throw error
      setLastResult(`Seeded ${data} demo rows.`)
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  async function wipe() {
    if (!targetOwner) return
    if (!confirm('Delete all demo rows for the selected owner? Production content tagged "demo" will also be removed.')) return
    setBusy('wipe')
    onError(null)
    setLastResult(null)
    try {
      const { data, error } = await supabase().rpc('superadmin_wipe_demo_content', { target_owner: targetOwner })
      if (error) throw error
      setLastResult(`Removed ${data} demo rows.`)
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="px-6 md:px-10 py-6 border-t border-line">
      <header className="mb-3">
        <h2 className="font-display text-[14px] tracking-[0.18em] uppercase">Demo content</h2>
        <p className="text-meta text-ink-muted mt-1 max-w-[640px]">
          Seed ~12 realistic-looking social, blog and newsletter rows for the chosen owner so the
          Marketing area renders something other than empty columns. Idempotent: re-running clears
          prior demo rows first. Wipe is also exposed below.
        </p>
      </header>
      <div className="bg-paper border border-line rounded-md p-4 flex flex-wrap items-end gap-3">
        <label className="grow min-w-[260px]">
          <span className="block text-meta uppercase tracking-[0.14em] text-ink-muted mb-1">Target owner</span>
          <select
            value={targetOwner}
            onChange={e => setTargetOwner(e.target.value)}
            className="input"
          >
            <option value="">— pick owner —</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.email} {u.id === currentUserId ? ' (you)' : ''}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={seed}
          disabled={!targetOwner || busy !== null}
          className="btn-primary disabled:opacity-40"
        >
          {busy === 'seed' ? 'Seeding…' : 'Seed demo content'}
        </button>
        <button
          type="button"
          onClick={wipe}
          disabled={!targetOwner || busy !== null}
          className="btn-outline disabled:opacity-40 !text-red-600 !border-red-200"
        >
          {busy === 'wipe' ? 'Wiping…' : 'Wipe demo content'}
        </button>
        {lastResult && (
          <span className="text-meta text-emerald-700 self-center">· {lastResult}</span>
        )}
      </div>
    </section>
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

interface StockRoom {
  id: string
  name: string
  image_url: string
  thumb_url?: string | null
  wall_quad: number[][]
  category: string
  wall_width_cm?: number | null
}

const ROOMS_PAGE_SIZE = 24

function downloadRoomsTemplate(): void {
  const csv = [
    'name,category,image_url,wall_width_cm,wall_preset',
    'Living room 1,living,https://images.unsplash.com/photo-…,350,front-medium',
    'Tall gallery wall,gallery,https://images.unsplash.com/photo-…,450,gallery-tall',
    'Narrow hallway,hallway,https://images.unsplash.com/photo-…,180,front-narrow',
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'artpiq-stock-rooms-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

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
  // Gallery state — list of existing rooms + the one currently being edited.
  const [rooms, setRooms] = useState<StockRoom[]>([])
  const [editingRoom, setEditingRoom] = useState<StockRoom | null>(null)
  const [galleryCategory, setGalleryCategory] = useState<string>('all')
  // Filter / paginate the gallery — important once the library grows past
  // a couple of hundred rooms (Workstream D).
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const csvInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  async function refresh() {
    try {
      const r = await authedFetch('/api/superadmin/stock-rooms')
      if (!r.ok) return
      const json = await r.json()
      setRooms(json.rooms || [])
    } catch {}
  }

  useEffect(() => { refresh() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function remove(id: string) {
    if (!confirm('Delete this stock room? Existing designs using it stay safe.')) return
    const r = await authedFetch(`/api/superadmin/stock-rooms?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (r.ok) refresh()
    else onError('Delete failed')
  }

  async function submit() {
    const lines = urls.split('\n').map(s => s.trim()).filter(s => s.length > 0)
    if (lines.length === 0) return
    const preset = WALL_PRESETS.find(p => p.id === presetId) ?? WALL_PRESETS[1]
    const prefix = namePrefix.trim() || `${category[0].toUpperCase() + category.slice(1)}`
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
      refresh()
    } finally {
      setBusy(false)
    }
  }

  const filteredRooms = rooms
    .filter(r => galleryCategory === 'all' || r.category === galleryCategory)
    .filter(r => {
      if (!search.trim()) return true
      const needle = search.toLowerCase()
      return r.name.toLowerCase().includes(needle) || r.category.toLowerCase().includes(needle) || r.id.toLowerCase().includes(needle)
    })
  const pageCount = Math.max(1, Math.ceil(filteredRooms.length / ROOMS_PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRooms = filteredRooms.slice(safePage * ROOMS_PAGE_SIZE, (safePage + 1) * ROOMS_PAGE_SIZE)

  // Reset to first page whenever the filter/search changes — avoids landing
  // on an empty page after narrowing.
  useEffect(() => { setPage(0) }, [galleryCategory, search])

  // Parse a CSV with header row: name,category,image_url[,wall_width_cm,wall_preset].
  // Lines without an image_url are skipped. Wall preset defaults to 'front-medium'.
  async function importCsv(file: File) {
    onError(null)
    try {
      const text = await file.text()
      const rows = text.split(/\r?\n/).map(line => line.split(',').map(c => c.trim()))
      if (rows.length < 2) {
        onError('CSV needs a header row plus at least one data row.')
        return
      }
      const head = rows[0].map(h => h.toLowerCase())
      const idx = (k: string) => head.indexOf(k)
      const need = (k: string) => {
        const i = idx(k)
        if (i < 0) throw new Error(`Missing required column "${k}"`)
        return i
      }
      const cName = need('name')
      const cCategory = need('category')
      const cImage = need('image_url')
      const cWidth = idx('wall_width_cm')
      const cPreset = idx('wall_preset')
      const toAdd = rows.slice(1)
        .filter(r => r[cImage]?.trim())
        .map(r => {
          const preset = cPreset >= 0
            ? (WALL_PRESETS.find(p => p.id === r[cPreset]) ?? WALL_PRESETS[1])
            : WALL_PRESETS[1]
          return {
            name: r[cName] || 'Untitled room',
            category: r[cCategory] || 'plain',
            image_url: r[cImage],
            wall_quad: preset.quad,
            wall_width_cm: cWidth >= 0 ? Number(r[cWidth]) || 350 : 350,
            smart: false,
          }
        })
      if (!toAdd.length) {
        onError('No usable rows in CSV (need at least name + category + image_url).')
        return
      }
      setBusy(true)
      const res = await authedFetch('/api/superadmin/stock-rooms', {
        method: 'POST',
        body: JSON.stringify({ rooms: toAdd }),
      })
      const json = await res.json()
      if (!res.ok) {
        onError(json.error || 'CSV import failed')
        return
      }
      setLastResult(`${json.inserted} rooms imported from CSV.`)
      refresh()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'CSV import failed')
    } finally {
      setBusy(false)
    }
  }

  // Upload device photos straight into the stock-rooms bucket, then register
  // each as a room via the existing RPC. Keeps the operator from needing a
  // public host (Unsplash/Pexels) for one-off photos.
  async function uploadPhotos(filesList: FileList) {
    const files = Array.from(filesList)
    if (!files.length) return
    setBusy(true)
    onError(null)
    try {
      const preset = WALL_PRESETS.find(p => p.id === presetId) ?? WALL_PRESETS[1]
      const widthN = Number(wallWidthCm) || 350
      const uploaded: { url: string; baseName: string }[] = []
      for (const file of files) {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const path = `${category}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error } = await supabase().storage.from('stock-rooms').upload(path, file, {
          cacheControl: '86400',
          upsert: false,
          contentType: file.type || `image/${ext}`,
        })
        if (error) throw error
        const { data } = supabase().storage.from('stock-rooms').getPublicUrl(path)
        uploaded.push({ url: data.publicUrl, baseName: file.name.replace(/\.[^.]+$/, '') })
      }
      const prefix = namePrefix.trim()
      const newRooms = uploaded.map((u, i) => ({
        name: prefix ? `${prefix} ${i + 1}` : (u.baseName || `${category} ${i + 1}`),
        category,
        image_url: u.url,
        wall_quad: preset.quad,
        wall_width_cm: widthN,
        smart: false,
      }))
      const res = await authedFetch('/api/superadmin/stock-rooms', {
        method: 'POST',
        body: JSON.stringify({ rooms: newRooms }),
      })
      const json = await res.json()
      if (!res.ok) {
        onError(json.error || 'Photo upload failed at register step')
        return
      }
      setLastResult(`${json.inserted} rooms registered from device upload.`)
      refresh()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Photo upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
    <section className="bg-paper border border-line rounded-md p-5">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <p className="font-display text-[14px]">
          Stock rooms · {rooms.length}
          {(galleryCategory !== 'all' || search.trim()) && (
            <span className="ml-2 text-meta text-ink-muted">({filteredRooms.length} match)</span>
          )}
        </p>
        <div className="flex gap-2 items-center">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name / id…"
            className="input !h-8 !py-1 !w-[180px] text-[11px]"
          />
          <select
            value={galleryCategory}
            onChange={e => setGalleryCategory(e.target.value)}
            className="input !h-8 !py-1 !w-auto text-[11px]"
          >
            <option value="all">All categories</option>
            {ROOM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      {filteredRooms.length === 0 ? (
        <p className="text-meta text-ink-muted text-center py-6 border border-dashed border-line rounded-md">
          {rooms.length === 0 ? 'No rooms yet. Bulk-add below.' : 'No rooms match this filter.'}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {pageRooms.map(r => (
            <article key={r.id} className="border border-line rounded-md overflow-hidden bg-paper">
              <div className="relative bg-black aspect-[4/3]">
                {/* Room photo with the saved wall quad overlaid so any
                    misaligned rooms are obvious at a glance. */}
                <img
                  src={r.thumb_url || r.image_url}
                  alt={r.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {Array.isArray(r.wall_quad) && r.wall_quad.length === 4 && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <polygon
                      points={r.wall_quad.map(([x, y]) => `${x * 100},${y * 100}`).join(' ')}
                      fill="rgba(180, 83, 9, 0.18)"
                      stroke="#B45309"
                      strokeWidth="0.4"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                )}
              </div>
              <div className="p-2.5 grid gap-1.5">
                <p className="text-body font-bold truncate" title={r.name}>{r.name}</p>
                <p className="text-meta uppercase tracking-[0.14em] text-ink-muted">{r.category}</p>
                <div className="flex gap-1.5 mt-1">
                  <button
                    onClick={() => setEditingRoom(r)}
                    className="btn-outline !h-7 !text-[10px] !px-2 flex-1"
                    type="button"
                  >
                    Edit quad
                  </button>
                  <button
                    onClick={() => remove(r.id)}
                    className="btn-outline !h-7 !w-7 !p-0 grid place-items-center !text-red-600"
                    title="Delete room"
                    type="button"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-meta">
          <button
            type="button"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="btn-outline !h-7 !text-[10px] !px-2 disabled:opacity-40"
          >
            ‹ Prev
          </button>
          <span className="text-ink-muted tabular-nums">
            Page {safePage + 1} / {pageCount}
            <span className="ml-2">· {filteredRooms.length} rooms</span>
          </span>
          <button
            type="button"
            onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
            disabled={safePage >= pageCount - 1}
            className="btn-outline !h-7 !text-[10px] !px-2 disabled:opacity-40"
          >
            Next ›
          </button>
        </div>
      )}
    </section>

    <section className="bg-paper border border-line rounded-md p-5">
      <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
        <p className="font-display text-[14px]">Bulk add rooms</p>
        <div className="flex gap-3 items-center text-meta">
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={e => {
              if (e.target.files?.[0]) importCsv(e.target.files[0])
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => csvInputRef.current?.click()}
            disabled={busy}
            className="text-meta uppercase tracking-[0.12em] text-accent underline hover:text-accent/80 disabled:opacity-40"
            title="CSV header: name,category,image_url[,wall_width_cm,wall_preset]"
          >
            Import CSV…
          </button>
          <button
            type="button"
            onClick={downloadRoomsTemplate}
            className="text-meta uppercase tracking-[0.12em] text-ink-muted underline hover:text-ink"
          >
            Template
          </button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={e => {
              if (e.target.files) uploadPhotos(e.target.files)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            disabled={busy}
            className="text-meta uppercase tracking-[0.12em] text-accent underline hover:text-accent/80 disabled:opacity-40"
            title="Upload room photos straight from your device (uses the chosen category + wall preset)"
          >
            Upload photos…
          </button>
        </div>
      </div>
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

    {editingRoom && (
      <WallQuadEditor
        room={editingRoom}
        authedFetch={authedFetch}
        onClose={() => setEditingRoom(null)}
        onSaved={() => { setEditingRoom(null); refresh() }}
      />
    )}
    </>
  )
}
