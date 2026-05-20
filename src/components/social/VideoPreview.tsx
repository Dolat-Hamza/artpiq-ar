'use client'

/**
 * Renders an inline playable preview for a video URL.
 *  - youtube.com / youtu.be → privacy-enhanced iframe (no-cookie host)
 *  - vimeo.com → player.vimeo.com iframe
 *  - direct mp4/webm/mov → native <video controls>
 *  - anything else → simple "Open in new tab" link fallback
 */
export default function VideoPreview({ url }: { url: string }) {
  const u = url.trim()
  if (!u) return null

  // YouTube — strip the v= or short-form ID, embed.
  const yt = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{6,})/)
  if (yt) {
    return (
      <div className="mt-2 aspect-video w-full max-w-[480px] bg-black rounded-sm overflow-hidden border border-line">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${yt[1]}`}
          title="YouTube preview"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    )
  }

  // Vimeo
  const vm = u.match(/vimeo\.com\/(\d+)/)
  if (vm) {
    return (
      <div className="mt-2 aspect-video w-full max-w-[480px] bg-black rounded-sm overflow-hidden border border-line">
        <iframe
          src={`https://player.vimeo.com/video/${vm[1]}`}
          title="Vimeo preview"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    )
  }

  // Direct video file
  if (/\.(mp4|webm|mov)(\?|$)/i.test(u)) {
    return (
      <video
        src={u}
        controls
        playsInline
        className="mt-2 w-full max-w-[480px] rounded-sm border border-line bg-black"
      />
    )
  }

  // Unknown — link only.
  return (
    <a
      href={u}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block mt-2 text-meta uppercase tracking-[0.12em] text-accent underline"
    >
      Open video in new tab →
    </a>
  )
}
