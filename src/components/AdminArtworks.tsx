'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ARTWORK_STATUSES, Artwork, ArtworkStatus, Collection } from '@/types'
import {
  artworksToCsv,
  duplicateArtwork,
  newArtwork,
  parseCsv,
  rowsToArtworks,
} from '@/lib/artworkStore'
import {
  bulkUpsert,
  deleteArtwork,
  listMyArtworks,
  uploadImage,
  upsertArtwork,
} from '@/lib/db/artworks'
import {
  artworksInCollection,
  collectionsForArtwork,
  createCollection,
  deleteCollection,
  listMyCollections,
  setArtworkCollections,
  updateCollection,
} from '@/lib/db/collections'
import { signOut, useAuth } from '@/lib/db/auth'
import { exportArtworkPdf, exportCollectionPdf } from '@/lib/artworkSheet'
import { downloadSqspCsv } from '@/lib/sqspExport'
import LoginForm from './LoginForm'

const STATUS_LABEL: Record<ArtworkStatus, string> = {
  for_sale: 'For sale',
  sale_pending: 'Sale pending',
  for_rent: 'For rent',
  rented: 'Rented',
  reserved: 'Reserved',
  sold: 'Sold',
  not_for_sale: 'Not for sale',
}

interface Filters {
  q: string
  status: ArtworkStatus | 'all'
  type: string
  collectionId: string
  priceMin: string
  priceMax: string
}
const initialFilters: Filters = {
  q: '',
  status: 'all',
  type: 'all',
  collectionId: 'all',
  priceMin: '',
  priceMax: '',
}

