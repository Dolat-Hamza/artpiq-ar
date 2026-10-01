'use client'
import { useEffect, useMemo, useState } from 'react'
import { Heart, X } from 'lucide-react'
import { StockRoom } from '@/types'

export default function RoomsModal({
  rooms,
  currentRoom,
  favorites,
  onPickRoom,
  onClose,
  onToggleFavorite,
}: {
  rooms: StockRoom[]
  currentRoom: StockRoom
  favorites: Set<string>
  onPickRoom: (r: StockRoom) => void
  onClose: () => void
  onToggleFavorite?: (roomId: string) => void
}) {
  const [tab, setTab] = useState<'suggested' | 'favorites' | 'all'>('suggested')
  const suggested = useMemo(() => {
    return rooms.filter(
      r =>
        r.id !== currentRoom.id &&
        (r.orientation === currentRoom.orientation ||
          r.perspective === currentRoom.perspective ||
          r.category === currentRoom.category),
    )
  }, [currentRoom, rooms])
  const list =
    tab === 'all' ? rooms : tab === 'favorites' ? rooms.filter(r => favorites.has(r.id)) : suggested

  // Escape close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rooms-modal-title"
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-paper rounded-md w-full max-w-[1100px] max-h-[88vh] overflow-y-auto shadow-pop"
        onClick={e => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 bg-paper border-b border-line px-6 h-14 flex items-center gap-4">
          <p id="rooms-modal-title" className="text-meta uppercase text-ink-muted">
            Room mockups
          </p>
          <div className="flex gap-1 bg-surface rounded-full p-1">
            {(['suggested', 'favorites', 'all'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`h-7 px-3 text-[11px] tracking-[0.14em] uppercase rounded-full transition-colors ease-snap ${
                  tab === t ? 'bg-ink text-paper' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {t === 'suggested' && `Suggested · ${suggested.length}`}
                {t === 'favorites' && `Favorites · ${favorites.size}`}
                {t === 'all' && `All · ${rooms.length}`}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-auto grid place-items-center w-9 h-9 text-ink-muted hover:text-ink rounded-full hover:bg-line/40"
          >
            <X size={16} />
          </button>
        </header>
        <div className="p-6">
          {!list.length && (
            <div className="py-16 text-center">
              <p className="text-[12px] text-ink-muted">
                {tab === 'favorites'
                  ? 'No favorites yet — tap the heart on any room to save it here.'
                  : 'No rooms match.'}
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {list.map(r => (
              <div key={r.id} className="relative group">
                <button
                  onClick={() => onPickRoom(r)}
                  className={`block w-full bg-paper rounded-md overflow-hidden border transition-all ease-snap hover:shadow-card hover:-translate-y-0.5 ${
                    r.id === currentRoom.id ? 'border-accent ring-2 ring-accent' : 'border-line'
                  }`}
                  title={r.name}
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-line/40">
                    <img
                      src={r.thumb}
                      alt={r.name}
                      className="w-full h-full object-cover transition-transform duration-300 ease-snap group-hover:scale-[1.04]"
                    />
                    {r.smart && (
                      <span className="absolute top-2 left-2 text-[9px] tracking-[0.16em] uppercase bg-accent text-paper px-1.5 py-0.5 rounded-xs">
                        Smart
                      </span>
                    )}
                  </div>
                  <p className="px-3 py-2 text-[12px] text-left truncate">{r.name}</p>
                </button>
                {onToggleFavorite && (
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      onToggleFavorite(r.id)
                    }}
                    aria-label={favorites.has(r.id) ? 'Unfavorite' : 'Favorite'}
                    className="absolute top-2 right-2 w-9 h-9 grid place-items-center bg-paper/90 backdrop-blur rounded-full hover:bg-paper transition-colors"
                  >
                    <Heart
                      size={14}
                      fill={favorites.has(r.id) ? '#e11d48' : 'transparent'}
                      stroke={favorites.has(r.id) ? '#e11d48' : '#475569'}
                    />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
