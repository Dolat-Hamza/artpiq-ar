import { create } from 'zustand'
import { Artwork } from '@/types'

interface ToastState {
  msg: string
  visible: boolean
  _timer?: ReturnType<typeof setTimeout>
}

interface AppStore {
  artworks: Artwork[]
  setArtworks: (artworks: Artwork[]) => void
  activeFilter: string
  setFilter: (f: string) => void

  current: Artwork | null
  setCurrent: (aw: Artwork | null) => void

  detailOpen: boolean
  openDetail: (aw: Artwork) => void
  closeDetail: () => void

  arOpen: boolean
  openAR: (aw: Artwork) => void
  closeAR: () => void

  myWallOpen: boolean
  myWallArtworkIds: string[]
  openMyWall: (ids: string[]) => void
  closeMyWall: () => void

  galleryArOpen: boolean
  galleryArIds: string[]
  openGalleryAR: (ids: string[]) => void
  closeGalleryAR: () => void

  selectedIds: Set<string>
  isSelectMode: boolean
  enterSelectMode: () => void
  exitSelectMode: () => void
  toggleSelect: (id: string) => void

  qrOpen: boolean
  openQR: () => void
  closeQR: () => void

  toast: ToastState
  showToast: (msg: string, ms?: number) => void
}

export const useStore = create<AppStore>((set, get) => ({
  artworks: [],
  setArtworks: (artworks) => set({ artworks }),
  activeFilter: 'all',
  setFilter: (f) => set({ activeFilter: f }),

  current: null,
  setCurrent: (aw) => set({ current: aw }),

  detailOpen: false,
  openDetail: (aw) => set({ current: aw, detailOpen: true }),
  closeDetail: () => set({ detailOpen: false }),

  arOpen: false,
  openAR: (aw) => set({ current: aw, arOpen: true, detailOpen: false }),
  closeAR: () => set({ arOpen: false }),

  myWallOpen: false,
  myWallArtworkIds: [],
  openMyWall: (ids) => set({ myWallOpen: true, myWallArtworkIds: ids, detailOpen: false }),
  closeMyWall: () => set({ myWallOpen: false, myWallArtworkIds: [] }),

  galleryArOpen: false,
  galleryArIds: [],
  openGalleryAR: (ids) => set({ galleryArOpen: true, galleryArIds: ids, isSelectMode: false, selectedIds: new Set() }),
  closeGalleryAR: () => set({ galleryArOpen: false, galleryArIds: [] }),

  selectedIds: new Set(),
  isSelectMode: false,
  enterSelectMode: () => set({ isSelectMode: true }),
  exitSelectMode: () => set({ isSelectMode: false, selectedIds: new Set() }),
  toggleSelect: (id) => {
    const { selectedIds } = get()
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else {
      if (next.size >= 6) { get().showToast('Maximum six works'); return }
      next.add(id)
    }
    set({ selectedIds: next })
  },

  qrOpen: false,
  openQR: () => set({ qrOpen: true }),
  closeQR: () => set({ qrOpen: false }),

  toast: { msg: '', visible: false },
  showToast: (msg, ms = 2500) => {
    const t = get().toast
    if (t._timer) clearTimeout(t._timer)
    const timer = setTimeout(() => set(s => ({ toast: { ...s.toast, visible: false } })), ms)
    set({ toast: { msg, visible: true, _timer: timer } })
  },
}))
