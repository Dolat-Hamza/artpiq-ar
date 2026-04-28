'use client'
import { useEffect, useRef, useState } from 'react'
import { Artwork } from '@/types'
import {
  artworksToCsv,
  loadLocal,
  newArtwork,
  parseCsv,
  rowsToArtworks,
  saveLocal,
} from '@/lib/artworkStore'

export default function AdminArtworks() {
  const [list, setList] = useState<Artwork[]>([])
  const [editing, setEditing] = useState<Artwork | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setList(loadLocal())
  }, [])

  function commit(next: Artwork[]) {
    setList(next)
    saveLocal(next)
  }

  function startNew() {
    setEditing(newArtwork())
  }

  function save() {
    if (!editing) return
    const i = list.findIndex(a => a.id === editing.id)
    const next = i >= 0 ? list.map(a => (a.id === editing.id ? editing : a)) : [editing, ...list]
    commit(next)
    setEditing(null)
  }

  function remove(id: string) {
    if (!confirm('Delete artwork?')) return
    commit(list.filter(a => a.id !== id))
  }

  async function importCsv(f: File) {
    const text = await f.text()
    const rows = parseCsv(text)
    const imported = rowsToArtworks(rows)
    if (!imported.length) {
      alert('No rows imported. Check column headers (need at least: title, widthCm, heightCm).')
      return
    }
    // dedupe by id
    const map = new Map(list.map(a => [a.id, a]))
    imported.forEach(a => map.set(a.id, a))
    commit(Array.from(map.values()))
    alert(`Imported ${imported.length} artworks.`)
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

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="border-b border-line">
        <div className="max-w-content mx-auto px-6 md:px-12 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] tracking-[0.22em] uppercase text-ink-muted">Admin</p>
            <h1 className="font-display text-[24px] tracking-tight">Artworks ({list.length})</h1>
          </div>
          <div className="flex gap-2">
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
              onClick={startNew}
              className="px-3 py-2 text-[11px] tracking-[0.18em] uppercase bg-ink text-paper"
            >
              + New
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-content mx-auto px-6 md:px-12 py-8">
        {!list.length && (
          <p className="text-ink-muted text-[13px]">
            No artworks yet. Click <em>New</em> or <em>Import CSV</em>. Stored locally in your browser.
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
  onChange,
  onSave,
  onCancel,
}: {
  aw: Artwork
  onChange: (a: Artwork) => void
  onSave: () => void
  onCancel: () => void
}) {
  const set = <K extends keyof Artwork>(k: K, v: Artwork[K]) => onChange({ ...aw, [k]: v })

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onCancel}>
      <div
        className="w-full max-w-[520px] bg-paper h-full overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <header className="sticky top-0 bg-paper border-b border-line px-6 py-4 flex items-center justify-between">
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
          <Field label="Image URL">
            <input value={aw.image ?? ''} onChange={e => set('image', e.target.value || null)} className="input" />
          </Field>
          <Field label="Thumb URL">
            <input value={aw.thumb ?? ''} onChange={e => set('thumb', e.target.value || null)} className="input" />
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
