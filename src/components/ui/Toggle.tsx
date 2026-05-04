'use client'

interface Props {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
  disabled?: boolean
}

export default function Toggle({ checked, onChange, label, disabled }: Props) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2 ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <span
        className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ease-snap ${
          checked ? 'bg-accent' : 'bg-line-strong'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-paper shadow-sm transition-transform ease-snap ${
            checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
          }`}
        />
      </span>
      {label && (
        <span className="text-[11px] tracking-[0.16em] uppercase text-ink-muted">
          {label}
        </span>
      )}
    </button>
  )
}
