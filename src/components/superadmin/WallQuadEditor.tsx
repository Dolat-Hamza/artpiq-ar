'use client'
import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

interface StockRoom {
  id: string
  name: string
  image_url: string
  wall_quad: number[][]
  category: string
}

// Four normalised corner points: [TL, TR, BR, BL]
const PRESETS: { id: string; label: string; quad: number[][] }[] = [
  { id: 'front-large',  label: 'Front · large',  quad: [[0.06, 0.05], [0.94, 0.05], [0.94, 0.62], [0.06, 0.62]] },
  { id: 'front-medium', label: 'Front · medium', quad: [[0.12, 0.06], [0.88, 0.06], [0.88, 0.58], [0.12, 0.58]] },
  { id: 'front-narrow', label: 'Front · narrow', quad: [[0.22, 0.08], [0.78, 0.08], [0.78, 0.55], [0.22, 0.55]] },
  { id: 'gallery-tall', label: 'Gallery · tall', quad: [[0.08, 0.03], [0.92, 0.03], [0.92, 0.75], [0.08, 0.75]] },
]

const CORNER_LABELS = ['TL', 'TR', 'BR', 'BL']

/**
 * Modal editor for the four normalised wall corners on a stock room.
 * Drag any handle to reposition; quad coords are persisted via the
 * PATCH /api/superadmin/stock-rooms endpoint.
 */
export default function WallQuadEditor({
  room,
  authedFetch,
  onClose,
  onSaved,
}: {
  room: StockRoom
  authedFetch: (url: string, init?: RequestInit) => Promise<Response>
  onClose: () => void
  onSaved: () => void
}) {
  const [quad, setQuad] = useState<number[][]>(() =>
    Array.isArray(room.wall_quad) && room.wall_quad.length === 4
      ? room.wall_quad.map(p => [Number(p[0]) || 0, Number(p[1]) || 0])
      : PRESETS[1].quad
  )
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)

  // Mouse / pointer move: translate to normalised coords inside the stage.
  useEffect(() => {
    if (dragIdx == null) return
    function move(e: PointerEvent) {
      const stage = stageRef.current
      if (!stage) return
      const rect = stage.getBoundingClientRect()
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
      setQuad(prev => prev.map((p, i) => i === dragIdx ? [x, y] : p))
    }
    function up() { setDragIdx(null) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [dragIdx])

  async function save() {
    setBusy(true)
    setErr(null)
    try {
      const res = await authedFetch('/api/superadmin/stock-rooms', {
        method: 'PATCH',
        body: JSON.stringify({ id: room.id, wall_quad: quad }),
      })
      if (!res.ok) {
        const t = await res.text()
        let msg = `${res.status}`
        try { msg = JSON.parse(t).error || msg } catch {}
        setErr(msg)
        return
      }
      onSaved()
    } finally {
      setBusy(false)
    }
  }

  // SVG polygon path string from the four normalised points.
  const points = quad.map(([x, y]) => `${(x * 100).toFixed(2)}%,${(y * 100).toFixed(2)}%`).join(' ')

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-paper rounded-md shadow-pop w-full max-w-[820px] max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <header className="px-6 h-14 flex items-center gap-3 border-b border-line">
          <h2 className="font-display text-[14px] tracking-[0.18em] uppercase">Edit wall quad</h2>
          <span className="text-meta text-ink-muted">{room.name}</span>
          <button onClick={onClose} className="ml-auto text-ink-muted hover:text-ink">
            <X size={16} />
          </button>
        </header>
        <div className="px-6 py-5 grid gap-4">
          {/* Stage: room photo + draggable corners + filled quad overlay */}
          <div
            ref={stageRef}
            className="relative w-full bg-black select-none"
            style={{ aspectRatio: '4 / 3' }}
          >
            <img
              src={room.image_url}
              alt={room.name}
              draggable={false}
              className="absolute inset-0 w-full h-full object-contain"
            />
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polygon
                points={quad.map(([x, y]) => `${x * 100},${y * 100}`).join(' ')}
                fill="rgba(180, 83, 9, 0.18)"
                stroke="#B45309"
                strokeWidth="0.3"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {quad.map(([x, y], i) => (
              <button
                key={i}
                type="button"
                onPointerDown={e => { e.preventDefault(); setDragIdx(i) }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 border-paper shadow-pop cursor-grab active:cursor-grabbing grid place-items-center text-[9px] font-bold ${
                  dragIdx === i ? 'bg-accent text-paper' : 'bg-ink text-paper hover:bg-accent'
                }`}
                style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
                title={`Corner ${CORNER_LABELS[i]}`}
              >
                {CORNER_LABELS[i]}
              </button>
            ))}
          </div>

          {/* Preset shortcuts */}
          <div className="flex gap-2 flex-wrap">
            <span className="text-meta uppercase tracking-[0.14em] text-ink-muted self-center mr-1">Reset:</span>
            {PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => setQuad(p.quad)}
                className="btn-outline !h-7 !text-[10px] !px-2"
                type="button"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Raw coord readout — useful for debugging or pasting between rooms */}
          <details className="text-meta">
            <summary className="cursor-pointer text-ink-muted">Raw coordinates</summary>
            <pre className="mt-2 p-3 bg-bg border border-line rounded-sm font-mono text-[10px] overflow-x-auto">
              {JSON.stringify(quad, null, 2)}
            </pre>
          </details>

          {err && <p className="text-meta text-red-600">{err}</p>}

          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="btn-outline" type="button">Cancel</button>
            <button onClick={save} disabled={busy} className="btn-primary disabled:opacity-40" type="button">
              {busy ? 'Saving…' : 'Save quad'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
