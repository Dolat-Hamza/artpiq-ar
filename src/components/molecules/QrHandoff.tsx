import QrCanvas from '@/components/atoms/QrCanvas'

interface Props {
  url: string
  title: string
}

export default function QrHandoff({ url, title }: Props) {
  return (
    <div className="border border-line p-6 flex items-start gap-5">
      <QrCanvas value={url} size={160} className="shrink-0" />
      <div>
        <p className="text-[11px] tracking-[0.12em] uppercase text-ink-muted">Scan to view in AR</p>
        <h3 className="font-display text-[20px] mt-2 leading-snug">Open this on your phone</h3>
        <p className="text-[12px] text-ink-muted mt-2 leading-relaxed">
          Scan with your phone camera to place {title} on a real wall at true scale.
        </p>
      </div>
    </div>
  )
}
