'use client'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  size?: 'sm' | 'md'
}

const Chip = forwardRef<HTMLButtonElement, Props>(function Chip(
  { active, size = 'md', className = '', children, ...rest },
  ref,
) {
  const h = size === 'sm' ? 'h-7 px-2.5 text-[10px]' : 'h-8 px-3 text-[11px]'
  return (
    <button
      ref={ref}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border tracking-[0.16em] uppercase font-medium transition-colors ease-snap ${h} ${
        active
          ? 'bg-ink text-paper border-ink'
          : 'bg-paper text-ink-muted border-line hover:border-ink hover:text-ink'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
})
export default Chip
