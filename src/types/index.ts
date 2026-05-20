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
  // Art-market additions
  ownerContactId?: string | null  // artist/collector/gallery contact who owns it
  costBasis?: number | null       // gallery's cost (alias: dealer purchase price)
  // Three-way ownership model:
  //   dealer    -> the account holder owns it; full economics tracked
  //   artist    -> owned by an artist contact (commission split)
  //   collector -> owned by a collector / gallery contact (consignment)
  ownershipStatus?: 'dealer' | 'artist' | 'collector' | null
  purchaseDate?: string | null      // when the dealer/consigner acquired it
  soldPrice?: number | null         // final realized sale price
  taxPct?: number | null            // VAT / sales tax rate %
  // Collector / gallery consignment split — separate from commissionPct
  // (which doubles as "our commission %" for consignments and the
  // sales-person % for dealer-owned stock).
  salesCommissionPct?: number | null
}

export type ArtworkOwnershipStatus = 'dealer' | 'artist' | 'collector'

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

export interface DiscoverProfile {
  ownerId: string
  slug: string
  displayName: string
  bio?: string | null
  heroImageUrl?: string | null
  contactEmail?: string | null
  social?: Record<string, string> // { instagram, twitter, website, ... }
  theme?: { accent?: string; bg?: string }
  published: boolean
  createdAt?: string
  updatedAt?: string
}

export interface ArtShowWall {
  id: string
  x: number // normalized [0..1] of floor plan
  y: number
  length: number // normalized
  rotation: number // degrees
}

export interface ArtShowPlacement {
  id: string
  artworkId: string
  wallId: string
  position: number // 0..1 along the wall
  widthCm?: number
}

export interface ArtShow {
  id: string
  ownerId: string
  name: string
  venueName?: string | null
  floorPlanUrl?: string | null
  wallSegments: ArtShowWall[]
  placements: ArtShowPlacement[]
  createdAt?: string
  updatedAt?: string
}

export interface VirtualExhibitionWallArtwork {
  artworkId: string
  wall: 0 | 1 | 2 | 3 // box-gallery uses 4 walls, indexed N/E/S/W
  position: number // 0..1 along the wall
  height: number // 0..1 vertical position
  scale: number // 0.5..2.0
}

export interface VirtualExhibition {
  id: string
  ownerId: string
  name: string
  slug?: string | null
  roomTemplate: string
  wallArtworks: VirtualExhibitionWallArtwork[]
  wallColor?: string
  lighting?: { intensity?: number }
  published: boolean
  createdAt?: string
  updatedAt?: string
}

export interface Contact {
  id: string
  ownerId: string
  name?: string | null
  email?: string | null
  phone?: string | null
  country?: string | null
  category?: string | null
  tags?: string[] | null
  source?: string | null
  notes?: string | null
  lastSeenAt?: string | null
  // CRM extension
  organizationId?: string | null
  role?: string | null
  lifecycleStage?: string | null
  interestedArtworkIds?: string[] | null   // artworks this contact has expressed interest in
  isArtist?: boolean                       // true if this contact represents an artist
  artistContactIds?: string[] | null       // contact ids of artists this contact follows / is linked to
  createdAt?: string
  updatedAt?: string
}

export interface Subscriber {
  id: string
  ownerId: string
  email: string
  name?: string | null
  source?: string | null
  optedInAt?: string
  optedOutAt?: string | null
  createdAt?: string
}

// ============================================================
// CRM (Artlogic-style)
// ============================================================
export type OrganizationType = 'gallery' | 'collector' | 'press' | 'institution' | 'vendor' | 'other'
export interface Organization {
  id: string
  ownerId: string
  name: string
  type: OrganizationType
  website?: string | null
  country?: string | null
  notes?: string | null
  createdAt?: string
  updatedAt?: string
}

export type DealStage = 'enquiry' | 'qualified' | 'proposal' | 'negotiation' | 'reserved' | 'won' | 'lost'
export interface Deal {
  id: string
  ownerId: string
  contactId?: string | null
  organizationId?: string | null
  artworkId?: string | null
  artworkIds?: string[] | null      // multiple artworks in deal
  title: string
  stage: DealStage
  amount?: number | null
  currency?: string | null
  expectedCloseDate?: string | null
  probability?: number | null
  notes?: string | null
  createdAt?: string
  updatedAt?: string
}

export type ActivityType = 'note' | 'call' | 'email' | 'meeting' | 'viewing' | 'offer' | 'file'
export interface Activity {
  id: string
  ownerId: string
  contactId?: string | null
  dealId?: string | null
  type: ActivityType
  subject?: string | null
  body?: string | null
  occurredAt: string
  createdAt?: string
}

export type TaskPriority = 'low' | 'medium' | 'high'
export interface Task {
  id: string
  ownerId: string
  contactId?: string | null
  dealId?: string | null
  title: string
  dueAt?: string | null
  doneAt?: string | null
  priority: TaskPriority
  createdAt?: string
}

