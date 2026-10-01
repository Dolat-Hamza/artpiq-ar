'use client'
import { useEffect, useRef } from 'react'
import { Copy, ArrowUp, Trash2 } from 'lucide-react'
import { useGesture } from '@use-gesture/react'
import type { Artwork, WallLayer } from '@/types'
import IconBtn from './IconBtn'

export default function LayerNode({
  layer, artwork, active, onSelect, onChange, onRemove, onDuplicate, onBringToFront, pxPerCm,
}: {
  layer: WallLayer
  artwork: Artwork
  active: boolean
  onSelect: () => void
  onChange: (p: Partial<WallLayer>) => void
  onRemove: () => void
  onDuplicate: () => void
  onBringToFront: () => void
  pxPerCm: number | null
}) {
  const ref = useRef<HTMLDivElement>(null)
  const localRef = useRef({ x: layer.x, y: layer.y, scale: layer.scale, rotation: layer.rotation })
  useEffect(() => { localRef.current = { x: layer.x, y: layer.y, scale: layer.scale, rotation: layer.rotation } },
    [layer.x, layer.y, layer.scale, layer.rotation])

  useGesture(
    {
      onDragStart: () => onSelect(),
      onDrag: ({ offset: [ox, oy] }) => {
        onChange({ x: ox, y: oy })
      },
      onPinch: ({ offset: [s, a], first }) => {
        if (first) onSelect()
        onChange({ scale: Math.max(0.2, Math.min(4, s)), rotation: a })
      },
    },
    {
      target: ref,
      drag: { from: () => [localRef.current.x, localRef.current.y], filterTaps: true },
      pinch: { from: () => [localRef.current.scale, localRef.current.rotation], scaleBounds: { min: 0.2, max: 4 } },
    }
  )

  const aspect = (artwork.heightCm || 60) / (artwork.widthCm || 80)
  // True scale: artwork.widthCm * px-per-cm. Falls back to fluid 35vw cap if unknown.
  const baseW: string =
    pxPerCm && artwork.widthCm > 0
      ? `${Math.round(artwork.widthCm * pxPerCm)}px`
      : 'min(35vw, 260px)'

  return (
    <div
      ref={ref}
      onPointerDown={onSelect}
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: baseW,
        transform: `translate(-50%, -50%) translate(${layer.x}px, ${layer.y}px) scale(${layer.scale}) rotate(${layer.rotation}deg)`,
        transformOrigin: 'center',
        touchAction: 'none',
        cursor: 'grab',
      }}
      className="select-none"
    >
      <div
        className={`relative bg-paper border border-line p-[3%] shadow-[0_8px_24px_rgba(15,23,42,0.12)] ${
          active ? 'ring-1 ring-accent ring-offset-0' : ''
        }`}
      >
        <img
          src={artwork.image || artwork.thumb || ''}
          alt={artwork.title}
          referrerPolicy="no-referrer-when-downgrade"
          draggable={false}
          className="block w-full pointer-events-none"
          style={{ aspectRatio: `${1 / aspect}` }}
        />
      </div>

      {active && (
        <div
          className="absolute left-1/2 -translate-x-1/2 -top-12 flex items-center gap-1 bg-paper border border-line px-1 py-1 shadow-sm"
          style={{ transform: `translateX(-50%) scale(${1 / layer.scale}) rotate(${-layer.rotation}deg)`, transformOrigin: 'center bottom' }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <IconBtn onClick={onDuplicate} label="Duplicate"><Copy size={13} /></IconBtn>
          <IconBtn onClick={onBringToFront} label="Bring forward"><ArrowUp size={13} /></IconBtn>
          <IconBtn onClick={onRemove} label="Remove"><Trash2 size={13} /></IconBtn>
        </div>
      )}
    </div>
  )
}
