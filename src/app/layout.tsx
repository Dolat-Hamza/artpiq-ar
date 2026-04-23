import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ArtPiq · Place Art in Your Space',
  description: 'Visualise iconic artworks in your space using augmented reality.',
  viewport: 'width=device-width, initial-scale=1.0, user-scalable=no',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="referrer" content="no-referrer-when-downgrade" />
        {/* model-viewer loaded as module script to avoid SSR issues */}
        <script
          type="module"
          src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"
          integrity="sha384-NxrHiuPcsJaRbXc9EoFTt5OZ6WPVqKeDgcnykGs3spXmq0J7hbbGGlyUkrGuoJoA"
          crossOrigin="anonymous"
          async
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
