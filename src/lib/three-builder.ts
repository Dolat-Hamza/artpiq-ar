'use client'
// All Three.js work happens client-side only
// Dynamic imports are handled by callers with `typeof window !== 'undefined'` checks

import type { Artwork } from '@/types'

// Cache: artwork id → ArrayBuffer (GLB binary)
const glbCache = new Map<string, ArrayBuffer>()
let activeBlobUrl: string | null = null

export function freshBlobUrl(buffer: ArrayBuffer): string {
  if (activeBlobUrl) URL.revokeObjectURL(activeBlobUrl)
  activeBlobUrl = URL.createObjectURL(new Blob([buffer], { type: 'model/gltf-binary' }))
  return activeBlobUrl
}

export function clearBlobUrl(): void {
  if (activeBlobUrl) { URL.revokeObjectURL(activeBlobUrl); activeBlobUrl = null }
}

/** Load image via HTMLImageElement (handles CORS/redirects), wrap as THREE.CanvasTexture */
export async function loadTexture(url: string) {
  const THREE = await import('three')
  return new Promise<InstanceType<typeof THREE.CanvasTexture>>((res, rej) => {
    const timer = setTimeout(() => rej(new Error('Texture timeout')), 8000)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.referrerPolicy = 'no-referrer-when-downgrade'
    img.onload = () => {
      clearTimeout(timer)
      try {
        const tex = new THREE.CanvasTexture(img)
        tex.colorSpace = THREE.SRGBColorSpace
        res(tex)
      } catch (e) { rej(e) }
    }
    img.onerror = () => { clearTimeout(timer); rej(new Error('Image load error')) }
    img.src = url
  })
}

function buildGLB(scene: object): Promise<ArrayBuffer> {
  return new Promise(async (res, rej) => {
    const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js')
    new GLTFExporter().parse(scene as Parameters<InstanceType<typeof GLTFExporter>['parse']>[0], res as (v: ArrayBuffer | object) => void, rej, { binary: true })
  })
}

export async function getPaintingBuffer(aw: Artwork): Promise<ArrayBuffer> {
  if (glbCache.has(aw.id)) return glbCache.get(aw.id)!
  const imgUrl = aw.image || aw.thumb
  if (!imgUrl) throw new Error('No image URL for this artwork')

  const THREE = await import('three')
  const wM = aw.widthCm / 100, hM = aw.heightCm / 100

  let texture: InstanceType<typeof THREE.CanvasTexture>
  try {
    texture = await loadTexture(imgUrl)
  } catch {
    if (aw.thumb && aw.thumb !== imgUrl) texture = await loadTexture(aw.thumb)
    else throw new Error('Could not load artwork image')
  }

  const scene = new THREE.Scene()
  scene.add(new THREE.Mesh(
    new THREE.PlaneGeometry(wM, hM),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.7, metalness: 0.0, side: THREE.FrontSide })
  ))

  const ft = 0.018, fd = 0.013
  const fmat = new THREE.MeshStandardMaterial({ color: 0x1a0e06, roughness: 0.55, metalness: 0.08 });
  [
    { w: wM + ft * 2, h: ft, x: 0, y: -(hM / 2 + ft / 2) },
    { w: wM + ft * 2, h: ft, x: 0, y: hM / 2 + ft / 2 },
    { w: ft, h: hM, x: -(wM / 2 + ft / 2), y: 0 },
    { w: ft, h: hM, x: wM / 2 + ft / 2, y: 0 },
  ].forEach(({ w, h, x, y }) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, fd), fmat)
    bar.position.set(x, y, -fd / 2 + 0.001)
    scene.add(bar)
  })

  scene.add(new THREE.AmbientLight(0xffffff, 0.75))
  const key = new THREE.DirectionalLight(0xfff8f0, 1.0)
  key.position.set(0, 0.5, 1); scene.add(key)

  const buf = await buildGLB(scene)
  glbCache.set(aw.id, buf)
  return buf
}

