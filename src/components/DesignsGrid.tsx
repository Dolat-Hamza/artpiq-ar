'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trash2, FolderPlus, Folder, MoreHorizontal, Plus, Download, FolderInput, ChevronDown } from 'lucide-react'
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
    <div className="min-h-dvh bg-bg text-ink">
      {/* ArtPlacer header */}
      <header className="bg-paper border-b border-line">
        <div className="px-6 md:px-10 h-16 flex items-center gap-3">
          <h1 className="font-display text-[14px] tracking-[0.18em] uppercase">My Designs</h1>
          <Link href="/sample-room" className="ml-auto btn-primary">
            <Plus size={14} strokeWidth={2.5} /> Create
          </Link>
        </div>
        {/* Sub bar */}
        <div className="px-6 md:px-10 h-11 border-t border-line bg-bg flex items-center gap-4 text-meta uppercase tracking-[0.12em] text-ink-muted">
          <span>
            Showing <span className="text-ink font-bold">{designs.length}</span>
          </span>
          <span className="text-ink-muted">·</span>
          <span>{folders.length} folder(s)</span>
          <button
            onClick={newFolder}
            className="ml-auto inline-flex items-center gap-1.5 text-meta uppercase tracking-[0.12em] text-ink-muted hover:text-ink"
          >
            <FolderPlus size={12} /> New folder
          </button>
        </div>
      </header>

      <main className="px-6 md:px-10 py-6 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        {/* Folders sidebar */}
        <aside className="text-body lg:sticky lg:top-[124px] lg:self-start">
          <p className="text-meta uppercase tracking-[0.14em] text-ink-muted font-bold py-3 border-b border-line">
            Folders
          </p>
          <ul className="py-2">
            <FolderRow
              active={activeFolder === 'all'}
              onClick={() => setActiveFolder('all')}
              label="All designs"
            />
            <FolderRow
              active={activeFolder === 'unfiled'}
              onClick={() => setActiveFolder('unfiled')}
              label="Unfiled"
            />
            {folders.map(f => (
              <li key={f.id} className="flex items-center group">
                <button
                  onClick={() => setActiveFolder(f.id)}
                  data-active={activeFolder === f.id}
                  className="ap-nav flex-1 !px-2"
                >
                  <Folder size={13} strokeWidth={1.6} />
                  <span className="truncate">{f.name}</span>
                </button>
                <button
                  onClick={() => renameFolderPrompt(f)}
                  className="opacity-0 group-hover:opacity-100 px-1.5 text-[10px] uppercase tracking-[0.12em] text-ink-muted hover:text-ink"
                  title="Rename"
                >
                  Edit
                </button>
                <button
                  onClick={() => rmFolder(f)}
                  className="opacity-0 group-hover:opacity-100 px-1.5 text-red-600"
                  title="Delete folder"
                >
                  <Trash2 size={12} />
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Designs grid */}
        <section>
          {!designs.length && !busy && (
            <div className="py-20 text-center">
              <p className="text-body text-ink-muted">No designs here yet.</p>
              <Link href="/sample-room" className="btn-primary mt-4 inline-flex">
                <Plus size={14} strokeWidth={2.5} /> Create your first design
              </Link>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
            {designs.map(d => (
              <DesignCard
                key={d.id}
                d={d}
                onMove={() => moveDesign(d)}
                onDelete={() => rmDesign(d)}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

function FolderRow({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <li>
      <button onClick={onClick} data-active={active} className="ap-nav w-full !px-2">
        <span className="truncate">{label}</span>
      </button>
    </li>
  )
}

function DesignCard({
  d,
  onMove,
  onDelete,
}: {
  d: SavedDesign
  onMove: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <article className="group">
      <div className="aspect-[4/3] bg-paper border border-line/60 overflow-hidden relative">
        <Link href={`/sample-room?design=${d.id}`} className="block w-full h-full" title="Open in composer">
          {d.thumbUrl ? (
            <img
              src={d.thumbUrl}
              alt={d.name}
              className="w-full h-full object-cover transition-transform duration-300 ease-snap group-hover:scale-[1.02]"
            />
          ) : (
            <span className="grid place-items-center w-full h-full text-meta uppercase text-ink-muted">
              no thumbnail
            </span>
          )}
        </Link>
        {/* SMART teal badge — placeholder for the AR-ready signal */}
        <span className="absolute top-2 left-2 text-[9px] tracking-[0.16em] uppercase font-bold text-paper bg-accent-2 px-1.5 py-0.5 rounded-xs">
          Smart
        </span>
        {/* Overflow menu */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setOpen(o => !o)}
            aria-label="More"
            className="w-8 h-8 grid place-items-center bg-paper/90 backdrop-blur rounded-sm text-ink hover:bg-paper"
          >
            <MoreHorizontal size={14} />
          </button>
          {open && (
            <div
              onMouseLeave={() => setOpen(false)}
              className="absolute right-0 mt-1 w-44 bg-paper border border-line shadow-pop rounded-sm py-1 text-[12px] z-10"
            >
              <Link
                href={`/sample-room?design=${d.id}`}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-line/60"
              >
                <ChevronDown size={12} className="-rotate-90" /> Open
              </Link>
              {d.thumbUrl && (
                <a
                  href={d.thumbUrl}
                  download={`${d.name}.jpg`}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-line/60"
                >
                  <Download size={12} /> Download
                </a>
              )}
              <button
                onClick={() => { setOpen(false); onMove() }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-line/60 text-left"
              >
                <FolderInput size={12} /> Move to folder
              </button>
              <button
                onClick={() => { setOpen(false); onDelete() }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-line/60 text-left text-red-600"
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="text-center mt-3 text-[13px]">
        <p className="font-bold truncate">{d.name}</p>
        <p className="text-ink-muted text-[12px] mt-0.5">{d.roomId || 'Room Mockup'}</p>
      </div>
    </article>
  )
}
