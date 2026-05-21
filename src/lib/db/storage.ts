// Helpers for the `content-media` bucket — social-post photos, blog covers,
// newsletter inline images. Bucket is public (so iframes / Squarespace embeds
// can render previews) with RLS that only lets an owner write to their own
// `{ownerId}/...` folder. See migration `content_media_bucket`.

import { supabase } from './client'

const BUCKET = 'content-media'
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export class UploadError extends Error {
  code: 'too_large' | 'wrong_type' | 'storage_error'
  constructor(message: string, code: UploadError['code']) {
    super(message)
    this.code = code
  }
}

function validateImage(file: File): void {
  if (file.size > MAX_BYTES) {
    throw new UploadError(`"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB. Max 5 MB.`, 'too_large')
  }
  if (file.type && !ALLOWED_MIME.includes(file.type)) {
    throw new UploadError(`"${file.name}" is ${file.type}. Allowed: JPEG, PNG, WebP, GIF.`, 'wrong_type')
  }
}

function safeExt(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName && /^[a-z0-9]{1,5}$/.test(fromName)) return fromName
  // Fallback from mime
  const fromMime: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }
  return fromMime[file.type] ?? 'jpg'
}

// Upload a single image to `content-media/{ownerId}/{contentId}/{ts}_{rand}.{ext}`.
// Returns the public URL. Throws `UploadError` for validation issues.
export async function uploadContentMedia(
  file: File,
  ownerId: string,
  contentId: string,
): Promise<string> {
  validateImage(file)
  const ext = safeExt(file)
  const stamp = Date.now()
  const rand = Math.random().toString(36).slice(2, 8)
  const path = `${ownerId}/${contentId}/${stamp}_${rand}.${ext}`
  const { error } = await supabase().storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || `image/${ext}`,
  })
  if (error) throw new UploadError(error.message, 'storage_error')
  const { data } = supabase().storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

// Upload a batch in parallel, capping concurrency to 4 to keep TLS handshakes
// reasonable on flaky connections. Returns the results in the same order as
// the input, with `error` populated for failures (so the UI can show a
// per-file status).
export async function uploadContentMediaBatch(
  files: File[],
  ownerId: string,
  contentId: string,
): Promise<Array<{ file: File; url?: string; error?: string }>> {
  const out: Array<{ file: File; url?: string; error?: string }> = files.map(f => ({ file: f }))
  const CONCURRENCY = 4
  let cursor = 0
  async function worker() {
    while (cursor < files.length) {
      const i = cursor++
      try {
        out[i].url = await uploadContentMedia(files[i], ownerId, contentId)
      } catch (e) {
        out[i].error = e instanceof Error ? e.message : String(e)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker))
  return out
}

// Best-effort delete. Storage URLs from getPublicUrl look like
//   https://<project>.supabase.co/storage/v1/object/public/content-media/<path>
// We pull the bucket-relative path back out and feed it to remove().
export async function deleteContentMedia(publicUrl: string): Promise<void> {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx < 0) return
  const path = decodeURIComponent(publicUrl.slice(idx + marker.length))
  if (!path) return
  await supabase().storage.from(BUCKET).remove([path])
}
