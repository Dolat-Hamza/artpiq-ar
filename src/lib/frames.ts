import { FrameStyle } from '@/types'

export interface FramePreset {
  style: FrameStyle
  label: string
  // CSS rendering hints
  borderColor: string
  borderWidthPx: number   // base px at 100% scale (overridden by widthMm × pxPerMm)
  matteColor: string
  shadow: string
}

export const FRAME_PRESETS: Record<FrameStyle, FramePreset> = {
  none: {
    style: 'none',
    label: 'None',
    borderColor: 'transparent',
    borderWidthPx: 0,
    matteColor: '#ffffff',
    shadow: '0 1px 2px rgba(0,0,0,.18)',
  },
  'thin-black': {
    style: 'thin-black',
    label: 'Thin black',
    borderColor: '#0a0a0a',
    borderWidthPx: 8,
    matteColor: '#ffffff',
    shadow: '0 6px 14px rgba(0,0,0,.22)',
  },
  'thick-black': {
    style: 'thick-black',
    label: 'Thick black',
    borderColor: '#0a0a0a',
    borderWidthPx: 22,
    matteColor: '#ffffff',
    shadow: '0 10px 22px rgba(0,0,0,.28)',
  },
  wood: {
    style: 'wood',
    label: 'Natural wood',
    borderColor: '#a07a4f',
    borderWidthPx: 16,
    matteColor: '#fafaf7',
    shadow: '0 8px 18px rgba(0,0,0,.22)',
  },
  'gallery-white': {
    style: 'gallery-white',
    label: 'Gallery white',
    borderColor: '#f5f5f4',
    borderWidthPx: 18,
    matteColor: '#ffffff',
    shadow: '0 6px 16px rgba(0,0,0,.18)',
  },
  gold: {
    style: 'gold',
    label: 'Gold ornate',
    borderColor: '#c9a24a',
    borderWidthPx: 24,
    matteColor: '#f8f3e3',
    shadow: '0 12px 26px rgba(0,0,0,.32)',
  },
}

export const FRAME_STYLES: FrameStyle[] = [
  'none',
  'thin-black',
  'thick-black',
  'wood',
  'gallery-white',
  'gold',
]
