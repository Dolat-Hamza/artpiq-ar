'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Library } from 'lucide-react'
import Chip from '@/components/ui/Chip'
import Toggle from '@/components/ui/Toggle'
import Button from '@/components/ui/Button'
import { STOCK_ROOMS, filterRooms } from '@/lib/rooms'
import AdminPageHeader from '@/components/ui/AdminPageHeader'

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

  const hasFilters = cat !== 'all' || persp !== 'all' || orient !== 'all' || size !== 'all' || smartOnly

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <AdminPageHeader
        title="Room Mockups"
        actions={
          <Link href="/sample-room">
            <Button variant="primary" size="md">
              Open composer
            </Button>
          </Link>
        }
        subBar={
          <>
            <span>
              Showing <span className="text-ink font-bold">{list.length}</span> of {STOCK_ROOMS.length}
            </span>
            {hasFilters && (
              <button
                onClick={() => {
                  setCat('all')
                  setPersp('all')
                  setOrient('all')
                  setSize('all')
                  setSmartOnly(false)
                }}
                className="ml-auto text-meta uppercase tracking-[0.14em] text-ink-muted underline hover:text-ink"
              >
                Clear filters
              </button>
            )}
          </>
        }
      />

      <div className="bg-paper border-b border-line">
        <div className="px-6 md:px-10 py-4 space-y-3 max-w-content mx-auto">
          <FilterRow label="Category" options={CATS} value={cat} onChange={setCat} />
          <FilterRow label="Perspective" options={PERSPS} value={persp} onChange={setPersp} />
          <FilterRow label="Orientation" options={ORIENTS} value={orient} onChange={setOrient} />
          <FilterRow label="Wall size" options={SIZES} value={size} onChange={setSize} />
          <div className="flex items-center gap-4 pt-1">
            <Toggle checked={smartOnly} onChange={setSmartOnly} label="Smart spaces only" />
          </div>
        </div>
      </div>
      <main className="px-6 md:px-10 py-6 max-w-content mx-auto">
        {!list.length && (
          <div className="py-20 text-center">
            <Library className="mx-auto text-ink-muted" size={32} />
            <p className="mt-4 text-body text-ink-muted">No rooms match the filters.</p>
            <button
              onClick={() => {
                setCat('all')
                setPersp('all')
                setOrient('all')
                setSize('all')
                setSmartOnly(false)
              }}
              className="mt-3 text-meta uppercase text-accent underline"
            >
              Reset filters
            </button>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {list.map(r => (
            <Link
              key={r.id}
              href={`/sample-room?room=${r.id}`}
              className="group block bg-paper border border-line rounded-md overflow-hidden hover:shadow-card hover:-translate-y-0.5 transition-all ease-snap"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-line/40">
                <img
                  src={r.thumb}
                  alt={r.name}
                  className="w-full h-full object-cover transition-transform duration-300 ease-snap group-hover:scale-[1.04]"
                />
                {r.smart && (
                  <span className="absolute top-2 left-2 bg-accent-2 text-paper text-[9px] font-bold px-1.5 py-0.5 tracking-[0.16em] uppercase rounded-xs">
                    Smart
                  </span>
                )}
              </div>
              <div className="p-3 text-body">
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
  )
}

function FilterRow<T extends string>({
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
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] tracking-[0.18em] uppercase text-ink-muted w-20 shrink-0">
        {label}
      </span>
      <div className="flex gap-1.5 flex-wrap">
        {options.map(o => (
          <Chip key={o} active={value === o} onClick={() => onChange(o)} size="sm">
            {o}
          </Chip>
        ))}
      </div>
    </div>
  )
}