export default function AdminArtworks() {
  const { user, loading, configured } = useAuth()
  const [list, setList] = useState<Artwork[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [editing, setEditing] = useState<Artwork | null>(null)
  const [editingCollections, setEditingCollections] = useState<string[]>([])
  const [filters, setFilters] = useState<Filters>(initialFilters)
  const [collectionMembership, setCollectionMembership] = useState<Record<string, string[]>>({})
  const [showCollectionsPanel, setShowCollectionsPanel] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    refresh()
  }, [user])

  async function refresh() {
    if (!user) return
    try {
      setBusy(true)
      const [arts, cols] = await Promise.all([
        listMyArtworks(user.id),
        listMyCollections(user.id),
      ])
      setList(arts)
      setCollections(cols)
      // Build collection membership map for filter
      const m: Record<string, string[]> = {}
      for (const c of cols) {
        m[c.id] = await artworksInCollection(c.id)
      }
      setCollectionMembership(m)
      setErr(null)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setBusy(false)
    }
  }

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase()
    const memberSet =
      filters.collectionId !== 'all'
        ? new Set(collectionMembership[filters.collectionId] ?? [])
        : null
    const min = filters.priceMin ? Number(filters.priceMin) : null
    const max = filters.priceMax ? Number(filters.priceMax) : null
    return list.filter(a => {
      if (q) {
        const hay = [a.title, a.artist, a.medium, a.material, a.collection]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (filters.status !== 'all' && (a.status ?? 'for_sale') !== filters.status) return false
      if (filters.type !== 'all' && a.type !== filters.type) return false
      if (memberSet && !memberSet.has(a.id)) return false
      if (min != null && (a.price ?? 0) < min) return false
      if (max != null && (a.price ?? 0) > max) return false
      return true
    })
  }, [list, filters, collectionMembership])

  async function save() {
    if (!editing || !user) return
    try {
      setBusy(true)
      const saved = await upsertArtwork(editing, user.id)
      await setArtworkCollections(saved.id, editingCollections)
      setList(prev => {
        const i = prev.findIndex(a => a.id === saved.id)
        return i >= 0 ? prev.map(a => (a.id === saved.id ? saved : a)) : [saved, ...prev]
      })
      // Refresh membership map for impacted collections
      const next = { ...collectionMembership }
      for (const cid of Object.keys(next)) {
        next[cid] = next[cid].filter(id => id !== saved.id)
      }
      for (const cid of editingCollections) {
        if (!next[cid]) next[cid] = []
        if (!next[cid].includes(saved.id)) next[cid] = [...next[cid], saved.id]
      }
      setCollectionMembership(next)
      setEditing(null)
      setEditingCollections([])
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function openEditor(a: Artwork) {
    setEditing({ ...a })
    try {
      const cids = await collectionsForArtwork(a.id)
      setEditingCollections(cids)
    } catch {
      setEditingCollections([])
    }
  }

  function openNewEditor() {
    setEditing(newArtwork())
    setEditingCollections([])
  }

  async function duplicate(a: Artwork) {
    if (!user) return
    const dup = duplicateArtwork(a)
    try {
      setBusy(true)
      const saved = await upsertArtwork(dup, user.id)
      // Inherit collection memberships
      try {
        const cids = await collectionsForArtwork(a.id)
        if (cids.length) await setArtworkCollections(saved.id, cids)
      } catch {}
      setList(prev => [saved, ...prev])
      openEditor(saved)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Duplicate failed')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete artwork?')) return
    try {
      setBusy(true)
      await deleteArtwork(id)
      setList(prev => prev.filter(a => a.id !== id))
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  async function importCsv(f: File) {
    if (!user) return
    try {
      setBusy(true)
      const text = await f.text()
      const rows = parseCsv(text)
      const imported = rowsToArtworks(rows)
      if (!imported.length) {
        alert('No rows imported. Need at least: title, widthCm, heightCm.')
        return
      }
      const n = await bulkUpsert(imported, user.id)
      alert(`Imported ${n} artworks.`)
      refresh()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setBusy(false)
    }
  }

  function exportCsv() {
    const csv = artworksToCsv(list)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'artworks.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!configured) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-8 text-center">
        <p className="max-w-[420px] text-[13px] text-ink-muted">
          Supabase not configured. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
          <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>.
        </p>
      </div>
    )
  }

  if (loading) {
    return <div className="min-h-dvh flex items-center justify-center text-[13px] text-ink-muted">Loading…</div>
  }

  if (!user) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 bg-paper">
        <LoginForm />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="border-b border-line">
        <div className="max-w-content mx-auto px-6 md:px-12 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] tracking-[0.22em] uppercase text-ink-muted">Admin · {user.email}</p>
            <h1 className="font-display text-[24px] tracking-tight">Artworks ({list.length})</h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) importCsv(f)
                e.target.value = ''
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="px-3 py-2 text-[11px] tracking-[0.18em] uppercase border border-line"
              disabled={busy}
            >
              Import CSV
            </button>
            <button
              onClick={exportCsv}
              className="px-3 py-2 text-[11px] tracking-[0.18em] uppercase border border-line"
            >
              Export CSV
            </button>
            <button
              onClick={() => downloadSqspCsv(list)}
              disabled={!list.length}
              className="px-3 py-2 text-[11px] tracking-[0.18em] uppercase border border-line disabled:opacity-40"
              title="Squarespace Commerce import format"
            >
              Export SQSP
            </button>
            <button
              onClick={() => setShowCollectionsPanel(s => !s)}
              className="px-3 py-2 text-[11px] tracking-[0.18em] uppercase border border-line"
            >
              Collections ({collections.length})
            </button>
            <button
              onClick={openNewEditor}
              className="px-3 py-2 text-[11px] tracking-[0.18em] uppercase bg-ink text-paper"
              disabled={busy}
            >
              + New
            </button>
            <button
              onClick={signOut}
              className="px-3 py-2 text-[11px] tracking-[0.18em] uppercase border border-line"
            >
              Sign out
            </button>
          </div>
        </div>
        {err && (
          <p className="max-w-content mx-auto px-6 md:px-12 pb-3 text-[12px] text-red-600">{err}</p>
        )}
      </header>

      <main className="max-w-content mx-auto px-6 md:px-12 py-8">
        {showCollectionsPanel && (
          <CollectionsPanel
            collections={collections}
            membership={collectionMembership}
            artworks={list}
            ownerId={user.id}
            onChange={refresh}
          />
        )}
        <FilterBar
          filters={filters}
          onChange={setFilters}
          collections={collections}
          shown={filtered.length}
          total={list.length}
        />
        {!list.length && !busy && (
          <p className="text-ink-muted text-[13px]">
            No artworks yet. Click <em>New</em> or <em>Import CSV</em>.
          </p>
        )}
        {list.length > 0 && !filtered.length && (
          <p className="text-ink-muted text-[13px] py-8 text-center">
            No artworks match the filters.
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(a => (
            <article key={a.id} className="border border-line p-4 flex gap-4">
              {a.thumb ? (
                <img src={a.thumb} alt={a.title} className="w-24 h-24 object-cover" />
              ) : (
                <div className="w-24 h-24 bg-line/40" />
              )}
              <div className="flex-1 min-w-0 text-[13px]">
                <p className="font-display truncate">{a.title || '(untitled)'}</p>
                <p className="text-ink-muted truncate">{a.artist}</p>
                <p className="text-ink-muted">
                  {a.widthCm}×{a.heightCm} cm · {a.medium || a.type}
                </p>
                {a.collection && (
                  <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted mt-1">
                    {a.collection}
                  </p>
                )}
                <p className="text-[10px] uppercase tracking-[0.16em] text-ink-muted mt-1">
                  {STATUS_LABEL[a.status ?? 'for_sale']}
                </p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <button
                    onClick={() => openEditor(a)}
                    className="text-[11px] uppercase tracking-[0.16em]"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => duplicate(a)}
                    className="text-[11px] uppercase tracking-[0.16em]"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={() => {
                      const slug = (s: string) =>
                        (s || '')
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, '_')
                          .replace(/^_|_$/g, '')
                      const def = `${slug(a.title) || a.id}_${slug(a.artist) || 'artist'}_01`
                      const name = prompt('PDF filename (without .pdf)', def)
                      if (name) exportArtworkPdf({ ...a, id: name })
                    }}
                    className="text-[11px] uppercase tracking-[0.16em]"
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => remove(a.id)}
                    className="text-[11px] uppercase tracking-[0.16em] text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>

      {editing && (
        <EditorDrawer
          aw={editing}
          ownerId={user.id}
          onChange={setEditing}
          onSave={save}
          onCancel={() => {
            setEditing(null)
            setEditingCollections([])
          }}
          collections={collections}
          selectedCollectionIds={editingCollections}
          onToggleCollection={cid =>
            setEditingCollections(prev =>
              prev.includes(cid) ? prev.filter(x => x !== cid) : [...prev, cid],
            )
          }
        />
      )}
    </div>
  )
}

