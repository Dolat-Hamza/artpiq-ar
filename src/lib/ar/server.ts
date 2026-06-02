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

  // PNGs are top-down (origin top-left) but three.js PlaneGeometry's default
  // UVs put (0,0) at the bottom-left of the plane. We must flip on upload so
  // the image renders right-side-up:
  //
  //   flipY = false → renders upside-down (was the bug — Quick Look + Scene
  //                   Viewer showed paintings mirrored vertically because
  //                   neither honours flipY=false when reading from GLB/USDZ
  //                   in the same way three.js's own WebGL renderer does)
  //   flipY = true  → three flips during upload; GLTFExporter + USDZExporter
  //                   then write UVs that match upright rendering across all
  //                   downstream viewers (model-viewer, Quick Look,
  //                   Scene Viewer, Blender)
  const { data: rgba, info } = await pipeline
    .clone()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const png = await pipeline.clone().png().toBuffer()

  const fakeImg = new FakeHTMLImageElement(info.width, info.height, new Uint8Array(png))
  ;(fakeImg as FakeHTMLImageElement & { data: Uint8Array }).data = new Uint8Array(rgba)

  const tex = new THREE.Texture(fakeImg as unknown as HTMLImageElement)
  tex.colorSpace = THREE.SRGBColorSpace
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

type Alignment = 'vertical' | 'horizontal'
async function exportUSDZ(scene: THREE.Scene, alignment: Alignment = 'vertical'): Promise<ArrayBuffer> {
  const out = await new USDZExporter().parse(scene, {
    ar: {
      anchoring: { type: 'plane' },
      planeAnchoring: { alignment },
    },
    includeAnchoringProperties: true,
    quickLookCompatible: true,
    maxTextureSize: 1024,
  } as unknown as Parameters<InstanceType<typeof USDZExporter>['parse']>[1])
  return out.buffer as ArrayBuffer
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function buildPaintingGLB(aw: Artwork): Promise<ArrayBuffer> {
  const scene = await buildPaintingScene(THREE, aw, serverLoadTex)
  return exportGLB(scene)
}
export async function buildPaintingUSDZ(aw: Artwork): Promise<ArrayBuffer> {
  const scene = await buildPaintingScene(THREE, aw, serverLoadTex)
  return exportUSDZ(scene, 'vertical') // wall-mount
}
export async function buildGalleryGLB(artworks: Artwork[]): Promise<ArrayBuffer> {
  const scene = await buildGalleryScene(THREE, artworks, serverLoadTex)
  return exportGLB(scene)
}
export async function buildGalleryUSDZ(artworks: Artwork[]): Promise<ArrayBuffer> {
  const scene = await buildGalleryScene(THREE, artworks, serverLoadTex)
  return exportUSDZ(scene, 'vertical')
}
export async function buildSculptureGLB(aw: Artwork): Promise<ArrayBuffer> {
  const scene = await buildSculptureScene(THREE, aw)
  return exportGLB(scene)
}
export async function buildSculptureUSDZ(aw: Artwork): Promise<ArrayBuffer> {
  const scene = await buildSculptureScene(THREE, aw)
  return exportUSDZ(scene, 'horizontal') // floor / table
}
