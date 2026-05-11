'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const GO_TARGETS: Record<string, string> = {
  d: '/admin',
  a: '/admin/artworks',
  p: '/admin/presentations',
  c: '/admin/contacts',
  s: '/admin/social',
  b: '/admin/blog',
  r: '/admin/rooms',
  o: '/admin/organizations',
  t: '/admin/tasks',
}

/**
 * Global "go to" keyboard shortcuts: press `g` then another letter.
 * Pattern adopted from Gmail / Linear / GitHub.
 */
export default function GlobalKeyboardNav() {
  const router = useRouter()
  const pending = useRef<{ until: number } | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isTyping(e)) return

      // First key of pair
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        pending.current = { until: Date.now() + 1500 }
        return
      }

      // Second key
      if (pending.current && Date.now() < pending.current.until) {
        const target = GO_TARGETS[e.key.toLowerCase()]
        pending.current = null
        if (target) {
          e.preventDefault()
          router.push(target)
        }
      }
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [router])

  return null
}

function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null
  if (!t) return false
  const tag = t.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (t.isContentEditable) return true
  return false
}
