import type { Artwork } from '@/types'

interface Props {
  artwork: Artwork
  headingLevel?: 1 | 2
  eyebrow?: string
}

export default function ArtworkMeta({ artwork: aw, headingLevel = 2, eyebrow }: Props) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2'
  const size = aw.type === 'painting'
    ? `${aw.widthCm} × ${aw.heightCm} cm`
    : `${aw.heightCm} cm tall`

  return (
    <div>
      {eyebrow && (
        <p className="text-[10px] tracking-[0.18em] uppercase text-ink-muted mb-3">{eyebrow}</p>
      )}
      <Heading className="font-display text-[34px] md:text-[40px] leading-tight tracking-tight text-ink">
        {aw.title}
      </Heading>
      <p className="text-[14px] text-ink-muted mt-1">
        {aw.artist}{aw.year ? ` · ${aw.year}` : ''}
      </p>
      <dl className="mt-6 grid grid-cols-2 gap-y-3 text-[13px] border-t border-line pt-5">
        <dt className="text-[11px] tracking-[0.12em] uppercase text-ink-muted">Medium</dt>
        <dd className="text-ink">{aw.medium}</dd>
        <dt className="text-[11px] tracking-[0.12em] uppercase text-ink-muted">Size</dt>
        <dd className="text-ink">{size}</dd>
      </dl>
    </div>
  )
}
