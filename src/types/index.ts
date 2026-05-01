export type ArtworkType = 'painting' | 'sculpture' | 'video' | 'digital'
export type Orientation = 'portrait' | 'landscape' | 'square' | 'panoramic'
export type Privacy = 'public' | 'private'

export interface Artwork {
  id: string
  type: ArtworkType
  title: string
  artist: string
  year: string
  medium: string
  widthCm: number
  heightCm: number
  depthCm?: number
  description?: string
  image: string | null
  thumb: string | null
  wikiTitle?: string

  // ArtPlacer-parity fields (all optional for back-compat)
  material?: string
  price?: number
  currency?: string
  purchaseUrl?: string
  viewMoreUrl?: string
  nftUrl?: string
  collection?: string
  orientation?: Orientation
  privacy?: Privacy
  colors?: string[]
  sold?: boolean
  transparent?: boolean
  sqspSku?: string
  status?: ArtworkStatus
  locationAddress?: string
  locationCountry?: string
  commissionPct?: number
  taxAmount?: number
  contactName?: string
  contactEmail?: string
  contactPhone?: string
}

export type ArtworkStatus =
  | 'for_sale'
  | 'sale_pending'
  | 'for_rent'
  | 'rented'
  | 'reserved'
  | 'sold'
  | 'not_for_sale'

export const ARTWORK_STATUSES: ArtworkStatus[] = [
  'for_sale',
  'sale_pending',
  'for_rent',
  'rented',
  'reserved',
  'sold',
  'not_for_sale',
]

export interface Collection {
  id: string
  ownerId: string
  name: string
  description?: string
  coverUrl?: string
  privacy: 'public' | 'private'
  slug?: string | null
  viewingRoomStatus?: ViewingRoomStatus
  viewingRoomPassword?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface WallLayer {
  id: number
  artworkId: string
  x: number
  y: number
  scale: number
  rotation: number
}

// Frame presets (Task 1)
export type FrameStyle = 'none' | 'thin-black' | 'thick-black' | 'wood' | 'gallery-white' | 'gold'

export interface FrameConfig {
  style: FrameStyle
  widthMm: number   // physical frame width
  matteMm: number   // matte board width (0 = no matte)
}

// Stock rooms for sample-room composer
export type RoomPerspective = 'front' | 'angled' | 'corner'
export type RoomOrientation = 'portrait' | 'landscape' | 'square'
export type WallSize = 'small' | 'medium' | 'large'

export interface StockRoom {
  id: string
  name: string
  category: 'living' | 'bedroom' | 'office' | 'kitchen' | 'gallery' | 'plain'
  image: string         // 1600px+ JPEG
  thumb: string         // 400px
  // wall quad in normalized [0..1] image coords; clockwise from top-left
  wallQuad: [[number, number], [number, number], [number, number], [number, number]]
  // real-world reference: width of wall in cm at quad to enable true-scale
  wallWidthCm: number
  // ArtPlacer-parity metadata for library filters
  perspective?: RoomPerspective
  orientation?: RoomOrientation
  wallSize?: WallSize
  smart?: boolean
}

// Saved designs (compositions)
export type ViewingRoomStatus = 'draft' | 'live'

export interface DesignFolder {
  id: string
  ownerId: string
  name: string
  createdAt?: string
}

export interface SavedDesign {
  id: string
  ownerId: string
  name: string
  roomId?: string | null
  myWallBgUrl?: string | null
  placed: unknown // Placed[] from SampleRoom (jsonb-typed)
  lighting: unknown
  wallColor?: string | null
  customize?: unknown
  thumbUrl?: string | null
  folderId?: string | null
  createdAt?: string
  updatedAt?: string
}
