import type React from 'react'

type ModelViewerElement = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement>,
  HTMLElement
> & {
  src?: string
  'ios-src'?: string
  ar?: boolean | string
  'ar-modes'?: string
  'ar-placement'?: string
  'ar-scale'?: string
  'camera-controls'?: boolean | string
  'shadow-intensity'?: string
  exposure?: string
  'tone-mapping'?: string
  'interpolation-decay'?: string
  style?: React.CSSProperties
  onLoad?: (e: Event) => void
  onError?: (e: Event) => void
  ref?: React.Ref<HTMLElement>
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerElement
    }
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerElement
    }
  }
}
