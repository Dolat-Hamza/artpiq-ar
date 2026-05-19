import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Inter_Tight, PT_Sans } from 'next/font/google'
import './globals.css'

// Body sans — Inter Tight reads cleaner than PT Sans, especially in tables.
const body = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

// Display serif — Cormorant Garamond gives the editorial / monograph feel.
const display = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
})

// Legacy PT Sans variable kept so older inline references (--font-pt-sans)
// fall back gracefully during the visual refresh rollout.
const sans = PT_Sans({
  subsets: ['latin'],
  variable: '--font-pt-sans',
  display: 'swap',
  weight: ['400', '700'],
})

export const metadata: Metadata = {
  title: 'ArtPiq — Live with great paintings',
  description: 'Place masterworks on your wall in augmented reality, or compose your own gallery on a photo.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Allow user-scaling for accessibility (was: maximumScale: 1)
  themeColor: '#FFFFFF',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${body.variable} ${display.variable}`}>
      <head>
        <meta name="referrer" content="no-referrer-when-downgrade" />
        {/* model-viewer script moved to ARLauncher (lazy-load only when AR opened) */}
      </head>
      <body>
        <noscript>
          <div style={{ padding: 24, textAlign: 'center', fontFamily: 'sans-serif' }}>
            artpiq requires JavaScript. Please enable it to compose mockups and browse the gallery.
          </div>
        </noscript>
        {children}
      </body>
    </html>
  )
}
