'use client'
import Link from 'next/link'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: { label: string; onClick?: () => void; href?: string }
  secondaryAction?: { label: string; onClick?: () => void; href?: string }
  className?: string
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={`py-16 text-center ${className ?? ''}`}>
      {icon && (
        <div className="inline-flex w-16 h-16 rounded-full bg-bg items-center justify-center text-ink-muted/60 mb-4">
          {icon}
        </div>
      )}
      <p className="font-display text-h3">{title}</p>
      {description && (
        <p className="text-body text-ink-muted mt-2 max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-6 inline-flex items-center gap-2">
          {action && (
            action.href ? (
              <Link href={action.href} className="btn-primary">{action.label}</Link>
            ) : (
              <button onClick={action.onClick} className="btn-primary">{action.label}</button>
            )
          )}
          {secondaryAction && (
            secondaryAction.href ? (
              <Link href={secondaryAction.href} className="btn-outline">{secondaryAction.label}</Link>
            ) : (
              <button onClick={secondaryAction.onClick} className="btn-outline">{secondaryAction.label}</button>
            )
          )}
        </div>
      )}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={`skel-shimmer rounded-sm ${className ?? ''}`} />
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="bg-paper border border-line rounded-md overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-line/60 last:border-b-0">
          <Skeleton className="w-9 h-9" />
          <div className="flex-1 min-w-0 grid gap-1.5">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-2.5 w-1/4" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  )
}

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <Skeleton className="aspect-[4/5]" />
          <Skeleton className="h-3 w-3/4 mt-2 mx-auto" />
          <Skeleton className="h-2.5 w-1/2 mt-1.5 mx-auto" />
        </div>
      ))}
    </div>
  )
}