// ============================================================
// Social Media calendar (Loomly Brief + CoSchedule + Buffer)
// ============================================================
export type SocialPlatform = 'instagram' | 'x' | 'linkedin' | 'facebook' | 'tiktok' | 'youtube' | 'pinterest' | 'threads'
export interface SocialChannel {
  id: string
  ownerId: string
  platform: SocialPlatform
  handle: string
  displayName?: string | null
  avatarUrl?: string | null
  active: boolean
  createdAt?: string
}

export type ContentType = 'post' | 'reel' | 'story' | 'blog' | 'newsletter' | 'event_promo'
export type ContentStatus =
  | 'draft' | 'in_progress' | 'submitted_for_review' | 'changes_requested'
  | 'approved' | 'scheduled' | 'published' | 'failed' | 'archived'

export interface ContentItem {
  id: string
  ownerId: string
  type: ContentType
  status: ContentStatus
  title?: string | null
  copy?: string | null
  hashtags?: string[] | null
  purpose?: string | null
  postType?: string | null
  targetAudience?: string | null
  hook?: string | null
  cta?: string | null
  ctaUrl?: string | null
  scheduledAt?: string | null
  publishedAt?: string | null
  channels?: string[] | null
  mediaUrls?: string[] | null
  coverUrl?: string | null
  artworkIds?: string[] | null
  eventDate?: string | null
  eventLocation?: string | null
  assigneeId?: string | null
  reviewerId?: string | null
  approvedAt?: string | null
  approvedBy?: string | null
  bodyMd?: string | null
  bodyHtml?: string | null
  // Marketing matrix (Thomas's framework)
  pillar?: string | null              // Brand pillar
  funnelStage?: string | null         // awareness | consideration | conversion | retention
  audienceSegment?: string | null     // collectors | first-time | press | curators
  format?: string | null              // carousel | reel | static | video | story | article | email
  kpi?: string | null                 // leads | engagement | reach
  platform?: string | null            // instagram | x | linkedin | facebook | tiktok
  monthKey?: string | null            // '2026-05' for monthly plan grouping
  campaignId?: string | null          // optional Upfluence-style campaign grouping
  // Type-specific extras
  subjectLine?: string | null         // newsletter
  previewText?: string | null         // newsletter inbox preview
  videoUrl?: string | null            // reel / youtube
  tags?: string[] | null              // blog tags (distinct from social hashtags)
  slug?: string | null                // legacy — public URL slug (now unused)
  publishedUrl?: string | null        // external blog/newsletter URL (Squarespace, Substack, Mailchimp…) supplied by mgmt team
  createdAt?: string
  updatedAt?: string
}

// Marketing campaign — a named bucket of related content items.
export type CampaignStatus = 'planned' | 'active' | 'completed' | 'archived'
export interface Campaign {
  id: string
  ownerId: string
  name: string
  description?: string | null
  startDate?: string | null
  endDate?: string | null
  status: CampaignStatus
  colour?: string | null
  createdAt?: string
  updatedAt?: string
}

// Deal line item (art-market)
export type DealLineDirection = 'out' | 'swap_in'
export type DealLineMode = 'sale' | 'rent'
export type DealLineStatus = 'pending' | 'offered' | 'countered' | 'agreed' | 'declined' | 'completed'

export interface OfferRound {
  round: number
  by: 'company' | 'client'
  amount: number
  salesCommissionPct?: number | null
  occurredAt: string
  note?: string | null
}

export interface DealArtwork {
  id: string
  dealId: string
  artworkId: string
  direction: DealLineDirection
  mode: DealLineMode
  listPrice?: number | null
  offerPrice?: number | null
  counterOffer?: number | null
  agreedPrice?: number | null
  commissionPct?: number | null
  rentTermMonths?: number | null
  rentMonthly?: number | null
  swapValue?: number | null
  lineStatus: DealLineStatus
  notes?: string | null
  position: number
  offerRounds?: OfferRound[] | null   // negotiation history (jsonb)
  createdAt?: string
  updatedAt?: string
}

// Saved presentation record
export interface SavedPresentation {
  id: string
  ownerId: string
  title: string
  layout: string
  artworkIds: string[]
  showPrice: boolean
  rentalTiers?: Record<string, { rent12?: number | null; rent24?: number | null; rent36?: number | null }>
  pdfUrl?: string | null
  createdAt?: string
  updatedAt?: string
}

// Junction: which presentations have been sent to which contacts
export interface ContactPresentation {
  id: string
  contactId: string
  presentationId: string
  sentAt?: string | null
  notes?: string | null
  createdAt?: string
}

export interface ContentComment {
  id: string
  ownerId: string
  contentId: string
  authorId: string
  body: string
  resolved: boolean
  createdAt?: string
}

// ============================================================
// Viewing-room presentation (per-artwork pricing)
// ============================================================
export type SaleMode = 'sale' | 'rent' | 'both' | 'hidden'
export interface CollectionMember {
  artworkId: string
  collectionId: string
  position?: number
  showPrice: boolean
  saleMode: SaleMode
  rent12mo?: number | null
  rent24mo?: number | null
  rent36mo?: number | null
  notes?: string | null
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
