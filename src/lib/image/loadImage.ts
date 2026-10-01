export function loadImage(src: string, opts: { cors?: boolean } = {}): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (opts.cors) img.crossOrigin = 'anonymous'
    img.referrerPolicy = 'no-referrer'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`load failed: ${src}`))
    img.src = src
  })
}

// A blob URL is same-origin, so drawing it never taints a canvas export.
export async function loadImageForCanvas(url: string): Promise<HTMLImageElement> {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(res.statusText)
    return await loadImage(URL.createObjectURL(await res.blob()))
  } catch {
    return loadImage(url, { cors: true })
  }
}
