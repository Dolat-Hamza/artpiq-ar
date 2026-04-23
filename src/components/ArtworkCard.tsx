'use client'
import { useState } from 'react'
import { useStore } from '@/store'
import { Artwork } from '@/types'

export default function ArtworkCard({ aw }: { aw: Artwork }) {
  const { isSelectMode, selectedIds, toggleSelect, openDetail } = useStore()
  const [loaded, setLoaded] = useState(false)
  const selected = selectedIds.has(aw.id)

  function handleClick() {
    if (isSelectMode && aw.type === 'painting') toggleSelect(aw.id)
    else openDetail(aw)
  }

  const disabled = isSelectMode && aw.type === 'sculpture'

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`group text-left block w-full focus:outline-none focus-visible:ring-1 focus-visible:ring-accent transition-opacity ${
        disabled ? 'opacity-30' : ''
      }`}
    >
      <div className="relative aspect-[3/4] bg-surface overflow-hidden">
        {aw.thumb ? (
          <>
            {!loaded && <div className="absolute inset-0 skel-shimmer" />}
            <img
              src={aw.thumb}
              alt={aw.title}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              onLoad={() => setLoaded(true)}
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ease-out ${
                loaded ? 'opacity-100' : 'opacity-0'
              } group-hover:scale-[1.02]`}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
            <span className="font-display text-[40px] text-ink-muted">
              {aw.type === 'sculpture' ? 'III' : 'II'}
            </span>
          </div>
        )}

        {isSelectMode && aw.type === 'painting' && (
          <div
            className={`absolute top-3 left-3 w-6 h-6 border flex items-center justify-center text-[11px] ${
              selected
                ? 'bg-accent border-accent text-paper'
                : 'bg-paper/80 border-ink/40 text-transparent'
            }`}
          >
            {selected ? '✓' : ''}
          </div>
        )}
      </div>

      <div className="pt-4">
        <h3 className="font-display text-[20px] leading-tight text-ink">{aw.title}</h3>
        <p className="mt-1 text-[11px] tracking-[0.12em] uppercase text-ink-muted">
          {aw.artist} — {aw.year}
        </p>
      </div>
    </button>
  )
}
