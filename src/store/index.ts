import { create } from 'zustand'
import { Artwork, WallLayer } from '@/types'

interface ToastState {
  msg: string
  visible: boolean
  _timer?: ReturnType<typeof setTimeout>
}

interface AppStore {
  // ── Catalogue ──────────────────────────────────────────────────────────────
  artworks: Artwork[]
  setArtworks: (artworks: Artwork[]) => void
  activeFilter: string
  setFilter: (f: string) => void

  // ── Current artwork ────────────────────────────────────────────────────────
  current: Artwork | null
  setCurrent: (aw: Artwork | null) => void

  // ── Detail sheet ───────────────────────────────────────────────────────────
  detailOpen: boolean
  openDetail: (aw: Artwork) => void
  closeDetail: () => void

  // ── AR viewer ──────────────────────────────────────────────────────────────
  arOpen: boolean
  openAR: (aw: Artwork) => void
  closeAR: () => void

  // ── My Wall ────────────────────────────────────────────────────────────────
  myWallOpen: boolean
  myWallInitArtwork: Artwork | null
  openMyWall: (aw: Artwork) => void
  closeMyWall: () => void

  // ── Gallery multi-select ───────────────────────────────────────────────────
  selectedIds: Set<string>
  isSelectMode: boolean
  enterSelectMode: () => void
  exitSelectMode: () => void
  toggleSelect: (id: string) => void

  // ── WebXR multi-artwork AR ─────────────────────────────────────────────────
  xrOpen: boolean
  xrArtworks: Artwork[]
  openXR: (artworks: Artwork[]) => void
  closeXR: () => void

  // ── Gallery AR (model-viewer combined GLB, iOS fallback) ───────────────────
  galleryArOpen: boolean
  galleryArArtworks: Artwork[]
  openGalleryAR: (artworks: Artwork[]) => void
  closeGalleryAR: () => void

  // ── QR overlay ─────────────────────────────────────────────────────────────
  qrOpen: boolean
  openQR: () => void
  closeQR: () => void

  // ── Toast ──────────────────────────────────────────────────────────────────
  toast: ToastState
  showToast: (msg: string, ms?: number) => void
}

export const useStore = create<AppStore>((set, get) => ({
  // Catalogue
  artworks: [],
  setArtworks: (artworks) => set({ artworks }),
  activeFilter: 'all',
  setFilter: (f) => set({ activeFilter: f }),

  // Current
  current: null,
  setCurrent: (aw) => set({ current: aw }),

  // Detail sheet
  detailOpen: false,
  openDetail: (aw) => set({ current: aw, detailOpen: true }),
  closeDetail: () => set({ detailOpen: false }),

  // AR
  arOpen: false,
  openAR: (aw) => set({ current: aw, arOpen: true, detailOpen: false }),
  closeAR: () => set({ arOpen: false }),

  // My Wall
  myWallOpen: false,
  myWallInitArtwork: null,
  openMyWall: (aw) => set({ myWallInitArtwork: aw, myWallOpen: true, detailOpen: false }),
  closeMyWall: () => set({ myWallOpen: false, myWallInitArtwork: null }),

  // Gallery select
  selectedIds: new Set(),
  isSelectMode: false,
  enterSelectMode: () => set({ isSelectMode: true }),
  exitSelectMode: () => set({ isSelectMode: false, selectedIds: new Set() }),
  toggleSelect: (id) => {
    const { selectedIds } = get()
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else {
      if (next.size >= 4) { get().showToast('Max 4 paintings'); return }
      next.add(id)
    }
    set({ selectedIds: next })
  },

  // WebXR
  xrOpen: false,
  xrArtworks: [],
  openXR: (artworks) => set({ xrOpen: true, xrArtworks: artworks, detailOpen: false }),
  closeXR: () => set({ xrOpen: false, xrArtworks: [] }),

  // Gallery AR (iOS / WebXR-unsupported fallback)
  galleryArOpen: false,
  galleryArArtworks: [],
  openGalleryAR: (artworks) => set({ galleryArOpen: true, galleryArArtworks: artworks, detailOpen: false }),
  closeGalleryAR: () => set({ galleryArOpen: false, galleryArArtworks: [] }),

  // QR
  qrOpen: false,
  openQR: () => set({ qrOpen: true }),
  closeQR: () => set({ qrOpen: false }),

  // Toast
  toast: { msg: '', visible: false },
  showToast: (msg, ms = 2500) => {
    const t = get().toast
    if (t._timer) clearTimeout(t._timer)
    const timer = setTimeout(() => set(s => ({ toast: { ...s.toast, visible: false } })), ms)
    set({ toast: { msg, visible: true, _timer: timer } })
  },
}))
