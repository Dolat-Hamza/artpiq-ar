'use client'
import { useEffect, useRef, useState } from 'react'
import { Artwork } from '@/types'
import {
  artworksToCsv,
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
import { signOut, useAuth } from '@/lib/db/auth'
import LoginForm from './LoginForm'

export default function AdminArtworks() {
  const { user, loading, configured } = useAuth()
  const [list, setList] = useState<Artwork[]>([])
  const [editing, setEditing] = useState<Artwork | null>(null)
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
      setList(await listMyArtworks(user.id))
      setErr(null)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    if (!editing || !user) return
    try {
      setBusy(true)
      const saved = await upsertArtwork(editing, user.id)
      setList(prev => {
        const i = prev.findIndex(a => a.id === saved.id)
        return i >= 0 ? prev.map(a => (a.id === saved.id ? saved : a)) : [saved, ...prev]
      })
      setEditing(null)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Save failed')
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
              onClick={() => setEditing(newArtwork())}
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
        {!list.length && !busy && (
          <p className="text-ink-muted text-[13px]">
            No artworks yet. Click <em>New</em> or <em>Import CSV</em>.
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map(a => (
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
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setEditing({ ...a })}
                    className="text-[11px] uppercase tracking-[0.16em]"
                  >
                    Edit
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
          onCancel={() => setEditing(null)}
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
}: {
  aw: Artwork
  ownerId: string
  onChange: (a: Artwork) => void
  onSave: () => void
  onCancel: () => void
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
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onCancel}>
      <div
        className="w-full max-w-[520px] bg-paper h-full overflow-y-auto"
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
