'use client'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'ghost' | 'outline' | 'solid'
}

const SIZE = {
  sm: 'w-8 h-8',
  md: 'w-touch h-touch',
  lg: 'w-12 h-12',
}

const VAR = {
  ghost:   'text-ink-muted hover:text-ink hover:bg-line/30',
  outline: 'border border-line text-ink hover:border-ink',
  solid:   'bg-ink text-paper hover:bg-slate-700',
}

const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
  { label, size = 'md', variant = 'ghost', className = '', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={`grid place-items-center transition-colors ease-snap ${SIZE[size]} ${VAR[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
})
export default IconButton
