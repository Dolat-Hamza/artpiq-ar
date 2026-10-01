import { FrameStyle, StockRoom } from '@/types'

export interface FrameState {
  style: FrameStyle
  widthMm: number
  matteMm: number
}

export interface Placed {
  id: string // unique instance id
  artworkId: string
  cx: number
  cy: number
  widthCm: number
  frame: FrameState
  rotation: number // degrees
  matteColor: string // hex
  shadowOpacity: number // 0..1
  shadowSpread: number // 0..40 px (base)
}

// ArtPlacer-parity lighting model: per-channel B/C/S sliders, applied separately
// to room background, placed artwork images, and shadow casting.
export interface BCS {
  brightness: number // 0..200 (100 = neutral)
  contrast: number
  saturation: number
}
export const NEUTRAL_BCS: BCS = { brightness: 100, contrast: 100, saturation: 100 }

export interface LightingState {
  room: BCS
  artwork: BCS
  // Shadow channel only multiplies opacity/spread of the per-piece shadow (global).
  shadowGlobalOpacity: number // 0..200
  shadowGlobalSpread: number // 0..200
}
export const NEUTRAL_LIGHTING: LightingState = {
  room: { ...NEUTRAL_BCS },
  artwork: { ...NEUTRAL_BCS },
  shadowGlobalOpacity: 100,
  shadowGlobalSpread: 100,
}

export function bcsToFilter(bcs: BCS): string {
  return `brightness(${bcs.brightness}%) contrast(${bcs.contrast}%) saturate(${bcs.saturation}%)`
}

// Build a CSS clip-path polygon string from a normalized wall quad.
export function quadToClipPath(quad: StockRoom['wallQuad']): string {
  return `polygon(${quad.map(([x, y]) => `${(x * 100).toFixed(2)}% ${(y * 100).toFixed(2)}%`).join(', ')})`
}

export const DEFAULT_FRAME: FrameState = { style: 'thin-black', widthMm: 30, matteMm: 0 }
export const DEFAULT_MATTE = '#ffffff'

export const MATTE_PALETTE: { value: string; label: string }[] = [
  { value: '#ffffff', label: 'White' },
  { value: '#fafaf7', label: 'Off-white' },
  { value: '#e9e3d5', label: 'Cream' },
  { value: '#cfc8b6', label: 'Oat' },
  { value: '#9aa0a6', label: 'Grey' },
  { value: '#1c1c1c', label: 'Black' },
]

// Lighting sub-tabs in dock
export type LightingSubtab = 'room' | 'artwork' | 'shadow'

export type RoomCategory = 'all' | 'living' | 'bedroom' | 'office' | 'kitchen' | 'gallery' | 'plain'
export const ROOM_CATEGORIES: RoomCategory[] = ['all', 'living', 'bedroom', 'office', 'kitchen', 'gallery', 'plain']

export function quadWidthPx(quad: StockRoom['wallQuad'], imgW: number) {
  const top = (quad[1][0] - quad[0][0]) * imgW
  const bottom = (quad[2][0] - quad[3][0]) * imgW
  return (top + bottom) / 2
}

export function uid() {
  return Math.random().toString(36).slice(2, 10)
}

// Compose a box-shadow string from a placed piece's per-item shadow values
// modulated by global lighting shadow channel.
export function composeShadow(
  item: { frame: { style: string }; shadowOpacity: number; shadowSpread: number },
  lighting: LightingState,
): string {
  if (item.frame.style === 'none' || item.shadowOpacity === 0) return 'none'
  const opacity = item.shadowOpacity * (lighting.shadowGlobalOpacity / 100)
  const spread = item.shadowSpread * (lighting.shadowGlobalSpread / 100)
  const offsetY = spread * 0.5
  return `0 ${offsetY.toFixed(1)}px ${spread.toFixed(1)}px rgba(0,0,0,${opacity.toFixed(3)})`
}
