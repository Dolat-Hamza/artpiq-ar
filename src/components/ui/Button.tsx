'use client'
import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
  iconBefore?: React.ReactNode
  iconAfter?: React.ReactNode
}

const VARIANT: Record<Variant, string> = {
  primary:   'bg-ink text-paper hover:bg-slate-700 active:bg-slate-700',
  secondary: 'bg-paper text-ink border border-line hover:border-line-strong',
  ghost:     'bg-transparent text-ink-muted hover:text-ink hover:bg-line/30',
  danger:    'bg-paper text-red-600 border border-red-200 hover:bg-red-50',
  outline:   'bg-transparent text-ink border border-ink hover:bg-ink hover:text-paper',
}

const SIZE: Record<Size, string> = {
  sm: 'h-8 px-3 text-[11px] tracking-[0.16em]',
  md: 'h-10 px-4 text-[12px] tracking-[0.16em]',
  lg: 'h-touch px-5 text-[13px] tracking-[0.14em]',
}

const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'secondary', size = 'md', loading, fullWidth, iconBefore, iconAfter, className = '', children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 uppercase font-medium transition-colors ease-snap disabled:opacity-40 disabled:cursor-not-allowed ${VARIANT[variant]} ${SIZE[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading && <span className="spinner" />}
      {!loading && iconBefore}
      {children}
      {!loading && iconAfter}
    </button>
  )
})
export default Button
