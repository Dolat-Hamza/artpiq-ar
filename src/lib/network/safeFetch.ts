export type UrlSafetyCheck = (url: URL) => Promise<boolean>
export type ManualFetcher = (url: URL) => Promise<Response>

export async function fetchWithValidatedRedirects(
  initialUrl: URL,
  isAllowed: UrlSafetyCheck,
  fetcher: ManualFetcher,
  maxRedirects = 3,
): Promise<Response> {
  let current = initialUrl

  for (let redirects = 0; ; redirects += 1) {
    if (!(await isAllowed(current))) {
      throw new Error('Upstream URL is not allowed')
    }

    const response = await fetcher(current)
    if (response.status < 300 || response.status >= 400) return response

    const location = response.headers.get('location')
    if (!location) throw new Error('Upstream redirect has no location')
    if (redirects >= maxRedirects) throw new Error('Too many redirects')
    current = new URL(location, current)
  }
}

export async function readResponseBodyLimited(
  response: Response,
  maxBytes: number,
): Promise<ArrayBuffer> {
  const declaredLength = Number(response.headers.get('content-length') || 0)
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error('Upstream image is too large')
  }

  if (!response.body) return new ArrayBuffer(0)

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxBytes) throw new Error('Upstream image is too large')
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const output = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.byteLength
  }
  return output.buffer
}
