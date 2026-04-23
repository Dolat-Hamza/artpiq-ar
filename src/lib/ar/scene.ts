// Pure scene builders — framework/runtime agnostic.
// The caller injects a `loadTex(url)` function that returns a THREE.Texture,
// allowing the same code to run in the browser (HTMLImage path) or in Node
// (sharp → DataTexture path).

import type * as THREE_NS from 'three'
import type { Artwork } from '@/types'

export type TexLoader = (url: string) => Promise<THREE_NS.Texture>

/**
 * Build a framed painting at origin, facing +Z.
 * Includes: canvas, passepartout (mat), extruded wooden frame with bevel,
 * and a back board.
 */
export function buildFramedPainting(
  THREE: typeof THREE_NS,
  widthM: number,
  heightM: number,
  canvasTex: THREE_NS.Texture,
  cx = 0,
  cy = 0,
): THREE_NS.Group {
  const group = new THREE.Group()

  // Dimensions (in metres)
  const MAT = 0.015     // passepartout inset around canvas (15 mm)
  const FRAME_T = 0.024 // frame thickness (24 mm)
  const FRAME_D = 0.020 // frame extrude depth (20 mm)
  const MAT_D = 0.002   // mat board depth (2 mm)
  const BACK_D = 0.003  // back board thickness
  const CANVAS_Z = 0.001

  // Canvas
  const paintingMat = new THREE.MeshStandardMaterial({
    map: canvasTex,
    roughness: 0.7,
    metalness: 0.0,
    side: THREE.DoubleSide,
  })
  const canvas = new THREE.Mesh(new THREE.PlaneGeometry(widthM, heightM), paintingMat)
  canvas.position.set(cx, cy, CANVAS_Z)
  group.add(canvas)

  // Passepartout (white mat) — drawn as a thin rectangle ring.
  // We approximate with four bars; they sit slightly in front of the canvas.
  const matW = widthM + MAT * 2
  const matH = heightM + MAT * 2
  const matMat = new THREE.MeshStandardMaterial({
    color: 0xf5f1e8, roughness: 0.85, metalness: 0.0,
  })
  const matBars = [
    // top
    { w: matW, h: MAT, x: 0, y: heightM / 2 + MAT / 2 },
    // bottom
    { w: matW, h: MAT, x: 0, y: -(heightM / 2 + MAT / 2) },
    // left
    { w: MAT, h: heightM, x: -(widthM / 2 + MAT / 2), y: 0 },
    // right
    { w: MAT, h: heightM, x: widthM / 2 + MAT / 2, y: 0 },
  ]
  matBars.forEach(({ w, h, x, y }) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, MAT_D),
      matMat,
    )
    m.position.set(cx + x, cy + y, CANVAS_Z + MAT_D / 2)
    group.add(m)
  })

  // Extruded mitered frame (Shape with hole).
  const outerW = matW + FRAME_T * 2
  const outerH = matH + FRAME_T * 2

  const outer = new THREE.Shape()
  outer.moveTo(-outerW / 2, -outerH / 2)
  outer.lineTo(outerW / 2, -outerH / 2)
  outer.lineTo(outerW / 2, outerH / 2)
  outer.lineTo(-outerW / 2, outerH / 2)
  outer.lineTo(-outerW / 2, -outerH / 2)

  const hole = new THREE.Path()
  hole.moveTo(-matW / 2, -matH / 2)
  hole.lineTo(matW / 2, -matH / 2)
  hole.lineTo(matW / 2, matH / 2)
  hole.lineTo(-matW / 2, matH / 2)
  hole.lineTo(-matW / 2, -matH / 2)
  outer.holes.push(hole)

  const frameGeo = new THREE.ExtrudeGeometry(outer, {
    depth: FRAME_D,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.003,
    bevelSegments: 2,
    curveSegments: 1,
    steps: 1,
  })
  // Centre along Z so front face ~ matches mat-board front.
  frameGeo.translate(0, 0, -FRAME_D / 2 + MAT_D + CANVAS_Z)

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x2a1810,
    roughness: 0.6,
    metalness: 0.05,
  })
  const frame = new THREE.Mesh(frameGeo, woodMat)
  frame.position.set(cx, cy, 0)
  group.add(frame)

  // Back board — dark brown, slightly larger than frame, 5mm behind canvas.
  const backW = outerW + 0.01
  const backH = outerH + 0.01
  const backMat = new THREE.MeshStandardMaterial({
    color: 0x1a0e06, roughness: 0.8, metalness: 0.0,
  })
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(backW, backH, BACK_D),
    backMat,
  )
  back.position.set(cx, cy, -0.005 - BACK_D / 2)
  group.add(back)

  return group
}

