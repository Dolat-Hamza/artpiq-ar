'use client'
import React from 'react'

/**
 * ArtPlacer-style admin page header.
 * Use as the top of any /admin/* listing surface so the look is uniform.
 */
export default function AdminPageHeader({
  title,
  subBar,
  actions,
}: {
  title: string
  subBar?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <header className="bg-paper border-b border-line">
      <div className="px-6 md:px-10 h-16 flex items-center gap-3">
        <h1 className="font-display text-[14px] tracking-[0.18em] uppercase">{title}</h1>
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </div>
      {subBar && (
        <div className="px-6 md:px-10 h-11 border-t border-line bg-bg flex items-center gap-4 text-meta uppercase tracking-[0.12em] text-ink-muted">
          {subBar}
        </div>
      )}
    </header>
  )
}
