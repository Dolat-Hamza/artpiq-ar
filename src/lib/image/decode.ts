import { loadImage } from './loadImage'

export function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    p.then(v => { clearTimeout(t); resolve(v) }, e => { clearTimeout(t); reject(e) })
  })
}

// Convert HEIC → JPEG Blob if needed. Returns the same File otherwise.
export async function normalizeToBlob(file: File): Promise<Blob> {
  const name = file.name.toLowerCase()
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif'
    || name.endsWith('.heic') || name.endsWith('.heif')
  if (!isHeic) return file
  const mod = await import('heic2any')
  const out = await withTimeout(
    mod.default({ blob: file, toType: 'image/jpeg', quality: 0.95 }) as Promise<Blob | Blob[]>,
    20000,
    'HEIC conversion',
  )
  return Array.isArray(out) ? out[0] : out
}

// Decode Blob → ImageBitmap with EXIF orientation honored. Falls back to <img>.
export async function decodeBitmap(blob: Blob): Promise<{ width: number; height: number; bitmap?: ImageBitmap; url: string }> {
  const url = URL.createObjectURL(blob)
  if (typeof createImageBitmap === 'function') {
    try {
      // imageOrientation: 'from-image' applies EXIF rotation so portraits stay portrait.
      const bitmap = await withTimeout(
        createImageBitmap(blob, { imageOrientation: 'from-image' as ImageOrientation }),
        15000,
        'Image decode',
      )
      return { width: bitmap.width, height: bitmap.height, bitmap, url }
    } catch {/* fall through */}
  }
  const img = await withTimeout(loadImage(url), 15000, 'Image decode')
  return { width: img.naturalWidth, height: img.naturalHeight, url }
}
