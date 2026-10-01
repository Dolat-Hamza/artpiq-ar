'use client'
import { useMemo, useState } from 'react'
import { Artwork } from '@/types'

export default function ThumbStrip({
  artworks,
  placedCount,
  onAdd,
}: {
  artworks: Artwork[]
  placedCount: number
  onAdd: (a: Artwork) => void
}) {
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return artworks.slice(0, 200)
    return artworks
      .filter(a =>
        [a.title, a.artist, a.medium, a.collection]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 2000)
  }, [artworks, q])

  return (
    <div className="border-t border-line pt-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-[11px] tracking-[0.18em] uppercase text-ink-muted">
          Click to add — {filtered.length} of {artworks.length} · {placedCount} on wall
        </p>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search title / artist…"
          className="border border-line px-2 py-1 text-[12px] w-48"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {filtered.map(a => (
          <button
            key={a.id}
            onClick={() => onAdd(a)}
            title={`${a.title}${a.artist ? ' — ' + a.artist : ''}`}
            className="shrink-0 w-20 h-20 border border-line bg-paper hover:border-ink overflow-hidden relative"
          >
            {a.thumb || a.image ? (
              <img
                src={a.thumb || a.image || ''}
                alt={a.title}
                loading="lazy"
                className="w-full h-full object-cover"
                onError={e => {
                  const t = e.currentTarget
                  t.style.display = 'none'
                  const parent = t.parentElement
                  if (parent && !parent.querySelector('.fb')) {
                    const span = document.createElement('span')
                    span.className = 'fb absolute inset-0 grid place-items-center text-[9px] text-ink-muted px-1 text-center'
                    span.textContent = a.title.slice(0, 20)
                    parent.appendChild(span)
                  }
                }}
              />
            ) : (
              <span className="text-[10px] text-ink-muted">{a.title}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
