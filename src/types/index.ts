export interface Artwork {
  id: string
  type: 'painting' | 'sculpture'
  title: string
  artist: string
  year: string
  medium: string
  widthCm: number
  heightCm: number
  description?: string
  image: string | null
  thumb: string | null
  wikiTitle?: string
}

export interface WallLayer {
  id: number
  aw: Artwork
  img: HTMLImageElement | null
  x: number
  y: number
  w: number
  h: number
}
