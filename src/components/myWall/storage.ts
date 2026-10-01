import type { WallLayer } from '@/types'

export const STORAGE_KEY = 'myWall:v2'

interface StoredState {
  layers: WallLayer[]
  nextId: number
}

export function loadStored(): StoredState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredState
  } catch { return null }
}

export function saveStored(s: StoredState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch {}
}
