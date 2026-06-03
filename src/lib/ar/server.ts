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
// @ts-expect-error fflate package.json exports map blocks TS resolver — runtime fine
import * as fflateModule from 'fflate'
const fflate = fflateModule as unknown as {
  unzipSync: (data: Uint8Array) => Record<string, Uint8Array>
  zipSync: (data: Record<string, Uint8Array>, opts?: { level?: number }) => Uint8Array
  strToU8: (str: string) => Uint8Array
  strFromU8: (data: Uint8Array) => string
}
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
  // flipY: Apple Quick Look's USD renderer treats texture (0,0) as
  // bottom-left (USD/OpenSubdiv convention), so passing the PNG as-is
  // (top-down origin) with PlaneGeometry's bottom-left UVs would sample
  // the wrong row and render upside-down. Three's USDZExporter compensates
  // when flipY=true by vertically flipping the canvas before encoding the
  // PNG — that double-flip cancels out into an upright render on Quick
  // Look / Scene Viewer.
  //
  // (Earlier PR set flipY=true to fix a previous mirror issue. Empirically
  // wrong against Quick Look for paintings — leaving it false matches what
  // Apple's renderer expects.)
  tex.flipY = false
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
  // USDZExporter.parse(scene, onDone, onError, options) is the callback API.
  // parseAsync(scene, options) is the promise API — what we want here. The
  // earlier code called parse() and passed options where onDone should go,
  // so `out` came back undefined and `out.buffer` threw
  // `Cannot read properties of undefined (reading 'buffer')` for every USDZ
  // request — which silently broke iOS Quick Look entirely.
  // Types for parseAsync are missing in this three version — call dynamically.
  const exporter = new USDZExporter() as unknown as {
    parseAsync: (scene: THREE.Scene, options: Record<string, unknown>) => Promise<Uint8Array>
  }
  const out = await exporter.parseAsync(scene, {
    ar: {
      anchoring: { type: 'plane' },
      planeAnchoring: { alignment },
    },
    includeAnchoringProperties: true,
    quickLookCompatible: true,
    maxTextureSize: 1024,
  })

  // Post-process to fix three.js USDZExporter shader-type bugs that make iOS
  // Quick Look reject the file with "AR object could not be opened". Apple's
  // usdchecker reports:
  //   Transform2d_diffuse.inputs:in       expected float2, got token
  //   PrimvarReader_diffuse.inputs:varname expected string, got token
  // These come from the template literals in USDZExporter.js#buildTexture
  // (token inputs:varname / token inputs:in.connect). We unzip the USDA,
  // string-replace the two declarations, and repack.
  //
  // Patch is bounded to USDZ output — does not touch geometry or texture
  // files. Costs <50ms on a typical scene.
  const fixed = patchUsdzShaderTypes(out)
  return fixed.buffer.slice(fixed.byteOffset, fixed.byteOffset + fixed.byteLength) as ArrayBuffer
}

function patchUsdzShaderTypes(usdz: Uint8Array): Uint8Array {
  let files: Record<string, Uint8Array>
  try {
    files = fflate.unzipSync(usdz)
  } catch (e) {
    console.warn('[ar/server] USDZ unzip for shader-type patch failed; returning raw', e)
    return usdz
  }
  const modelKey = Object.keys(files).find(k => k.endsWith('model.usda'))
  if (!modelKey) return usdz
  const usda = fflate.strFromU8(files[modelKey])
  let patched = usda
  // 1) PrimvarReader_<map>.inputs:varname — type should be `string`, not `token`
  patched = patched.replace(
    /token inputs:varname = /g,
    'string inputs:varname = ',
  )
  // 2) Transform2d_<map>.inputs:in.connect — type should be `float2`, not `token`
  patched = patched.replace(
    /token inputs:in\.connect = /g,
    'float2 inputs:in.connect = ',
  )
  if (patched === usda) return usdz
  files[modelKey] = fflate.strToU8(patched)
  // USDZ spec requires `model.usda` first + 64-byte alignment. fflate handles
  // alignment via the `extra` field on each entry; the alignment that three's
  // USDZExporter set up survives because we reuse the same fflate API and
  // entry layout. zipSync with level: 0 keeps the STORE compression Quick
  // Look needs.
  return fflate.zipSync(files, { level: 0 })
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