export async function getSculptureBuffer(aw: Artwork): Promise<ArrayBuffer> {
  if (glbCache.has(aw.id)) return glbCache.get(aw.id)!

  const THREE = await import('three')
  const scene = new THREE.Scene()

  if (aw.id === 'bronze-helix') {
    const marble = new THREE.MeshStandardMaterial({ color: 0xf0ede8, roughness: 0.4, metalness: 0.0 });
    [
      { r1: 0.10, r2: 0.12, h: 0.02, y: 0.01 },
      { r1: 0.055, r2: 0.065, h: 0.22, y: 0.13 },
      { r1: 0.08, r2: 0.08, h: 0.015, y: 0.245 },
    ].forEach(({ r1, r2, h, y }) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, 32), marble)
      m.position.y = y; scene.add(m)
    })
    const bmat = new THREE.MeshStandardMaterial({ color: 0x8b6030, roughness: 0.28, metalness: 0.82 })
    const N = 200, turns = 3.5, radius = 0.06, ht = 0.22
    for (let s = 0; s < 2; s++) {
      const pts = Array.from({ length: N + 1 }, (_, i) => {
        const t = i / N, ang = t * Math.PI * 2 * turns + s * Math.PI
        return new THREE.Vector3(Math.cos(ang) * radius, t * ht, Math.sin(ang) * radius)
      })
      const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N, 0.008, 8, false)
      const m = new THREE.Mesh(tube, bmat); m.position.y = 0.26; scene.add(m)
    }
  } else {
    const omat = new THREE.MeshStandardMaterial({ color: 0x0a0a12, roughness: 0.05, metalness: 0.9 })
    const pmat = new THREE.MeshStandardMaterial({ color: 0xe8e4de, roughness: 0.5, metalness: 0.0 })
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.14), pmat)
    plinth.position.y = 0.02; scene.add(plinth)
    const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(0.10, 1), omat)
    gem.position.y = 0.19; gem.rotation.y = Math.PI / 8; scene.add(gem)
    const gem2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), omat)
    gem2.position.set(0.08, 0.30, 0); gem2.rotation.z = Math.PI / 5; scene.add(gem2)
  }

  scene.add(new THREE.AmbientLight(0xfff6ec, 0.45))
  const key = new THREE.DirectionalLight(0xfff4e0, 1.8); key.position.set(1.5, 3, 2); scene.add(key)
  const fill = new THREE.DirectionalLight(0xbfd0ff, 0.5); fill.position.set(-2, 1, -1); scene.add(fill)

  const buf = await buildGLB(scene)
  glbCache.set(aw.id, buf)
  return buf
}

export async function buildGalleryGLB(artworks: Artwork[]): Promise<ArrayBuffer> {
  const THREE = await import('three')
  const TARGET_H = 0.5, GAP = 0.06, FT = 0.018, FD = 0.013
  const fmat = new THREE.MeshStandardMaterial({ color: 0x1a0e06, roughness: 0.55, metalness: 0.08 })
  const scene = new THREE.Scene()

  const scales = artworks.map(aw => TARGET_H / (aw.heightCm / 100))
  const widths = artworks.map((aw, i) => (aw.widthCm / 100) * scales[i])
  const totalW = widths.reduce((s, w) => s + w, 0) + GAP * (artworks.length - 1)
  let cursor = -totalW / 2

  for (let i = 0; i < artworks.length; i++) {
    const aw = artworks[i]
    const sc = scales[i]
    const wM = (aw.widthCm / 100) * sc, hM = TARGET_H
    const cx = cursor + wM / 2; cursor += wM + GAP

    let mat: InstanceType<typeof THREE.MeshStandardMaterial>
    try {
      const tex = await loadTexture(aw.image || aw.thumb || '')
      mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0.0, side: THREE.FrontSide })
    } catch {
      const colours = [0x8b6347, 0x4a6fa5, 0x5a8a5a, 0x8a5a8a]
      mat = new THREE.MeshStandardMaterial({ color: colours[i % colours.length], roughness: 0.8 })
    }

    const painting = new THREE.Mesh(new THREE.PlaneGeometry(wM, hM), mat)
    painting.position.set(cx, 0, 0); scene.add(painting)

    ;[
      { w: wM + FT * 2, h: FT, x: 0, y: -(hM / 2 + FT / 2) },
      { w: wM + FT * 2, h: FT, x: 0, y: hM / 2 + FT / 2 },
      { w: FT, h: hM, x: -(wM / 2 + FT / 2), y: 0 },
      { w: FT, h: hM, x: wM / 2 + FT / 2, y: 0 },
    ].forEach(({ w, h, x, y }) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, FD), fmat)
      bar.position.set(cx + x, y, -FD / 2 + 0.001); scene.add(bar)
    })
  }

  scene.add(new THREE.AmbientLight(0xffffff, 0.8))
  const key = new THREE.DirectionalLight(0xfff8f0, 1.0); key.position.set(0, 0.5, 1); scene.add(key)
  return buildGLB(scene)
}

/** Build a Three.js Group (painting + frame) for WebXR direct rendering */
export async function buildPaintingMesh(aw: Artwork) {
  const THREE = await import('three')
  const wM = aw.widthCm / 100, hM = aw.heightCm / 100
  let mat: InstanceType<typeof THREE.MeshStandardMaterial>
  try {
    const tex = await loadTexture(aw.image || aw.thumb || '')
    mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0.0, side: THREE.FrontSide })
  } catch {
    mat = new THREE.MeshStandardMaterial({ color: 0x8b6347, roughness: 0.8 })
  }
  const group = new THREE.Group()
  group.add(new THREE.Mesh(new THREE.PlaneGeometry(wM, hM), mat))
  const ft = 0.018, fd = 0.013
  const fmat = new THREE.MeshStandardMaterial({ color: 0x1a0e06, roughness: 0.55, metalness: 0.08 });
  [
    { w: wM + ft * 2, h: ft, x: 0, y: -(hM / 2 + ft / 2) },
    { w: wM + ft * 2, h: ft, x: 0, y: hM / 2 + ft / 2 },
    { w: ft, h: hM, x: -(wM / 2 + ft / 2), y: 0 },
    { w: ft, h: hM, x: wM / 2 + ft / 2, y: 0 },
  ].forEach(({ w, h, x, y }) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, fd), fmat)
    bar.position.set(x, y, -fd / 2 + 0.001); group.add(bar)
  })
  return group
}
