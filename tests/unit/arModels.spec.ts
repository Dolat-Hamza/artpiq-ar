import { expect, test } from '@playwright/test'
import sharp from 'sharp'
// @ts-expect-error gltf-validator ships no type declarations
import { validateBytes } from 'gltf-validator'
import { buildPaintingUsdz } from '@/lib/ar/usdz'
import { buildPaintingGlb } from '@/lib/ar/glb'

interface ZipEntry { name: string; dataOffset: number; compressedSize: number; method: number }

// Walks local file headers only; enough to check the USDZ invariants.
function readEntries(buf: Buffer): ZipEntry[] {
  const out: ZipEntry[] = []
  let off = 0
  while (off + 30 <= buf.length && buf.readUInt32LE(off) === 0x04034b50) {
    const method = buf.readUInt16LE(off + 8)
    const compressedSize = buf.readUInt32LE(off + 18)
    const nameLen = buf.readUInt16LE(off + 26)
    const extraLen = buf.readUInt16LE(off + 28)
    const name = buf.subarray(off + 30, off + 30 + nameLen).toString('utf8')
    const dataOffset = off + 30 + nameLen + extraLen
    out.push({ name, dataOffset, compressedSize, method })
    off = dataOffset + compressedSize
  }
  return out
}

async function testJpeg(): Promise<Uint8Array> {
  const w = 64
  const h = 96
  const raw = Buffer.alloc(w * h * 3, 0)
  raw.fill(255, 0, w * (h / 2) * 3)
  return new Uint8Array(await sharp(raw, { raw: { width: w, height: h, channels: 3 } }).jpeg().toBuffer())
}

interface GlbJson {
  meshes: { primitives: { attributes: Record<string, number> }[] }[]
  nodes: { rotation?: number[] }[]
  accessors: { bufferView: number; byteOffset?: number; count: number; type: string }[]
  bufferViews: { byteOffset?: number; byteLength: number; byteStride?: number }[]
  images: { bufferView: number; mimeType: string }[]
}

function parseGlb(glb: Buffer) {
  expect(glb.toString('ascii', 0, 4)).toBe('glTF')
  const jsonLen = glb.readUInt32LE(12)
  const json = JSON.parse(glb.toString('utf8', 20, 20 + jsonLen)) as GlbJson
  const binStart = 20 + jsonLen + 8
  const view = (i: number) => {
    const bv = json.bufferViews[i]
    const start = binStart + (bv.byteOffset ?? 0)
    return glb.subarray(start, start + bv.byteLength)
  }
  const floats = (accessor: number, comps: number) => {
    const a = json.accessors[accessor]
    const bytes = view(a.bufferView).subarray(a.byteOffset ?? 0)
    const stride = json.bufferViews[a.bufferView].byteStride ?? comps * 4
    const out: number[][] = []
    for (let i = 0; i < a.count; i++) {
      out.push(Array.from({ length: comps }, (_, c) => bytes.readFloatLE(i * stride + c * 4)))
    }
    return out
  }
  return { json, view, floats }
}

test.describe('AR model builders', () => {
  const widthM = 0.92
  const heightM = 0.73

  test('USDZ is a Quick Look-compatible single textured quad', async () => {
    const jpeg = await testJpeg()
    const buf = Buffer.from(buildPaintingUsdz({ widthM, heightM, jpeg }))
    const entries = readEntries(buf)

    expect(entries.map(e => e.name)).toEqual(['model.usda', 'textures/painting.jpg'])
    for (const e of entries) {
      expect(e.method, `${e.name} must be STORE`).toBe(0)
      expect(e.dataOffset % 64, `${e.name} data offset ${e.dataOffset}`).toBe(0)
    }

    const jpg = entries[1]
    expect(Buffer.compare(buf.subarray(jpg.dataOffset, jpg.dataOffset + jpg.compressedSize), Buffer.from(jpeg))).toBe(0)

    const usdaEntry = entries[0]
    const usda = buf.subarray(usdaEntry.dataOffset, usdaEntry.dataOffset + usdaEntry.compressedSize).toString('utf8')
    expect(usda).toContain('defaultPrim = "Painting"')
    expect(usda).toContain('prepend apiSchemas = ["Preliminary_AnchoringAPI"]')
    expect(usda).toContain('uniform token preliminary:anchoring:type = "plane"')
    expect(usda).toContain('uniform token preliminary:planeAnchoring:alignment = "vertical"')
    expect(usda.match(/def Mesh/g)).toHaveLength(1)
    expect(usda).toContain('point3f[] points = [(-0.46, 0, 0.365), (0.46, 0, 0.365), (0.46, 0, -0.365), (-0.46, 0, -0.365)]')
    expect(usda).toContain('normal3f[] normals = [(0, 1, 0), (0, 1, 0), (0, 1, 0), (0, 1, 0)]')
    expect(usda).toContain('string inputs:varname = "st"')
    expect(usda).not.toContain('token inputs:varname')
  })

  test('USDZ rejects invalid dimensions', () => {
    const jpeg = new Uint8Array([0xff, 0xd8])
    expect(() => buildPaintingUsdz({ widthM: 0, heightM, jpeg })).toThrow()
    expect(() => buildPaintingUsdz({ widthM, heightM: Number.NaN, jpeg })).toThrow()
  })

  test('GLB validates and maps image-top to the top edge', async () => {
    const jpeg = await testJpeg()
    const glb = Buffer.from(await buildPaintingGlb({ widthM, heightM, jpeg }))

    const { json, view, floats } = parseGlb(glb)
    const report = await validateBytes(new Uint8Array(glb), { writeTimestamp: false })
    expect(report.issues.numErrors, JSON.stringify(report.issues.messages)).toBe(0)

    expect(json.meshes).toHaveLength(1)
    expect(json.meshes[0].primitives).toHaveLength(1)
    expect(json.nodes).toHaveLength(1)
    expect(json.nodes[0].rotation).toBeUndefined()

    const attrs = json.meshes[0].primitives[0].attributes
    const pos = floats(attrs.POSITION, 3)
    const uv = floats(attrs.TEXCOORD_0, 2)
    const maxY = Math.max(...pos.map(p => p[1]))
    expect(maxY).toBeCloseTo(heightM / 2, 5)
    expect(Math.max(...pos.map(p => p[0]))).toBeCloseTo(widthM / 2, 5)
    pos.forEach((p, i) => {
      expect(uv[i][1]).toBe(p[1] === maxY ? 0 : 1)
    })

    expect(json.images).toHaveLength(1)
    expect(json.images[0].mimeType).toBe('image/jpeg')
    expect(Buffer.compare(view(json.images[0].bufferView), Buffer.from(jpeg))).toBe(0)
  })
})
