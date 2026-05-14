'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ARTWORK_STATUSES, Artwork, ArtworkOwnershipStatus, ArtworkStatus, Collection } from '@/types'
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
  listCollectionMembers,
  listMyCollections,
  setArtworkCollections,
  slugify,
  updateCollection,
  updateCollectionMember,
} from '@/lib/db/collections'
import type { CollectionMember, SaleMode } from '@/types'
import { signOut, useAuth } from '@/lib/db/auth'
import { exportArtworkPdf, exportCollectionPdf } from '@/lib/artworkSheet'
import { exportInventoryPdf } from '@/lib/inventoryReport'
import { downloadSqspCsv } from '@/lib/sqspExport'
import {
  addArtworkImage,
  deleteArtworkImage,
  listArtworkImages,
} from '@/lib/db/artworkImages'
import type { ArtworkImage } from '@/lib/db/artworkImages'
import LoginForm from './LoginForm'
import StatusPill from './ui/StatusPill'
import { ChevronDown, Copy, FileDown, Pencil, Trash2 } from 'lucide-react'

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
  const [contacts, setContacts] = useState<{ id: string; name: string | null; email: string | null; isArtist?: boolean }[]>([])
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
      const [arts, cols, cs] = await Promise.all([
        listMyArtworks(user.id),
        listMyCollections(user.id),
        import('@/lib/db/contacts').then(m => m.listContacts(user.id)).catch(() => []),
      ])
      setList(arts)
      setCollections(cols)
      setContacts(cs.map(c => ({ id: c.id, name: c.name ?? null, email: c.email ?? null, isArtist: c.isArtist })))
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
    // Track recently viewed (cross-module)
    import('@/lib/recentlyViewed').then(({ trackView }) => {
      trackView({
        id: a.id,
        kind: 'artwork',
        label: a.title || 'Untitled',
        sublabel: a.artist ?? undefined,
        href: '/admin/artworks',
        thumbUrl: a.thumb,
      })
    })
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

  // Universal Create deep-link: ?new=1 from sidebar Create menu
  const router = useRouter()
  const searchParams = useSearchParams()
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      openNewEditor()
      router.replace('/admin/artworks')
    }
  }, [searchParams, router])

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
    <div className="min-h-dvh bg-bg text-ink">
      {/* ArtPlacer-style page header */}
      <header className="bg-paper border-b border-line">
        <div className="px-6 md:px-10 h-16 flex items-center gap-4 flex-wrap">
          <h1 className="font-display text-[18px] tracking-[0.18em] uppercase">Artworks</h1>
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
            onClick={openNewEditor}
            disabled={busy}
            className="btn-outline"
          >
            <span className="text-[14px]">+</span> Upload Artworks
          </button>
          <div className="ml-auto flex items-center gap-3">
            <ExportMenu
              onImport={() => fileRef.current?.click()}
              onExportCsv={exportCsv}
              onExportSqsp={() => downloadSqspCsv(list)}
              onExportInventory={() =>
                exportInventoryPdf(list, { groupBy: 'artist', ownerEmail: user.email ?? '' })
              }
              disabled={!list.length}
            />
            <button
              onClick={() => setShowCollectionsPanel(s => !s)}
              className="btn-outline"
            >
              Collections · {collections.length}
            </button>
          </div>
        </div>
        {/* Sub bar — quota + bulk + sort */}
        <div className="px-6 md:px-10 h-11 border-t border-line bg-bg flex items-center gap-4 text-meta uppercase tracking-[0.12em] text-ink-muted">
          <span>
            Quota: <span className="text-ink font-bold">{list.length} / 1500</span>
          </span>
          <span className="ml-auto">{filtered.length} of {list.length} shown</span>
        </div>
        {err && <p className="px-6 md:px-10 py-2 text-[12px] text-red-600">{err}</p>}
      </header>

      <main className="px-6 md:px-10 py-6 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        {/* Left filter sidebar */}
        <aside className="text-body lg:sticky lg:top-[124px] lg:self-start">
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
        </aside>

        {/* Grid */}
        <section>
          {!list.length && !busy && (
            <div className="py-20 text-center">
              <p className="text-body text-ink-muted">No artworks yet.</p>
              <button onClick={openNewEditor} className="btn-primary mt-4">
                + Upload your first artwork
              </button>
            </div>
          )}
          {list.length > 0 && !filtered.length && (
            <p className="text-ink-muted text-body py-8 text-center">
              No artworks match the filters.
            </p>
          )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
          {filtered.map(a => (
            <article key={a.id} className="group">
              <div className="aspect-[4/5] bg-paper border border-line/60 overflow-hidden relative">
                {a.thumb ? (
                  <img
                    src={a.thumb}
                    alt={a.title}
                    className="w-full h-full object-cover transition-transform duration-300 ease-snap group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="w-full h-full bg-line/30 grid place-items-center text-meta uppercase text-ink-muted">
                    no image
                  </div>
                )}
                {a.privacy === 'private' && (
                  <span className="absolute top-2 left-2 text-[10px] tracking-[0.16em] uppercase bg-paper/85 backdrop-blur px-1.5 py-0.5 rounded-xs">
                    Private
                  </span>
                )}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button
                    onClick={() => openEditor(a)}
                    aria-label="Edit"
                    className="w-8 h-8 grid place-items-center bg-paper/90 backdrop-blur rounded-sm text-ink hover:bg-paper"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => duplicate(a)}
                    aria-label="Duplicate"
                    className="w-8 h-8 grid place-items-center bg-paper/90 backdrop-blur rounded-sm text-ink hover:bg-paper"
                    title="Duplicate"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => {
                      const slug = (s: string) =>
                        (s || '')
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, '_')
                          .replace(/^_|_$/g, '')
                      const def = `${slug(a.title) || a.id}_${slug(a.artist) || 'artist'}_01`
                      const name = prompt('PDF filename', def)
                      if (name) exportArtworkPdf({ ...a, id: name })
                    }}
                    aria-label="PDF"
                    className="w-8 h-8 grid place-items-center bg-paper/90 backdrop-blur rounded-sm text-ink hover:bg-paper"
                    title="Export PDF"
                  >
                    <FileDown size={14} />
                  </button>
                  <button
                    onClick={() => remove(a.id)}
                    aria-label="Delete"
                    className="w-8 h-8 grid place-items-center bg-paper/90 backdrop-blur rounded-sm text-red-600 hover:bg-paper"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="text-center mt-3 text-[13px]">
                <p className="font-bold truncate">{a.title || '(untitled)'}</p>
                <p className="text-ink-muted">{a.artist}</p>
                <p className="text-ink-muted text-[12px] italic mt-0.5">
                  Height: {a.heightCm} cm · Width: {a.widthCm} cm
                </p>
                <div className="mt-1.5 inline-flex">
                  <StatusPill status={a.status ?? 'for_sale'} />
                </div>
              </div>
            </article>
          ))}
        </div>
        </section>
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
          ownerOptions={contacts}
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
  ownerOptions,
}: {
  aw: Artwork
  ownerId: string
  onChange: (a: Artwork) => void
  onSave: () => void
  onCancel: () => void
  collections: Collection[]
  selectedCollectionIds: string[]
  onToggleCollection: (id: string) => void
  ownerOptions: { id: string; name: string | null; email: string | null; isArtist?: boolean }[]
}) {
  const set = <K extends keyof Artwork>(k: K, v: Artwork[K]) => onChange({ ...aw, [k]: v })
  const [uploading, setUploading] = useState(false)
  const [gallery, setGallery] = useState<ArtworkImage[]>([])
  const galleryRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (aw.id && !aw.id.startsWith('_new_')) {
      listArtworkImages(aw.id).then(setGallery).catch(() => {})
    }
  }, [aw.id])

  async function uploadThumb(f: File) {
    try {
      setUploading(true)
      const url = await uploadImage(f, ownerId)
      onChange({ ...aw, image: url, thumb: url })
      // Also add to gallery as position-0 (primary)
      if (aw.id && !aw.id.startsWith('_new_')) {
        await addArtworkImage(aw.id, url, url)
        const updated = await listArtworkImages(aw.id)
        setGallery(updated)
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function uploadExtra(f: File) {
    if (!aw.id || aw.id.startsWith('_new_')) return
    try {
      setUploading(true)
      const url = await uploadImage(f, ownerId)
      await addArtworkImage(aw.id, url, url)
      const updated = await listArtworkImages(aw.id)
      setGallery(updated)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function removeGalleryImage(id: string) {
    await deleteArtworkImage(id)
    setGallery(g => g.filter(i => i.id !== id))
  }

  async function makePrimary(img: ArtworkImage) {
    onChange({ ...aw, image: img.url, thumb: img.thumbUrl ?? img.url })
    // reorder: put this one at position 0, push others up
    const others = gallery.filter(i => i.id !== img.id)
    setGallery([{ ...img, position: 0 }, ...others.map((i, n) => ({ ...i, position: n + 1 }))])
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 md:p-8"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[920px] bg-paper max-h-[92vh] overflow-y-auto rounded-md shadow-pop"
        onClick={e => e.stopPropagation()}
      >
        <header className="sticky top-0 bg-paper border-b border-line px-6 h-14 flex items-center justify-between z-10">
          <h2 className="font-display text-[14px] tracking-[0.18em] uppercase">Edit artwork</h2>
          <div className="flex gap-2">
            <button onClick={onCancel} className="btn-outline">
              Cancel
            </button>
            <button onClick={onSave} className="btn-primary">
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
          </div>
          {/* Ownership panel — conditional fields per ownership_status */}
          <OwnershipPanel aw={aw} set={set} ownerOptions={ownerOptions} />
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
          {/* Image gallery */}
          <div className="border border-line rounded-md p-4 grid gap-3">
            <div className="flex items-center justify-between">
              <span className="text-meta uppercase tracking-[0.14em] text-ink-muted font-bold">
                Images · {gallery.length > 0 ? gallery.length : (aw.image ? 1 : 0)} total
              </span>
              <span className="text-meta text-ink-muted">First = primary (used for AR)</span>
            </div>
            {/* Primary image */}
            <Field label="Primary image — upload or paste URL">
              <input
                type="file"
                accept="image/*"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadThumb(f) }}
                className="block w-full text-body"
              />
              <input
                value={aw.image ?? ''}
                onChange={e => set('image', e.target.value || null)}
                placeholder="https://… or upload above"
                className="input mt-2"
              />
              {aw.image && (
                <img src={aw.image} alt="" className="mt-2 h-24 w-auto object-contain border border-line rounded-xs" />
              )}
            </Field>
            {/* Gallery */}
            {gallery.length > 0 && (
              <div>
                <p className="text-meta uppercase tracking-[0.12em] text-ink-muted mb-2">Gallery</p>
                <div className="flex flex-wrap gap-2">
                  {gallery.map(img => (
                    <div key={img.id} className="relative group w-20 h-20">
                      <img src={img.thumbUrl ?? img.url} alt="" className="w-full h-full object-cover border border-line rounded-xs" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xs flex flex-col items-center justify-center gap-1">
                        {img.url !== aw.image && (
                          <button
                            onClick={() => makePrimary(img)}
                            className="text-paper text-[10px] uppercase tracking-[0.12em] underline"
                            title="Set as primary"
                          >
                            Primary
                          </button>
                        )}
                        <button
                          onClick={() => removeGalleryImage(img.id)}
                          className="text-red-400 text-[10px] uppercase tracking-[0.12em]"
                        >
                          Remove
                        </button>
                      </div>
                      {img.position === 0 && (
                        <span className="absolute top-1 left-1 text-[9px] bg-accent text-paper px-1 rounded-xs">Primary</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Add extra image */}
            {aw.id && !aw.id.startsWith('_new_') && (
              <div>
                <input
                  ref={galleryRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadExtra(f); if (galleryRef.current) galleryRef.current.value = '' }}
                />
                <button
                  onClick={() => galleryRef.current?.click()}
                  disabled={uploading}
                  className="btn-outline disabled:opacity-40"
                >
                  {uploading ? 'Uploading…' : '+ Add another image'}
                </button>
              </div>
            )}
          </div>
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

// Read-only calc cell so calculated economics line up with input fields.
function CalcField({ label, value, currency = '€', hint }: { label: string; value: number; currency?: string; hint?: string }) {
  return (
    <div>
      <span className="block text-[11px] tracking-[0.16em] uppercase text-ink-muted mb-1">{label}</span>
      <div className="input flex items-center justify-between bg-bg cursor-default select-text">
        <span className="tabular-nums font-bold">{currency} {Math.round(value).toLocaleString()}</span>
        {hint && <span className="text-meta text-ink-muted">{hint}</span>}
      </div>
    </div>
  )
}

// Ownership-aware field panel.
//   dealer    — purchase + sale + tax + sales commission + profit
//   artist    — list/sold/tax/our commission/sales commission/artist profit
//   collector — purchase + list/sold/tax/our commission/sales commission
function OwnershipPanel({
  aw,
  set,
  ownerOptions,
}: {
  aw: Artwork
  set: <K extends keyof Artwork>(k: K, v: Artwork[K]) => void
  ownerOptions: { id: string; name: string | null; email: string | null; isArtist?: boolean }[]
}) {
  const status: ArtworkOwnershipStatus = (aw.ownershipStatus as ArtworkOwnershipStatus) ?? 'dealer'

  // Centralised economic calculations. All percentages applied to sold price.
  const sold = Number(aw.soldPrice ?? 0)
  const purchase = Number(aw.costBasis ?? 0)
  const taxPct = Number(aw.taxPct ?? 0)
  const ourPct = Number(aw.commissionPct ?? 0)
  const salesPct = Number(aw.salesCommissionPct ?? 0)
  const taxAmount = sold > 0 && taxPct > 0 ? sold * taxPct / 100 : 0
  const ourCommission = sold > 0 && ourPct > 0 ? sold * ourPct / 100 : 0
  const salesCommission = sold > 0 && salesPct > 0 ? sold * salesPct / 100 : 0
  // Dealer profit: keep gross minus what's paid out (tax + sales person commission) minus purchase.
  const dealerProfit = sold - purchase - taxAmount - salesCommission
  const dealerProfitPct = purchase > 0 ? (dealerProfit / purchase) * 100 : 0
  // Artist's take after dealer's cut + tax + sales commission.
  const artistProfit = sold - taxAmount - ourCommission - salesCommission

  // Restrict owner-contact picker depending on ownership type.
  const ownerOptionsForRole = status === 'artist'
    ? ownerOptions.filter(o => o.isArtist)
    : ownerOptions.filter(o => !o.isArtist)

  return (
    <div className="border border-line rounded-md p-4 grid gap-3">
      <div className="flex items-baseline gap-3">
        <p className="text-[11px] tracking-[0.20em] uppercase text-ink-muted font-bold">Ownership</p>
      </div>
      <Field label="Ownership status">
        <select
          value={status}
          onChange={e => {
            const next = e.target.value as ArtworkOwnershipStatus
            set('ownershipStatus', next)
            // When switching to dealer, drop the owner contact.
            if (next === 'dealer') set('ownerContactId', null)
          }}
          className="input"
        >
          <option value="dealer">Owned by Dealer / Company (us)</option>
          <option value="artist">Owned by Artist</option>
          <option value="collector">Owned by Collector / Gallery</option>
        </select>
      </Field>

      {status !== 'dealer' && (
        <Field label={status === 'artist' ? 'Artist contact' : 'Collector / gallery contact'}>
          <select
            value={aw.ownerContactId ?? ''}
            onChange={e => set('ownerContactId', e.target.value || null)}
            className="input"
          >
            <option value="">— none —</option>
            {ownerOptionsForRole.map(c => (
              <option key={c.id} value={c.id}>
                {c.name || c.email || '—'}
              </option>
            ))}
          </select>
        </Field>
      )}

      {/* Purchase block — dealer + collector only */}
      {status !== 'artist' && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Purchase price (€)">
            <input
              type="number"
              value={aw.costBasis ?? ''}
              onChange={e => set('costBasis', e.target.value ? Number(e.target.value) : null)}
              className="input"
            />
          </Field>
          <Field label="Purchase date">
            <input
              type="date"
              value={aw.purchaseDate ?? ''}
              onChange={e => set('purchaseDate', e.target.value || null)}
              className="input"
            />
          </Field>
        </div>
      )}

      {/* Sale block — always shown */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="List price (€)">
          <input
            type="number"
            value={aw.price ?? ''}
            onChange={e => set('price', e.target.value ? Number(e.target.value) : undefined)}
            className="input"
          />
        </Field>
        <Field label="Sold price (€)">
          <input
            type="number"
            value={aw.soldPrice ?? ''}
            onChange={e => set('soldPrice', e.target.value ? Number(e.target.value) : null)}
            className="input"
          />
        </Field>
      </div>

      {/* Tax */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tax %">
          <input
            type="number"
            step="0.1"
            value={aw.taxPct ?? ''}
            onChange={e => set('taxPct', e.target.value ? Number(e.target.value) : null)}
            className="input"
          />
        </Field>
        <CalcField label="Tax amount" value={taxAmount} hint={taxPct ? `${taxPct}% of sold` : undefined} />
      </div>

      {/* Commission split */}
      {status === 'dealer' ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sales person commission %">
            <input
              type="number"
              step="0.1"
              value={aw.salesCommissionPct ?? aw.commissionPct ?? ''}
              onChange={e => set('salesCommissionPct', e.target.value ? Number(e.target.value) : null)}
              className="input"
            />
          </Field>
          <CalcField label="Sales person commission (€)" value={salesCommission} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Our commission %">
              <input
                type="number"
                step="0.1"
                value={aw.commissionPct ?? ''}
                onChange={e => set('commissionPct', e.target.value ? Number(e.target.value) : undefined)}
                className="input"
              />
            </Field>
            <CalcField label="Our commission (€)" value={ourCommission} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sales person commission %">
              <input
                type="number"
                step="0.1"
                value={aw.salesCommissionPct ?? ''}
                onChange={e => set('salesCommissionPct', e.target.value ? Number(e.target.value) : null)}
                className="input"
              />
            </Field>
            <CalcField label="Sales person commission (€)" value={salesCommission} />
          </div>
        </>
      )}

      {/* Profit row(s) */}
      {status === 'dealer' && (
        <div className="grid grid-cols-2 gap-3 border-t border-line pt-3">
          <CalcField label="Profit (€)" value={dealerProfit} />
          <CalcField label="Profit %" value={dealerProfitPct} currency="" hint="of purchase" />
        </div>
      )}
      {status === 'artist' && (
        <div className="border-t border-line pt-3">
          <CalcField label="Artist profit (€)" value={artistProfit} hint="after tax + commissions" />
        </div>
      )}
    </div>
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
  const [open, setOpen] = useState<Record<string, boolean>>({
    collection: true,
    status: true,
    type: true,
    price: true,
  })
  const toggle = (k: string) => setOpen(s => ({ ...s, [k]: !s[k] }))
  const dirty =
    !!filters.q ||
    filters.status !== 'all' ||
    filters.type !== 'all' ||
    filters.collectionId !== 'all' ||
    !!filters.priceMin ||
    !!filters.priceMax
  return (
    <div className="text-[12px]">
      {/* Search */}
      <input
        value={filters.q}
        onChange={e => set('q', e.target.value)}
        placeholder="Search…"
        className="w-full border border-line px-3 h-9 bg-paper text-[12px] mb-3"
      />

      <Section label="Collection" open={open.collection} onToggle={() => toggle('collection')}>
        <RadioRow
          name="col"
          checked={filters.collectionId === 'all'}
          onChange={() => set('collectionId', 'all')}
          label={`All collections (${total})`}
        />
        {collections.map(c => (
          <RadioRow
            key={c.id}
            name="col"
            checked={filters.collectionId === c.id}
            onChange={() => set('collectionId', c.id)}
            label={c.name}
          />
        ))}
      </Section>

      <Section label="Status" open={open.status} onToggle={() => toggle('status')}>
        <RadioRow
          name="st"
          checked={filters.status === 'all'}
          onChange={() => set('status', 'all')}
          label="All statuses"
        />
        {ARTWORK_STATUSES.map(s => (
          <RadioRow
            key={s}
            name="st"
            checked={filters.status === s}
            onChange={() => set('status', s)}
            label={STATUS_LABEL[s]}
          />
        ))}
      </Section>

      <Section label="Type of artwork" open={open.type} onToggle={() => toggle('type')}>
        {[
          ['all', 'All types'],
          ['painting', 'Painting'],
          ['sculpture', 'Sculpture'],
          ['video', 'Video'],
          ['digital', 'Digital'],
        ].map(([v, lbl]) => (
          <RadioRow
            key={v}
            name="ty"
            checked={filters.type === v}
            onChange={() => set('type', v)}
            label={lbl}
          />
        ))}
      </Section>

      <Section label="Price" open={open.price} onToggle={() => toggle('price')}>
        <div className="flex gap-2">
          <input
            value={filters.priceMin}
            onChange={e => set('priceMin', e.target.value)}
            placeholder="min €"
            className="border border-line px-2 h-8 w-1/2 min-w-0 bg-paper"
            inputMode="numeric"
          />
          <input
            value={filters.priceMax}
            onChange={e => set('priceMax', e.target.value)}
            placeholder="max €"
            className="border border-line px-2 h-8 w-1/2 min-w-0 bg-paper"
            inputMode="numeric"
          />
        </div>
      </Section>

      {dirty && (
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
          className="mt-4 text-[11px] tracking-[0.14em] uppercase underline text-ink-muted hover:text-ink"
        >
          Clear filters
        </button>
      )}
      <p className="mt-4 text-[10px] tracking-[0.16em] uppercase text-ink-muted">
        {shown} of {total}
      </p>
    </div>
  )
}

function Section({
  label,
  open,
  onToggle,
  children,
}: {
  label: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border-t border-line">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between py-3 text-[10px] tracking-[0.14em] uppercase font-bold text-ink"
      >
        {label}
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? '' : '-rotate-90'} text-ink-muted`}
        />
      </button>
      {open && <div className="pb-4 grid gap-1.5">{children}</div>}
    </div>
  )
}

function RadioRow({
  name,
  checked,
  onChange,
  label,
}: {
  name: string
  checked: boolean
  onChange: () => void
  label: string
}) {
  return (
    <label className="flex items-center gap-2 text-[12px] cursor-pointer hover:text-ink text-ink-soft">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="accent-accent"
      />
      <span className="truncate">{label}</span>
    </label>
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
      <ul className="grid grid-cols-1 gap-2">
        {collections.map(c => {
          const count = (membership[c.id] ?? []).length
          return <CollectionRow key={c.id} c={c} count={count} artworks={artworks} onChange={onChange}
            onPdf={() => exportPdf(c)} onRename={() => rename(c)} onDelete={() => remove(c)} />
        })}
      </ul>
    </div>
  )
}

function ExportMenu({
  onImport,
  onExportCsv,
  onExportSqsp,
  onExportInventory,
  disabled,
}: {
  onImport: () => void
  onExportCsv: () => void
  onExportSqsp: () => void
  onExportInventory: () => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onClick = () => setOpen(false)
    document.addEventListener('keydown', onKey)
    setTimeout(() => document.addEventListener('click', onClick), 0)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onClick)
    }
  }, [open])
  return (
    <div className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="h-9 px-3 text-[11px] tracking-[0.18em] uppercase border border-line hover:border-ink inline-flex items-center gap-1.5"
      >
        Import / Export
        <ChevronDown size={12} />
      </button>
      {open && (
        <div
          onClick={e => e.stopPropagation()}
          className="absolute right-0 top-full mt-1 z-30 bg-paper border border-line rounded-md shadow-pop min-w-[200px] py-1"
        >
          <MenuItem onClick={() => { onImport(); setOpen(false) }}>Import CSV…</MenuItem>
          <div className="my-1 border-t border-line" />
          <MenuItem disabled={disabled} onClick={() => { onExportCsv(); setOpen(false) }}>Export CSV</MenuItem>
          <MenuItem disabled={disabled} onClick={() => { onExportSqsp(); setOpen(false) }}>Export Squarespace CSV</MenuItem>
          <MenuItem disabled={disabled} onClick={() => { onExportInventory(); setOpen(false) }}>Inventory Report PDF</MenuItem>
        </div>
      )}
    </div>
  )
}

function MenuItem({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full text-left px-3 py-2 text-[12px] tracking-[0.06em] hover:bg-line/40 disabled:opacity-40"
    >
      {children}
    </button>
  )
}

function CollectionRow({
  c,
  count,
  artworks,
  onChange,
  onPdf,
  onRename,
  onDelete,
}: {
  c: Collection
  count: number
  artworks: Artwork[]
  onChange: () => void
  onPdf: () => void
  onRename: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const [presentationOpen, setPresentationOpen] = useState(false)
  const [slug, setSlug] = useState(c.slug ?? slugify(c.name))
  const [status, setStatus] = useState<'draft' | 'live'>(c.viewingRoomStatus ?? 'draft')
  const [pw, setPw] = useState(c.viewingRoomPassword ?? '')
  const [busy, setBusy] = useState(false)

  async function persist() {
    setBusy(true)
    try {
      await updateCollection(c.id, {
        slug: slug || null,
        viewingRoomStatus: status,
        viewingRoomPassword: pw || null,
      })
      onChange()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  const url = slug && typeof window !== 'undefined'
    ? `${window.location.origin}/v/${slug}`
    : ''

  return (
    <li className="border border-line">
      <div className="p-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] truncate">{c.name}</p>
          <p className="text-[11px] tracking-[0.14em] uppercase text-ink-muted">
            {count} works · {c.privacy}
            {status === 'live' && slug ? ' · viewing room live' : ''}
          </p>
        </div>
        <button onClick={() => setOpen(o => !o)} className="text-[11px] uppercase tracking-[0.14em]">
          {open ? 'Close' : 'Viewing room'}
        </button>
        <button onClick={() => setPresentationOpen(true)} className="text-[11px] uppercase tracking-[0.14em]">
          Presentation
        </button>
        <button onClick={onPdf} className="text-[11px] uppercase tracking-[0.14em]">PDF</button>
        <button onClick={onRename} className="text-[11px] uppercase tracking-[0.14em]">Rename</button>
        <button onClick={onDelete} className="text-[11px] uppercase tracking-[0.14em] text-red-600">Delete</button>
      </div>
      {open && (
        <div className="border-t border-line p-3 grid gap-2 text-[12px]">
          <div className="flex items-center gap-2">
            <label className="text-[10px] tracking-[0.14em] uppercase text-ink-muted w-20">Slug</label>
            <span className="text-ink-muted">/v/</span>
            <input
              value={slug}
              onChange={e => setSlug(slugify(e.target.value))}
              placeholder="my-collection"
              className="border border-line px-2 py-1 flex-1 text-[12px]"
            />
            {url && (
              <button
                onClick={() => navigator.clipboard.writeText(url)}
                className="text-[10px] tracking-[0.14em] uppercase underline"
              >
                Copy URL
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] tracking-[0.14em] uppercase text-ink-muted w-20">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as 'draft' | 'live')}
              className="border border-line bg-paper px-2 py-1 text-[12px]"
            >
              <option value="draft">Draft</option>
              <option value="live">Live</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] tracking-[0.14em] uppercase text-ink-muted w-20">Password</label>
            <input
              type="text"
              value={pw}
              onChange={e => setPw(e.target.value)}
              placeholder="Optional gating password"
              className="border border-line px-2 py-1 flex-1 text-[12px]"
            />
          </div>
          <div className="flex items-center justify-end gap-2 mt-1">
            <button
              onClick={persist}
              disabled={busy}
              className="px-3 py-1 text-[11px] tracking-[0.14em] uppercase bg-ink text-paper disabled:opacity-40"
            >
              {busy ? 'Saving…' : 'Save viewing room'}
            </button>
          </div>
          {status === 'live' && url && (
            <p className="text-[11px] text-ink-muted">
              Live at <a href={url} target="_blank" rel="noopener" className="underline">{url}</a>
            </p>
          )}
        </div>
      )}
      {presentationOpen && (
        <PresentationModal
          collection={c}
          artworks={artworks}
          onClose={() => setPresentationOpen(false)}
        />
      )}
    </li>
  )
}

// ============================================================
// Per-artwork presentation overrides — price visibility,
// sale/rent mode + 12/24/36-month rent tier pricing.
// ============================================================
function PresentationModal({
  collection,
  artworks,
  onClose,
}: {
  collection: Collection
  artworks: Artwork[]
  onClose: () => void
}) {
  const [members, setMembers] = useState<CollectionMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listCollectionMembers(collection.id).then(rows => {
      setMembers(rows)
      setLoading(false)
    })
  }, [collection.id])

  async function patch(artworkId: string, p: Partial<CollectionMember>) {
    setMembers(s => s.map(m => (m.artworkId === artworkId ? { ...m, ...p } : m)))
    await updateCollectionMember(collection.id, artworkId, p)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4 md:p-8" onClick={onClose}>
      <div
        className="w-full max-w-[920px] max-h-[92vh] overflow-y-auto bg-paper rounded-md shadow-pop"
        onClick={e => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 bg-paper border-b border-line px-6 h-14 flex items-center gap-3">
          <h2 className="font-display text-[14px] tracking-[0.18em] uppercase">
            Presentation · {collection.name}
          </h2>
          <button onClick={onClose} className="ml-auto btn-outline">
            Close
          </button>
        </header>

        <div className="px-6 py-5">
          <p className="text-meta uppercase tracking-[0.14em] text-ink-muted mb-3">
            Per-artwork overrides — applies to viewing room presentation only
          </p>

          {loading ? (
            <p className="text-body text-ink-muted py-8 text-center">Loading…</p>
          ) : !members.length ? (
            <p className="text-body text-ink-muted py-8 text-center">
              Collection is empty. Add artworks to it first.
            </p>
          ) : (
            <div className="grid gap-3">
              {members.map(m => {
                const a = artworks.find(x => x.id === m.artworkId)
                if (!a) return null
                return (
                  <article key={m.artworkId} className="border border-line rounded-md p-3 grid grid-cols-1 md:grid-cols-[80px_1fr_1fr] gap-3">
                    <div className="aspect-[4/5] bg-bg overflow-hidden border border-line/60 rounded-xs">
                      {a.thumb && <img src={a.thumb} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div>
                      <p className="font-bold text-body truncate">{a.title}</p>
                      <p className="text-meta tracking-[0.12em] uppercase text-ink-muted">
                        {a.artist} · {a.widthCm}×{a.heightCm} cm
                      </p>
                      {a.price != null && (
                        <p className="text-meta text-ink-muted mt-1">
                          List price: {a.currency || '€'} {a.price.toLocaleString()}
                        </p>
                      )}
                      <label className="inline-flex items-center gap-2 mt-3 text-body">
                        <input
                          type="checkbox"
                          checked={m.showPrice}
                          onChange={e => patch(m.artworkId, { showPrice: e.target.checked })}
                          className="accent-accent w-4 h-4"
                        />
                        Show price publicly
                      </label>
                    </div>
                    <div className="grid gap-2">
                      <label className="block">
                        <span className="block text-meta uppercase tracking-[0.14em] text-ink-muted mb-1">Mode</span>
                        <select
                          value={m.saleMode}
                          onChange={e => patch(m.artworkId, { saleMode: e.target.value as SaleMode })}
                          className="input"
                        >
                          <option value="sale">For sale</option>
                          <option value="rent">For rent</option>
                          <option value="both">Sale or rent</option>
                          <option value="hidden">Hidden / enquire</option>
                        </select>
                      </label>
                      {(m.saleMode === 'rent' || m.saleMode === 'both') && (
                        <div className="grid grid-cols-3 gap-2">
                          <RentTier
                            label="12 mo"
                            value={m.rent12mo}
                            onChange={v => patch(m.artworkId, { rent12mo: v })}
                          />
                          <RentTier
                            label="24 mo"
                            value={m.rent24mo}
                            onChange={v => patch(m.artworkId, { rent24mo: v })}
                          />
                          <RentTier
                            label="36 mo"
                            value={m.rent36mo}
                            onChange={v => patch(m.artworkId, { rent36mo: v })}
                          />
                        </div>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RentTier({
  label, value, onChange,
}: { label: string; value?: number | null; onChange: (v: number | null) => void }) {
  return (
    <label className="block">
      <span className="block text-meta uppercase tracking-[0.14em] text-ink-muted mb-1">{label}</span>
      <input
        type="number"
        value={value ?? ''}
        onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
        placeholder="€/mo"
        className="input"
      />
    </label>
  )
}
