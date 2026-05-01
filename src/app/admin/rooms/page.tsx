'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import SiteNav from '@/components/SiteNav'
import { STOCK_ROOMS, filterRooms } from '@/lib/rooms'

const CATS = ['all', 'living', 'bedroom', 'office', 'kitchen', 'gallery', 'plain'] as const
const PERSPS = ['all', 'front', 'angled', 'corner'] as const
const ORIENTS = ['all', 'portrait', 'landscape', 'square'] as const
const SIZES = ['all', 'small', 'medium', 'large'] as const

export default function RoomsLibraryPage() {
  const [cat, setCat] = useState<(typeof CATS)[number]>('all')
  const [persp, setPersp] = useState<(typeof PERSPS)[number]>('all')
  const [orient, setOrient] = useState<(typeof ORIENTS)[number]>('all')
  const [size, setSize] = useState<(typeof SIZES)[number]>('all')
  const [smartOnly, setSmartOnly] = useState(false)

  const list = useMemo(
    () =>
      filterRooms({
        category: cat,
        perspective: persp,
        orientation: orient,
        wallSize: size,
        smart: smartOnly ? true : 'all',
      }),
    [cat, persp, orient, size, smartOnly],
  )

  return (
    <>
      <SiteNav />
      <div className="min-h-dvh bg-paper text-ink">
        <header className="border-b border-line">
          <div className="max-w-content mx-auto px-6 md:px-12 py-5 flex items-center gap-4 flex-wrap">
            <div className="flex-1">
              <p className="text-[11px] tracking-[0.22em] uppercase text-ink-muted">Library</p>
              <h1 className="font-display text-[22px] tracking-tight">Room mockups ({list.length} of {STOCK_ROOMS.length})</h1>
            </div>
            <Link
              href="/sample-room"
              className="px-3 py-2 text-[11px] tracking-[0.18em] uppercase border border-line"
            >
              Open composer
            </Link>
          </div>
          <div className="max-w-content mx-auto px-6 md:px-12 pb-4 flex items-center gap-3 flex-wrap text-[12px]">
            <FilterSelect label="Category" value={cat} onChange={setCat} options={CATS} />
            <FilterSelect label="Perspective" value={persp} onChange={setPersp} options={PERSPS} />
            <FilterSelect label="Orientation" value={orient} onChange={setOrient} options={ORIENTS} />
            <FilterSelect label="Wall size" value={size} onChange={setSize} options={SIZES} />
            <label className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.16em] uppercase text-ink-muted">
              <input
                type="checkbox"
                checked={smartOnly}
                onChange={e => setSmartOnly(e.target.checked)}
              />
              Smart spaces only
            </label>
            {(cat !== 'all' || persp !== 'all' || orient !== 'all' || size !== 'all' || smartOnly) && (
              <button
                onClick={() => {
                  setCat('all')
                  setPersp('all')
                  setOrient('all')
                  setSize('all')
                  setSmartOnly(false)
                }}
                className="text-[11px] tracking-[0.14em] uppercase text-ink-muted underline ml-auto"
              >
                Clear filters
              </button>
            )}
          </div>
        </header>
        <main className="max-w-content mx-auto px-6 md:px-12 py-8">
          {!list.length && (
            <p className="text-[13px] text-ink-muted text-center py-12">
              No rooms match the filters.
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {list.map(r => (
              <Link
                key={r.id}
                href={`/sample-room?room=${r.id}`}
                className="block border border-line hover:border-ink"
              >
                <div className="relative">
                  <img src={r.thumb} alt={r.name} className="w-full aspect-[4/3] object-cover" />
                  {r.smart && (
                    <span className="absolute top-2 left-2 bg-emerald-600 text-paper text-[9px] px-1.5 py-0.5 tracking-[0.18em] uppercase">
                      Smart
                    </span>
                  )}
                </div>
                <div className="p-2 text-[12px]">
                  <p className="font-display truncate">{r.name}</p>
                  <p className="text-[10px] tracking-[0.12em] uppercase text-ink-muted mt-0.5">
                    {r.category} · {r.perspective || 'front'} · {r.wallSize || 'medium'} · {r.wallWidthCm}cm
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </>
  )
}

function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: readonly T[]
}) {
  return (
    <label className="inline-flex items-center gap-1.5">
      <span className="text-[10px] tracking-[0.16em] uppercase text-ink-muted">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value as T)}
        className="border border-line bg-paper px-2 h-8 text-[12px]"
      >
        {options.map(o => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}
