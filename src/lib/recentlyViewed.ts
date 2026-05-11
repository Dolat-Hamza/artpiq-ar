// Lightweight per-user "recently viewed" tracker, stored in localStorage.
// Items can be artworks, contacts, deals, designs, etc. Keep it tiny.

export type RecentKind = 'artwork' | 'contact' | 'deal' | 'design' | 'presentation' | 'social' | 'blog'

export interface RecentItem {
  id: string
  kind: RecentKind
  label: string
  sublabel?: string
  href: string
  thumbUrl?: string | null
  viewedAt: number
}

const KEY = 'artpiq:recent:v1'
const LIMIT = 12

function read(): RecentItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw) as RecentItem[]
  } catch {
    return []
  }
}

function write(items: RecentItem[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch {
    // quota exceeded — drop oldest half
    try {
      localStorage.setItem(KEY, JSON.stringify(items.slice(0, Math.floor(items.length / 2))))
    } catch {}
  }
}

export function trackView(item: Omit<RecentItem, 'viewedAt'>): void {
  const list = read().filter(i => !(i.kind === item.kind && i.id === item.id))
  list.unshift({ ...item, viewedAt: Date.now() })
  write(list.slice(0, LIMIT))
}

export function getRecent(kind?: RecentKind): RecentItem[] {
  const list = read()
  return kind ? list.filter(i => i.kind === kind) : list
}

export function clearRecent(): void {
  write([])
}