function EditorDrawer({
  aw,
  ownerId,
  onChange,
  onSave,
  onCancel,
  collections,
  selectedCollectionIds,
  onToggleCollection,
}: {
  aw: Artwork
  ownerId: string
  onChange: (a: Artwork) => void
  onSave: () => void
  onCancel: () => void
  collections: Collection[]
  selectedCollectionIds: string[]
  onToggleCollection: (id: string) => void
}) {
  const set = <K extends keyof Artwork>(k: K, v: Artwork[K]) => onChange({ ...aw, [k]: v })
  const [uploading, setUploading] = useState(false)

  async function uploadThumb(f: File) {
    try {
      setUploading(true)
      const url = await uploadImage(f, ownerId)
      onChange({ ...aw, image: url, thumb: url })
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 md:p-8"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[920px] bg-paper max-h-[92vh] overflow-y-auto shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <header className="sticky top-0 bg-paper border-b border-line px-6 py-4 flex items-center justify-between z-10">
          <h2 className="font-display text-[18px]">Edit artwork</h2>
          <div className="flex gap-2">
            <button onClick={onCancel} className="px-3 py-2 text-[11px] tracking-[0.16em] uppercase border border-line">
              Cancel
            </button>
            <button onClick={onSave} className="px-3 py-2 text-[11px] tracking-[0.16em] uppercase bg-ink text-paper">
              Save
            </button>
          </div>
        </header>

        <div className="px-6 py-6 grid gap-4 text-[13px]">
          <Field label="Type">
            <select value={aw.type} onChange={e => set('type', e.target.value as Artwork['type'])} className="input">
              <option value="painting">2D / Painting</option>
              <option value="sculpture">Sculpture</option>
              <option value="video">Video</option>
              <option value="digital">Digital</option>
            </select>
          </Field>
          <Field label="Status">
            <select
              value={aw.status ?? 'for_sale'}
              onChange={e => set('status', e.target.value as ArtworkStatus)}
              className="input"
            >
              {ARTWORK_STATUSES.map(s => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
          {collections.length > 0 && (
            <Field label="Collections">
              <div className="flex flex-wrap gap-2">
                {collections.map(c => {
                  const on = selectedCollectionIds.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onToggleCollection(c.id)}
                      className={`px-2 py-1 text-[11px] tracking-[0.12em] uppercase border ${
                        on ? 'bg-ink text-paper border-ink' : 'border-line'
                      }`}
                    >
                      {c.name}
                    </button>
                  )
                })}
              </div>
            </Field>
          )}
          <Field label="Title*">
            <input value={aw.title} onChange={e => set('title', e.target.value)} className="input" />
          </Field>
          <Field label="Artist">
            <input value={aw.artist} onChange={e => set('artist', e.target.value)} className="input" />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Width (cm)*">
              <input
                type="number"
                value={aw.widthCm}
                onChange={e => set('widthCm', Number(e.target.value))}
                className="input"
              />
            </Field>
            <Field label="Height (cm)*">
              <input
                type="number"
                value={aw.heightCm}
                onChange={e => set('heightCm', Number(e.target.value))}
                className="input"
              />
            </Field>
            <Field label="Depth (cm)">
              <input
                type="number"
                value={aw.depthCm ?? ''}
                onChange={e => set('depthCm', e.target.value ? Number(e.target.value) : undefined)}
                className="input"
              />
            </Field>
          </div>
          <Field label="Medium">
            <input value={aw.medium} onChange={e => set('medium', e.target.value)} className="input" />
          </Field>
          <Field label="Material">
            <input value={aw.material ?? ''} onChange={e => set('material', e.target.value)} className="input" />
          </Field>
          <Field label="Year">
            <input value={aw.year} onChange={e => set('year', e.target.value)} className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price">
              <input
                type="number"
                value={aw.price ?? ''}
                onChange={e => set('price', e.target.value ? Number(e.target.value) : undefined)}
                className="input"
              />
            </Field>
            <Field label="Currency">
              <input value={aw.currency ?? 'EUR'} onChange={e => set('currency', e.target.value)} className="input" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="SQSP SKU">
              <input
                value={aw.sqspSku ?? ''}
                onChange={e => set('sqspSku', e.target.value || undefined)}
                placeholder="Defaults to artwork id"
                className="input"
              />
            </Field>
            <Field label="Commission %">
              <input
                type="number"
                step="0.1"
                value={aw.commissionPct ?? ''}
                onChange={e =>
                  set('commissionPct', e.target.value ? Number(e.target.value) : undefined)
                }
                className="input"
              />
            </Field>
          </div>
          <Field label="Tax amount">
            <input
              type="number"
              step="0.01"
              value={aw.taxAmount ?? ''}
              onChange={e =>
                set('taxAmount', e.target.value ? Number(e.target.value) : undefined)
              }
              className="input"
            />
          </Field>
          <div className="border-t border-line pt-3 mt-1">
            <p className="text-[11px] tracking-[0.20em] uppercase text-ink-muted mb-2">
              Location
            </p>
          </div>
          <Field label="Location address">
            <input
              value={aw.locationAddress ?? ''}
              onChange={e => set('locationAddress', e.target.value || undefined)}
              className="input"
            />
          </Field>
          <Field label="Location country">
            <input
              value={aw.locationCountry ?? ''}
              onChange={e => set('locationCountry', e.target.value || undefined)}
              className="input"
            />
          </Field>
          <div className="border-t border-line pt-3 mt-1">
            <p className="text-[11px] tracking-[0.20em] uppercase text-ink-muted mb-2">
              Contact (attached to artwork)
            </p>
          </div>
          <Field label="Contact name">
            <input
              value={aw.contactName ?? ''}
              onChange={e => set('contactName', e.target.value || undefined)}
              className="input"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact email">
              <input
                type="email"
                value={aw.contactEmail ?? ''}
                onChange={e => set('contactEmail', e.target.value || undefined)}
                className="input"
              />
            </Field>
            <Field label="Contact phone">
              <input
                value={aw.contactPhone ?? ''}
                onChange={e => set('contactPhone', e.target.value || undefined)}
                className="input"
              />
            </Field>
          </div>
          <Field label="Description">
            <textarea
              value={aw.description ?? ''}
              onChange={e => set('description', e.target.value)}
              maxLength={1000}
              rows={4}
              className="input"
            />
          </Field>
          <Field label="Image">
            <input
              type="file"
              accept="image/*"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) uploadThumb(f)
              }}
              className="block w-full text-[12px]"
            />
            {uploading && <p className="text-[11px] text-ink-muted mt-1">Uploading…</p>}
            {aw.image && (
              <div className="mt-2 flex items-center gap-3">
                <img src={aw.image} alt="" className="w-16 h-16 object-cover" />
                <span className="text-[11px] text-ink-muted truncate">{aw.image}</span>
              </div>
            )}
          </Field>
          <Field label="Image URL (or paste)">
            <input value={aw.image ?? ''} onChange={e => set('image', e.target.value || null)} className="input" />
          </Field>
          <Field label="Purchase URL">
            <input value={aw.purchaseUrl ?? ''} onChange={e => set('purchaseUrl', e.target.value || undefined)} className="input" />
          </Field>
          <Field label="View-more URL">
            <input value={aw.viewMoreUrl ?? ''} onChange={e => set('viewMoreUrl', e.target.value || undefined)} className="input" />
          </Field>
          <Field label="NFT URL">
            <input value={aw.nftUrl ?? ''} onChange={e => set('nftUrl', e.target.value || undefined)} className="input" />
          </Field>
          <Field label="Collection">
            <input value={aw.collection ?? ''} onChange={e => set('collection', e.target.value || undefined)} className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Orientation">
              <select
                value={aw.orientation ?? ''}
                onChange={e =>
                  set('orientation', (e.target.value || undefined) as Artwork['orientation'])
                }
                className="input"
              >
                <option value="">—</option>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
                <option value="square">Square</option>
                <option value="panoramic">Panoramic</option>
              </select>
            </Field>
            <Field label="Privacy">
              <select
                value={aw.privacy ?? 'public'}
                onChange={e => set('privacy', e.target.value as Artwork['privacy'])}
                className="input"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!aw.sold} onChange={e => set('sold', e.target.checked)} />
              Sold
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!aw.transparent}
                onChange={e => set('transparent', e.target.checked)}
              />
              Transparent background
            </label>
          </div>
        </div>
      </div>
      <style jsx>{`
        :global(.input) {
          width: 100%;
          background: var(--paper, #fff);
          border: 1px solid var(--line, #e5e7eb);
          padding: 0.5rem 0.75rem;
          font-size: 13px;
        }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] tracking-[0.16em] uppercase text-ink-muted mb-1">{label}</span>
      {children}
    </label>
  )
}

function FilterBar({
  filters,
  onChange,
  collections,
  shown,
  total,
}: {
  filters: Filters
  onChange: (f: Filters) => void
  collections: Collection[]
  shown: number
  total: number
}) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    onChange({ ...filters, [k]: v })
  return (
    <div className="border border-line p-4 mb-6 grid gap-3 grid-cols-1 md:grid-cols-6 text-[12px]">
      <input
        value={filters.q}
        onChange={e => set('q', e.target.value)}
        placeholder="Search title / artist / medium…"
        className="border border-line px-2 py-1.5 md:col-span-2"
      />
      <select
        value={filters.status}
        onChange={e => set('status', e.target.value as Filters['status'])}
        className="border border-line px-2 py-1.5 bg-paper"
      >
        <option value="all">All statuses</option>
        {ARTWORK_STATUSES.map(s => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <select
        value={filters.type}
        onChange={e => set('type', e.target.value)}
        className="border border-line px-2 py-1.5 bg-paper"
      >
        <option value="all">All types</option>
        <option value="painting">Painting</option>
        <option value="sculpture">Sculpture</option>
        <option value="video">Video</option>
        <option value="digital">Digital</option>
      </select>
      <select
        value={filters.collectionId}
        onChange={e => set('collectionId', e.target.value)}
        className="border border-line px-2 py-1.5 bg-paper"
      >
        <option value="all">All collections</option>
        {collections.map(c => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <div className="flex gap-1">
        <input
          value={filters.priceMin}
          onChange={e => set('priceMin', e.target.value)}
          placeholder="min €"
          className="border border-line px-2 py-1.5 w-1/2 min-w-0"
          inputMode="numeric"
        />
        <input
          value={filters.priceMax}
          onChange={e => set('priceMax', e.target.value)}
          placeholder="max €"
          className="border border-line px-2 py-1.5 w-1/2 min-w-0"
          inputMode="numeric"
        />
      </div>
      <p className="md:col-span-6 text-[11px] tracking-[0.16em] uppercase text-ink-muted">
        Showing {shown} of {total}
        {(filters.q ||
          filters.status !== 'all' ||
          filters.type !== 'all' ||
          filters.collectionId !== 'all' ||
          filters.priceMin ||
          filters.priceMax) && (
          <button
            type="button"
            onClick={() =>
              onChange({
                q: '',
                status: 'all',
                type: 'all',
                collectionId: 'all',
                priceMin: '',
                priceMax: '',
              })
            }
            className="ml-3 underline normal-case tracking-normal"
          >
            Clear
          </button>
        )}
      </p>
    </div>
  )
}

function CollectionsPanel({
  collections,
  membership,
  artworks,
  ownerId,
  onChange,
}: {
  collections: Collection[]
  membership: Record<string, string[]>
  artworks: Artwork[]
  ownerId: string
  onChange: () => void
}) {
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)

  async function add() {
    const name = newName.trim()
    if (!name) return
    try {
      setBusy(true)
      await createCollection(ownerId, name)
      setNewName('')
      onChange()
    } finally {
      setBusy(false)
    }
  }

  async function rename(c: Collection) {
    const next = prompt('Rename collection', c.name)
    if (!next || next === c.name) return
    setBusy(true)
    try {
      await updateCollection(c.id, { name: next })
      onChange()
    } finally {
      setBusy(false)
    }
  }

  async function remove(c: Collection) {
    if (!confirm(`Delete collection "${c.name}"? Artworks remain, just unlinked.`)) return
    setBusy(true)
    try {
      await deleteCollection(c.id)
      onChange()
    } finally {
      setBusy(false)
    }
  }

  async function exportPdf(c: Collection) {
    const ids = membership[c.id] ?? []
    const items = artworks.filter(a => ids.includes(a.id))
    if (!items.length) {
      alert('Collection is empty.')
      return
    }
    setBusy(true)
    try {
      await exportCollectionPdf(c, items)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border border-line p-4 mb-6">
      <p className="text-[11px] tracking-[0.20em] uppercase text-ink-muted mb-3">
        Collections
      </p>
      <div className="flex gap-2 mb-4">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="New collection name"
          className="flex-1 border border-line px-2 py-1.5 text-[12px]"
        />
        <button
          onClick={add}
          disabled={busy || !newName.trim()}
          className="px-3 py-1.5 text-[11px] tracking-[0.16em] uppercase bg-ink text-paper disabled:opacity-40"
        >
          Add
        </button>
      </div>
      {!collections.length && (
        <p className="text-[12px] text-ink-muted">No collections yet.</p>
      )}
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {collections.map(c => {
          const count = (membership[c.id] ?? []).length
          return (
            <li key={c.id} className="border border-line p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] truncate">{c.name}</p>
                <p className="text-[11px] tracking-[0.14em] uppercase text-ink-muted">
                  {count} works · {c.privacy}
                </p>
              </div>
              <button onClick={() => exportPdf(c)} className="text-[11px] uppercase tracking-[0.14em]">
                PDF
              </button>
              <button onClick={() => rename(c)} className="text-[11px] uppercase tracking-[0.14em]">
                Rename
              </button>
              <button onClick={() => remove(c)} className="text-[11px] uppercase tracking-[0.14em] text-red-600">
                Delete
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
