// Minimal canvas/DOM polyfill for running three.js GLTFExporter and
// USDZExporter in Node. We don't actually draw anything; we only need the
// exporters' image pipeline to return PNG bytes for each texture.
//
// Strategy: each Texture's `.image` is a tagged object (FakeHTMLImageElement)
// that carries pre-encoded PNG bytes. Our fake canvas + 2D context simply
// remember which image was passed to drawImage(), and `toBlob` returns that
// image's PNG bytes. For DataTexture, three calls `putImageData`, so we
// encode the raw RGBA via sharp on demand.

import sharp from 'sharp'

export class FakeHTMLImageElement {
  width: number
  height: number
  __png: Uint8Array
  constructor(width: number, height: number, png: Uint8Array) {
    this.width = width
    this.height = height
    this.__png = png
  }
}

class FakeImageData {
  data: Uint8ClampedArray
  width: number
  height: number
  constructor(data: Uint8ClampedArray, width: number, height?: number) {
    this.data = data
    this.width = width
    this.height = height ?? Math.floor(data.length / 4 / width)
  }
}

class FakeCanvas {
  width = 0
  height = 0
  private pending: { type: 'image', img: FakeHTMLImageElement } | { type: 'raw', data: Uint8ClampedArray, w: number, h: number } | null = null

  getContext(kind: string) {
    if (kind !== '2d') return null
    const self = this
    return {
      translate() {},
      scale() {},
      drawImage(img: FakeHTMLImageElement) {
        self.pending = { type: 'image', img }
      },
      putImageData(data: FakeImageData) {
        self.pending = { type: 'raw', data: data.data, w: data.width, h: data.height }
      },
      getImageData() {
        // Not used by exporters in our flow.
        return new FakeImageData(new Uint8ClampedArray(self.width * self.height * 4), self.width, self.height)
      },
    }
  }

  async toBlob(cb: (b: Blob) => void, mime = 'image/png') {
    const png = await this.encodePNG()
    // Copy into a fresh ArrayBuffer to avoid SharedArrayBuffer typing.
    const ab = new ArrayBuffer(png.byteLength)
    new Uint8Array(ab).set(png)
    cb(new Blob([ab], { type: mime }))
  }

  // Not used because we only call exporters with { binary: true }.
  toDataURL(_mime?: string) {
    return 'data:image/png;base64,'
  }

  private async encodePNG(): Promise<Uint8Array> {
    if (!this.pending) return new Uint8Array()
    if (this.pending.type === 'image') {
      // Pre-encoded PNG — hand it back untouched. The exporter may have
      // requested a different canvas size, but three never actually resizes
      // our DataTextures in practice (we cap ourselves at decode time).
      return this.pending.img.__png
    }
    // Raw RGBA → PNG via sharp.
    const { data, w, h } = this.pending
    const buf = await sharp(Buffer.from(data.buffer, data.byteOffset, data.byteLength), {
      raw: { width: w, height: h, channels: 4 },
    }).png().toBuffer()
    return new Uint8Array(buf)
  }
}

function install() {
  const g = globalThis as unknown as Record<string, unknown>

  if (typeof g.document === 'undefined') {
    g.document = {
      createElement(tag: string) {
        if (tag === 'canvas') return new FakeCanvas()
        return {}
      },
    }
  }
  if (typeof g.HTMLImageElement === 'undefined') g.HTMLImageElement = FakeHTMLImageElement
  if (typeof g.HTMLCanvasElement === 'undefined') g.HTMLCanvasElement = FakeCanvas
  if (typeof g.ImageData === 'undefined') g.ImageData = FakeImageData
  if (typeof g.FileReader === 'undefined') {
    // Minimal FileReader covering the three.js GLTFExporter calls:
    //   readAsArrayBuffer(blob) + onloadend → result
    //   readAsDataURL(blob) + onloadend → result
    class FakeFileReader {
      onload: ((e: { target: { result: ArrayBuffer | string } }) => void) | null = null
      onloadend: ((e: { target: { result: ArrayBuffer | string } }) => void) | null = null
      result: ArrayBuffer | string | null = null
      readAsArrayBuffer(blob: Blob) {
        blob.arrayBuffer().then((b) => {
          this.result = b
          const ev = { target: { result: b } }
          if (this.onload) this.onload(ev)
          if (this.onloadend) this.onloadend(ev)
        })
      }
      readAsDataURL(blob: Blob) {
        blob.arrayBuffer().then((b) => {
          const s = `data:application/octet-stream;base64,${Buffer.from(b).toString('base64')}`
          this.result = s
          const ev = { target: { result: s } }
          if (this.onload) this.onload(ev)
          if (this.onloadend) this.onloadend(ev)
        })
      }
    }
    g.FileReader = FakeFileReader as unknown as typeof FileReader
  }
  // Blob: Node 18+ provides globalThis.Blob. No override needed.
  // Leave OffscreenCanvas / ImageBitmap undefined — exporters branch happily.
}

// Install immediately on module load. Make sure this module is imported
// BEFORE `three/examples/jsm/exporters/*` is required.
install()

export function installCanvasShim() { install() }
