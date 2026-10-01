'use client'
import { useEffect } from 'react'

const MODEL_VIEWER_SRC = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@4.3.1/dist/model-viewer.min.js'

interface Props {
  src: string
  className?: string
  poster?: string
}

function ensureModelViewer() {
  if (document.querySelector('script[data-model-viewer]')) return
  const s = document.createElement('script')
  s.type = 'module'
  s.src = MODEL_VIEWER_SRC
  s.dataset.modelViewer = '1'
  document.head.appendChild(s)
}

export default function ModelViewer({ src, className, poster }: Props) {
  useEffect(ensureModelViewer, [])

  return (
    <model-viewer
      src={src}
      className={className}
      {...(poster ? { poster } : {})}
      camera-controls
      auto-rotate
      shadow-intensity="0.6"
      exposure="1"
      style={{ width: '100%', height: '100%' }}
    />
  )
}
