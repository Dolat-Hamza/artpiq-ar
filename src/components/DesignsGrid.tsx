'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trash2, FolderPlus, Folder } from 'lucide-react'
import { useAuth } from '@/lib/db/auth'
import {
  createFolder,
  deleteFolder,
  listFolders,
  renameFolder,
} from '@/lib/db/designFolders'
import {
  deleteDesign,
  listDesigns,
  updateDesign,
} from '@/lib/db/savedDesigns'
import LoginForm from './LoginForm'
import { DesignFolder, SavedDesign } from '@/types'

export default function DesignsGrid() {
  const { user, loading } = useAuth()
  const [folders, setFolders] = useState<DesignFolder[]>([])
  const [designs, setDesigns] = useState<SavedDesign[]>([])
  const [activeFolder, setActiveFolder] = useState<string | 'all' | 'unfiled'>('all')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeFolder])

  async function refresh() {
    if (!user) return
    setBusy(true)
    try {
      const [fs, ds] = await Promise.all([
        listFolders(user.id),
        listDesigns(
          user.id,
          activeFolder === 'all' ? undefined : activeFolder === 'unfiled' ? null : activeFolder,
        ),
      ])
      setFolders(fs)
      setDesigns(ds)
    } finally {
      setBusy(false)
    }
  }

  async function newFolder() {
    if (!user) return
    const name = prompt('Folder name')?.trim()
    if (!name) return
    await createFolder(user.id, name)
    refresh()
  }

  async function rmFolder(f: DesignFolder) {
    if (!confirm(`Delete folder "${f.name}"? Designs inside will become unfiled.`)) return
    await deleteFolder(f.id)
    if (activeFolder === f.id) setActiveFolder('all')
    refresh()
  }

  async function renameFolderPrompt(f: DesignFolder) {
    const next = prompt('Rename folder', f.name)?.trim()
    if (!next || next === f.name) return
    await renameFolder(f.id, next)
    refresh()
  }

  async function rmDesign(d: SavedDesign) {
    if (!confirm(`Delete "${d.name}"?`)) return
    await deleteDesign(d.id)
    refresh()
  }

  async function moveDesign(d: SavedDesign) {
    const targetName =
      prompt(
        `Move to folder (blank = unfiled). Available: ${folders.map(f => f.name).join(', ') || '—'}`,
      ) ?? null
    if (targetName === null) return
    const targetId = targetName.trim()
      ? folders.find(f => f.name.toLowerCase() === targetName.trim().toLowerCase())?.id
      : null
    if (targetName.trim() && !targetId) {
      alert('No folder with that name')
      return
    }
    await updateDesign(d.id, { folderId: targetId ?? null })
    refresh()
  }

  if (loading) {
    return <div className="p-8 text-[13px] text-ink-muted">Loading…</div>
  }
  if (!user) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6">
        <LoginForm />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="border-b border-line">
        <div className="max-w-content mx-auto px-6 md:px-12 py-5 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-[11px] tracking-[0.22em] uppercase text-ink-muted">My Designs</p>
            <h1 className="font-display text-[22px] tracking-tight">
              {designs.length} saved · {folders.length} folder(s)
            </h1>
          </div>
          <button
            onClick={newFolder}
            className="px-3 py-2 text-[11px] tracking-[0.18em] uppercase border border-line inline-flex items-center gap-2"
          >
            <FolderPlus size={13} /> New folder
          </button>
          <Link
            href="/sample-room"
            className="px-3 py-2 text-[11px] tracking-[0.18em] uppercase bg-ink text-paper"
          >
            Compose new
          </Link>
        </div>
      </header>

      <main className="max-w-content mx-auto px-6 md:px-12 py-8 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8">
        <aside className="text-[13px]">
          <p className="text-[11px] tracking-[0.18em] uppercase text-ink-muted mb-2">Folders</p>
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => setActiveFolder('all')}
                className={`block w-full text-left px-2 py-1 ${
                  activeFolder === 'all' ? 'bg-ink text-paper' : ''
                }`}
              >
                All
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveFolder('unfiled')}
                className={`block w-full text-left px-2 py-1 ${
                  activeFolder === 'unfiled' ? 'bg-ink text-paper' : ''
                }`}
              >
                Unfiled
              </button>
            </li>
            {folders.map(f => (
              <li key={f.id} className="flex items-center group">
                <button
                  onClick={() => setActiveFolder(f.id)}
                  className={`flex-1 text-left px-2 py-1 inline-flex items-center gap-2 ${
                    activeFolder === f.id ? 'bg-ink text-paper' : ''
                  }`}
                >
                  <Folder size={12} />
                  {f.name}
                </button>
                <button
                  onClick={() => renameFolderPrompt(f)}
                  className="opacity-0 group-hover:opacity-100 px-1 text-[10px] uppercase tracking-[0.14em] text-ink-muted"
                >
                  Edit
                </button>
                <button
                  onClick={() => rmFolder(f)}
                  className="opacity-0 group-hover:opacity-100 px-1 text-red-600"
                >
                  <Trash2 size={11} />
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section>
          {!designs.length && !busy && (
            <p className="text-[13px] text-ink-muted py-12 text-center">
              No designs here yet.
            </p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {designs.map(d => (
              <article key={d.id} className="border border-line">
                <Link
                  href={`/sample-room?design=${d.id}`}
                  className="block aspect-[4/3] bg-line/40 overflow-hidden"
                  title="Open in composer"
                >
                  {d.thumbUrl ? (
                    <img
                      src={d.thumbUrl}
                      alt={d.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="grid place-items-center w-full h-full text-[10px] text-ink-muted">
                      no thumbnail
                    </span>
                  )}
                </Link>
                <div className="p-3 text-[12px]">
                  <p className="font-display truncate">{d.name}</p>
                  <p className="text-ink-muted text-[10px] uppercase tracking-[0.14em] mt-0.5">
                    {d.roomId || 'custom'}
                  </p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Link
                      href={`/sample-room?design=${d.id}`}
                      className="text-[10px] uppercase tracking-[0.14em]"
                    >
                      Open
                    </Link>
                    {d.thumbUrl && (
                      <a
                        href={d.thumbUrl}
                        download={`${d.name}.jpg`}
                        className="text-[10px] uppercase tracking-[0.14em]"
                      >
                        Download
                      </a>
                    )}
                    <button
                      onClick={() => moveDesign(d)}
                      className="text-[10px] uppercase tracking-[0.14em]"
                    >
                      Move
                    </button>
                    <button
                      onClick={() => rmDesign(d)}
                      className="text-[10px] uppercase tracking-[0.14em] text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
