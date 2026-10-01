import { zipSync, strToU8, type Zippable } from 'fflate'

export interface PaintingModelInput { widthM: number; heightM: number; jpeg: Uint8Array }

const ZIP_ALIGN = 64
const LOCAL_HEADER_BYTES = 30
const PAD_EXTRA_ID = 12345

export function assertDims({ widthM, heightM }: PaintingModelInput): void {
  if (!Number.isFinite(widthM) || widthM <= 0 || !Number.isFinite(heightM) || heightM <= 0) {
    throw new Error(`Invalid painting dimensions: ${widthM} x ${heightM}`)
  }
}

function fmt(n: number): string {
  const s = n.toFixed(6).replace(/\.?0+$/, '')
  return s === '-0' ? '0' : s
}

function paintingUsda(widthM: number, heightM: number): string {
  const hw = fmt(widthM / 2)
  const hh = fmt(heightM / 2)
  // Quick Look's vertical plane anchor treats +Y as the wall normal with image-top along -Z.
  // USD st (0,0) is the image's lower-left, so top vertices (z = -hh) get v = 1; no JPEG flip.
  return `#usda 1.0
(
    defaultPrim = "Painting"
    metersPerUnit = 1
    upAxis = "Y"
)

def Xform "Painting" (
    prepend apiSchemas = ["Preliminary_AnchoringAPI"]
)
{
    uniform token preliminary:anchoring:type = "plane"
    uniform token preliminary:planeAnchoring:alignment = "vertical"

    def Mesh "Canvas" (
        prepend apiSchemas = ["MaterialBindingAPI"]
    )
    {
        int[] faceVertexCounts = [4]
        int[] faceVertexIndices = [0, 1, 2, 3]
        point3f[] points = [(-${hw}, 0, ${hh}), (${hw}, 0, ${hh}), (${hw}, 0, -${hh}), (-${hw}, 0, -${hh})]
        normal3f[] normals = [(0, 1, 0), (0, 1, 0), (0, 1, 0), (0, 1, 0)] (
            interpolation = "vertex"
        )
        texCoord2f[] primvars:st = [(0, 0), (1, 0), (1, 1), (0, 1)] (
            interpolation = "vertex"
        )
        uniform token subdivisionScheme = "none"
        rel material:binding = </Painting/Materials/Canvas>
    }

    def Scope "Materials"
    {
        def Material "Canvas"
        {
            token outputs:surface.connect = </Painting/Materials/Canvas/Surface.outputs:surface>

            def Shader "Surface"
            {
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor.connect = </Painting/Materials/Canvas/Texture.outputs:rgb>
                float inputs:roughness = 0.9
                float inputs:metallic = 0
                token outputs:surface
            }

            def Shader "Reader"
            {
                uniform token info:id = "UsdPrimvarReader_float2"
                string inputs:varname = "st"
                float2 outputs:result
            }

            def Shader "Texture"
            {
                uniform token info:id = "UsdUVTexture"
                asset inputs:file = @textures/painting.jpg@
                float2 inputs:st.connect = </Painting/Materials/Canvas/Reader.outputs:result>
                token inputs:sourceColorSpace = "sRGB"
                token inputs:wrapS = "clamp"
                token inputs:wrapT = "clamp"
                float3 outputs:rgb
            }
        }
    }
}
`
}

// USDZ requires STORE entries whose data starts on 64-byte boundaries; pad via the extra field.
function alignedZip(files: [string, Uint8Array][]): Uint8Array {
  const zippable: Zippable = {}
  let offset = 0
  for (const [name, data] of files) {
    const nameLen = strToU8(name).length
    const base = offset + LOCAL_HEADER_BYTES + nameLen
    if (base % ZIP_ALIGN === 0) {
      zippable[name] = data
      offset = base + data.length
    } else {
      const padLen = (ZIP_ALIGN - ((base + 4) % ZIP_ALIGN)) % ZIP_ALIGN
      zippable[name] = [data, { extra: { [PAD_EXTRA_ID]: new Uint8Array(padLen) } }]
      offset = base + 4 + padLen + data.length
    }
  }
  return zipSync(zippable, { level: 0 })
}

export function buildPaintingUsdz(input: PaintingModelInput): Uint8Array {
  assertDims(input)
  const usda = strToU8(paintingUsda(input.widthM, input.heightM))
  return alignedZip([
    ['model.usda', usda],
    ['textures/painting.jpg', input.jpeg],
  ])
}
