export function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="text-[11px] tracking-[0.20em] uppercase text-ink-muted mb-2">{label}</p>
      {children}
    </section>
  )
}

export function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  disabled,
}: {
  label: string
  min: number
  max: number
  step?: number
  value: number
  onChange: (n: number) => void
  disabled?: boolean
}) {
  return (
    <label className={`block mt-2 ${disabled ? 'opacity-40' : ''}`}>
      <span className="block text-[11px] tracking-[0.14em] uppercase text-ink-muted mb-1">
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step ?? 1}
        value={value}
        disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
  )
}
