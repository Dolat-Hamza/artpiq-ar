import { Camera, ImagePlus } from 'lucide-react'

export default function EmptyState({ onCamera, onGallery, loading }:
  { onCamera: () => void; onGallery: () => void; loading: boolean }) {
  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <div className="max-w-[520px] text-center">
        <p className="text-[11px] tracking-[0.18em] uppercase text-ink-muted mb-4">Step one</p>
        <h2 className="font-display text-[36px] md:text-[48px] leading-[1.05] tracking-tight text-ink">
          Show us your <em className="italic text-accent">wall.</em>
        </h2>
        <p className="mt-4 text-[14px] text-ink-muted leading-relaxed">
          Take a straight-on photo of the wall you want to decorate, or pick one from your library. Then drop paintings onto it and arrange freely.
        </p>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            disabled={loading}
            onClick={onCamera}
            className="h-12 bg-accent text-accent-ink text-[14px] flex items-center justify-center gap-2 hover:bg-ink transition-colors disabled:opacity-50"
          >
            <Camera size={16} /> Take a photo
          </button>
          <button
            disabled={loading}
            onClick={onGallery}
            className="h-12 bg-transparent border border-ink text-ink text-[14px] flex items-center justify-center gap-2 hover:bg-ink hover:text-paper transition-colors disabled:opacity-50"
          >
            <ImagePlus size={16} /> Choose from library
          </button>
        </div>
        {loading && (
          <p className="mt-6 text-[12px] text-ink-muted flex items-center justify-center gap-2">
            <span className="inline-block w-3 h-3 border border-ink border-t-transparent rounded-full" style={{ animation: 'sp .7s linear infinite' }} />
            Preparing image…
          </p>
        )}
      </div>
    </div>
  )
}