function addStandardLighting(THREE: typeof THREE_NS, scene: THREE_NS.Scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.5))
  const key = new THREE.DirectionalLight(0xfff8f0, 1.0)
  key.position.set(0, 0.5, 1)
  scene.add(key)
  // Rim light from behind — cool tone, adds depth.
  const rim = new THREE.DirectionalLight(0xbfd0ff, 0.3)
  rim.position.set(0, 0.3, -1)
  scene.add(rim)
}

export async function buildPaintingScene(
  THREE: typeof THREE_NS,
  aw: Artwork,
  loadTex: TexLoader,
): Promise<THREE_NS.Scene> {
  const imgUrl = aw.image || aw.thumb
  if (!imgUrl) throw new Error('No image URL for this artwork')

  const widthM = aw.widthCm / 100
  const heightM = aw.heightCm / 100

  let tex: THREE_NS.Texture
  try { tex = await loadTex(imgUrl) }
  catch {
    if (aw.thumb && aw.thumb !== imgUrl) tex = await loadTex(aw.thumb)
    else throw new Error('Could not load artwork image')
  }

  const scene = new THREE.Scene()
  scene.add(buildFramedPainting(THREE, widthM, heightM, tex))
  addStandardLighting(THREE, scene)
  return scene
}

/**
 * Gallery row: multiple paintings side-by-side as one combined USDZ scene.
 * iOS Quick Look limitation: whole scene moves as one — cannot manipulate
 * individual paintings. This delivers "see all N paintings on one wall".
 */
export async function buildGalleryScene(
  THREE: typeof THREE_NS,
  artworks: Artwork[],
  loadTex: TexLoader,
): Promise<THREE_NS.Scene> {
  const paintings = artworks.filter(a => a.type === 'painting')
  const TARGET_H = 0.5   // normalise heights to 50cm for visual coherence
  const GAP = 0.08       // 8cm spacing between frames
  const scene = new THREE.Scene()

  const scales = paintings.map(aw => TARGET_H / (aw.heightCm / 100))
  const widths = paintings.map((aw, i) => (aw.widthCm / 100) * scales[i])
  const totalW = widths.reduce((s, w) => s + w, 0) + GAP * Math.max(0, paintings.length - 1)
  let cursor = -totalW / 2

  for (let i = 0; i < paintings.length; i++) {
    const aw = paintings[i]
    const sc = scales[i]
    const wM = (aw.widthCm / 100) * sc
    const hM = TARGET_H
    const cx = cursor + wM / 2
    cursor += wM + GAP

    let tex: THREE_NS.Texture | null = null
    try { tex = await loadTex(aw.image || aw.thumb || '') } catch { tex = null }

    if (tex) {
      scene.add(buildFramedPainting(THREE, wM, hM, tex, cx, 0))
    } else {
      const fallbackColours = [0x8b6347, 0x4a6fa5, 0x5a8a5a, 0x8a5a8a]
      const mat = new THREE.MeshStandardMaterial({
        color: fallbackColours[i % fallbackColours.length], roughness: 0.8,
      })
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(wM, hM), mat)
      plane.position.set(cx, 0, 0)
      scene.add(plane)
    }
  }

  addStandardLighting(THREE, scene)
  return scene
}

export async function buildSculptureScene(
  THREE: typeof THREE_NS,
  aw: Artwork,
): Promise<THREE_NS.Scene> {
  const scene = new THREE.Scene()

  if (aw.id === 'bronze-helix') {
    const marble = new THREE.MeshStandardMaterial({ color: 0xf0ede8, roughness: 0.4, metalness: 0.0 })
    ;[
      { r1: 0.10, r2: 0.12, h: 0.02, y: 0.01 },
      { r1: 0.055, r2: 0.065, h: 0.22, y: 0.13 },
      { r1: 0.08, r2: 0.08, h: 0.015, y: 0.245 },
    ].forEach(({ r1, r2, h, y }) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, 32), marble)
      m.position.y = y
      scene.add(m)
    })
    const bmat = new THREE.MeshStandardMaterial({ color: 0x8b6030, roughness: 0.28, metalness: 0.82 })
    const N = 200, turns = 3.5, radius = 0.06, ht = 0.22
    for (let s = 0; s < 2; s++) {
      const pts = Array.from({ length: N + 1 }, (_, i) => {
        const t = i / N, ang = t * Math.PI * 2 * turns + s * Math.PI
        return new THREE.Vector3(Math.cos(ang) * radius, t * ht, Math.sin(ang) * radius)
      })
      const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N, 0.008, 8, false)
      const m = new THREE.Mesh(tube, bmat)
      m.position.y = 0.26
      scene.add(m)
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
  return scene
}
