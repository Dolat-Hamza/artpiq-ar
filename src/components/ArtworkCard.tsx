'use client'
import { useState } from 'react'
import { Info } from 'lucide-react'
import { useStore } from '@/store'
import { Artwork } from '@/types'

export default function ArtworkCard({ aw }: { aw: Artwork }) {
  const { isSelectMode, selectedIds, toggleSelect, openDetail } = useStore()
  const [imgLoaded, setImgLoaded] = useState(false)
  const selected = selectedIds.has(aw.id)

  const sizeLabel = aw.type === 'sculpture' ? `${aw.heightCm} cm tall` : `${aw.widthCm} × ${aw.heightCm} cm`

  function handleCardClick() {
    if (isSelectMode && aw.type === 'painting') toggleSelect(aw.id)
    else openDetail(aw)
  }

  return (
    <div
      className={`relative ${isSelectMode && aw.type === 'sculpture' ? 'opacity-35 pointer-events-none' : ''}`}
    >
      {/* Select checkbox */}
      {isSelectMode && (
        <div
          className={`absolute top-1.5 left-1.5 z-10 w-5.5 h-5.5 rounded-full flex items-center justify-center text-xs border-2 transition-all pointer-events-none ${
            selected
              ? 'bg-[--accent] border-[--accent] text-black'
              : 'bg-[rgba(0,0,0,.55)] border-[rgba(255,255,255,.5)] text-transparent'
          }`}
          style={{ width: 22, height: 22 }}
        >
          {selected ? '✓' : ''}
        </div>
      )}

      <div
        onClick={handleCardClick}
        className={`bg-[--s1] border rounded-xl overflow-hidden cursor-pointer transition-all select-none
          hover:-translate-y-0.5 active:scale-[.97]
          ${selected ? 'border-[--accent] shadow-[0_0_0_2px_var(--accent)]' : 'border-[--border] hover:border-[--accent]'}`}
      >
        {aw.thumb ? (
          <div className="relative w-full aspect-[4/3] bg-[#111]">
            {!imgLoaded && <div className="absolute inset-0 skel-shimmer" />}
            <img
              src={aw.thumb}
              alt={aw.title}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              decoding="async"
              onLoad={() => setImgLoaded(true)}
              className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          </div>
        ) : (
          <div className="w-full aspect-[4/3] flex flex-col items-center justify-center gap-1.5 text-4xl bg-gradient-to-br from-[#18140e] via-[#221e14] to-[#1a1a18]">
            {aw.id === 'bronze-helix' ? '🗿' : '💎'}
            <span className="text-[10px] text-[--accent] tracking-widest uppercase">{aw.medium}</span>
          </div>
        )}

        <div className="px-3 pt-2.5 pb-3">
          <div className="text-[13px] font-bold mb-0.5 leading-snug">{aw.title}</div>
          <div className="text-[11px] text-[--muted] mb-2">{aw.artist} · {aw.year}</div>
          <div className="flex gap-1.5 flex-wrap">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
              aw.type === 'sculpture'
                ? 'bg-[rgba(110,200,130,.1)] text-[#6ec882] border-[rgba(110,200,130,.2)]'
                : 'bg-[rgba(200,169,110,.08)] text-[--accent] border-[rgba(200,169,110,.16)]'
            }`}>
              {aw.type === 'sculpture' ? '3D Sculpture' : 'Painting'}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(200,169,110,.08)] text-[--accent] border border-[rgba(200,169,110,.16)]">
              {sizeLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Info button */}
      <button
        onClick={(e) => { e.stopPropagation(); openDetail(aw) }}
        className="absolute top-1.5 right-1.5 z-10 w-6.5 h-6.5 rounded-full bg-[rgba(0,0,0,.55)] backdrop-blur-sm border-none text-white opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs cursor-pointer transition-opacity hover:opacity-100 focus:opacity-100"
        style={{ width: 26, height: 26 }}
        title="Details"
      >
        <Info size={12} />
      </button>
    </div>
  )
}
