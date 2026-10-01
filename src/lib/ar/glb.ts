import { Document, NodeIO, Primitive } from '@gltf-transform/core'
import { assertDims, type PaintingModelInput } from './usdz'

export async function buildPaintingGlb(input: PaintingModelInput): Promise<Uint8Array> {
  assertDims(input)
  const hw = input.widthM / 2
  const hh = input.heightM / 2

  const doc = new Document()
  const buffer = doc.createBuffer()

  const position = doc.createAccessor('position')
    .setType('VEC3')
    .setArray(new Float32Array([-hw, -hh, 0, hw, -hh, 0, hw, hh, 0, -hw, hh, 0]))
    .setBuffer(buffer)
  const normal = doc.createAccessor('normal')
    .setType('VEC3')
    .setArray(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]))
    .setBuffer(buffer)
  // glTF uv (0,0) is the image's upper-left, so top vertices get v = 0; no JPEG flip.
  const uv = doc.createAccessor('uv')
    .setType('VEC2')
    .setArray(new Float32Array([0, 1, 1, 1, 1, 0, 0, 0]))
    .setBuffer(buffer)
  const indices = doc.createAccessor('indices')
    .setType('SCALAR')
    .setArray(new Uint16Array([0, 1, 2, 0, 2, 3]))
    .setBuffer(buffer)

  const texture = doc.createTexture('painting').setImage(input.jpeg).setMimeType('image/jpeg')
  const material = doc.createMaterial('painting')
    .setBaseColorTexture(texture)
    .setRoughnessFactor(1)
    .setMetallicFactor(0)
    .setDoubleSided(false)

  const primitive = doc.createPrimitive()
    .setMode(Primitive.Mode.TRIANGLES)
    .setAttribute('POSITION', position)
    .setAttribute('NORMAL', normal)
    .setAttribute('TEXCOORD_0', uv)
    .setIndices(indices)
    .setMaterial(material)
  const mesh = doc.createMesh('painting').addPrimitive(primitive)
  const node = doc.createNode('painting').setMesh(mesh)
  const scene = doc.createScene('painting').addChild(node)
  doc.getRoot().setDefaultScene(scene)

  return new NodeIO().writeBinary(doc)
}
