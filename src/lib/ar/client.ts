'use client'
// Browser-only texture loader + Three.js group builder for WebXR direct rendering.

import type * as THREE_NS from 'three'
import type { Artwork } from '@/types'
import { buildFramedPainting } from './scene'

const imgCache = new Map<string, HTMLImageElement>()

export async function loadTexture(url: string) {
  const THREE = await import('three')

  let img = imgCache.get(url)
  if (!img) {
    img = await new Promise<HTMLImageElement>((res, rej) => {
      const timer = setTimeout(() => rej(new Error('Texture timeout')), 12000)
      const el = new Image()
      el.crossOrigin = 'anonymous'
      el.referrerPolicy = 'no-referrer-when-downgrade'
      el.decoding = 'async'
      el.onload = async () => {
        clearTimeout(timer)
        try { if (el.decode) await el.decode().catch(() => {}); res(el) }
        catch { res(el) }
      }
      el.onerror = () => { clearTimeout(timer); rej(new Error('Image load error')) }
      el.src = url
    })
    imgCache.set(url, img)
  }

  const tex = new THREE.Texture(img)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.generateMipmaps = false
  return tex
}

export async function preloadArtworkTextures(artworks: Artwork[]): Promise<void> {
  await Promise.all(
    artworks
      .filter(a => a.type === 'painting')
      .map(a => {
        const url = a.image || a.thumb
        return url ? loadTexture(url).catch(() => null) : null
      })
  )
}

/** Build a Three.js Group (framed painting) for WebXR direct rendering. */
export async function buildPaintingMesh(aw: Artwork): Promise<THREE_NS.Group> {
  const THREE = await import('three')
  const wM = aw.widthCm / 100, hM = aw.heightCm / 100

  let tex: THREE_NS.Texture | null = null
  try { tex = await loadTexture(aw.image || aw.thumb || '') } catch { tex = null }

  if (tex) {
    return buildFramedPainting(THREE, wM, hM, tex)
  }
  // Fallback: solid-colour placeholder inside a simple group
  const group = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({ color: 0x8b6347, roughness: 0.8 })
  group.add(new THREE.Mesh(new THREE.PlaneGeometry(wM, hM), mat))
  return group
}
