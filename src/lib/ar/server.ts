// Node-only: build scenes + export GLB/USDZ on the server.
//
// Three.js exporters need a DOM canvas. We install a tiny shim that
// pretends to be a <canvas> but just returns pre-encoded PNG bytes. Each
// Texture carries both raw RGBA (for GLTFExporter's DataTexture path) and
// a pre-encoded PNG (for USDZExporter's imageToCanvas path).

import 'server-only'
import type { Artwork } from '@/types'
import { installCanvasShim, FakeHTMLImageElement } from './node-canvas-shim'

installCanvasShim()

// Import three AFTER installing the shim so any top-level checks see it.
import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js'
import sharp from 'sharp'
import {
  buildPaintingScene,
  buildGalleryScene,
  buildSculptureScene,
  type TexLoader,
} from './scene'

const texCache = new Map<string, THREE.Texture>()

async function decodeToTexture(url: string): Promise<THREE.Texture> {
  const cached = texCache.get(url)
  if (cached) return cached

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'artpiq-ar/1.0 (https://artpiq.art)',
    },
  })
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status} ${url}`)
  const srcBuf = Buffer.from(await res.arrayBuffer())

  // Cap at 1024 px so both exporters (and the eventual USDZ) stay small.
  const pipeline = sharp(srcBuf).rotate().resize({
    width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true,
  })

  // Raw RGBA for GLTFExporter's putImageData path.
  const { data: rgba, info } = await pipeline
    .clone()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  // PNG bytes for USDZExporter.
  const png = await pipeline.clone().png().toBuffer()

  const fakeImg = new FakeHTMLImageElement(info.width, info.height, new Uint8Array(png))
  // Add a `.data` view so GLTFExporter's `if (image.data !== undefined)` path
  // fires and uses putImageData (which our shim re-encodes via sharp).
  ;(fakeImg as FakeHTMLImageElement & { data: Uint8Array }).data = new Uint8Array(rgba)

  // We use a plain Texture (not DataTexture), assigning our fake image as
  // source. `image.data` mimics a DataTexture enough for the exporter.
  const tex = new THREE.Texture(fakeImg as unknown as HTMLImageElement)
  tex.colorSpace = THREE.SRGBColorSpace
  // Our PNG is top-left origin; three's default UV mapping is bottom-left.
  // flipY = true corrects vertical orientation.
  tex.flipY = true
  tex.format = THREE.RGBAFormat
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true

  texCache.set(url, tex)
  return tex
}

const serverLoadTex: TexLoader = (url) => decodeToTexture(url)

async function exportGLB(scene: THREE.Scene): Promise<ArrayBuffer> {
  return new Promise((res, rej) => {
    new GLTFExporter().parse(
      scene,
      (result) => res(result as ArrayBuffer),
      rej,
      { binary: true },
    )
  })
}

async function exportUSDZ(scene: THREE.Scene): Promise<ArrayBuffer> {
  const out = await new USDZExporter().parse(scene)
  return out.buffer as ArrayBuffer
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function buildPaintingGLB(aw: Artwork): Promise<ArrayBuffer> {
  const scene = await buildPaintingScene(THREE, aw, serverLoadTex)
  return exportGLB(scene)
}
export async function buildPaintingUSDZ(aw: Artwork): Promise<ArrayBuffer> {
  const scene = await buildPaintingScene(THREE, aw, serverLoadTex)
  return exportUSDZ(scene)
}
export async function buildSculptureGLB(aw: Artwork): Promise<ArrayBuffer> {
  const scene = await buildSculptureScene(THREE, aw)
  return exportGLB(scene)
}
export async function buildSculptureUSDZ(aw: Artwork): Promise<ArrayBuffer> {
  const scene = await buildSculptureScene(THREE, aw)
  return exportUSDZ(scene)
}
export async function buildGalleryGLBServer(artworks: Artwork[]): Promise<ArrayBuffer> {
  const scene = await buildGalleryScene(THREE, artworks, serverLoadTex)
  return exportGLB(scene)
}
export async function buildGalleryUSDZServer(artworks: Artwork[]): Promise<ArrayBuffer> {
  const scene = await buildGalleryScene(THREE, artworks, serverLoadTex)
  return exportUSDZ(scene)
}
