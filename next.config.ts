import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  // sharp ships native binaries — keep it external so Vercel serverless
  // functions pick up the platform-specific build at runtime.
  serverExternalPackages: ['sharp'],

  async rewrites() {
    return [
      // iOS Quick Look fires only when the anchor href ends in `.usdz` AND
      // the response is `model/vnd.usdz+zip`. Android Scene Viewer is more
      // forgiving but a clean `.glb` extension never hurts. The actual
      // handlers live under /api/ar/<type>/<id> and negotiate via ?format=;
      // these rewrites stick a real extension on the public URL.
      //
      // Path: /ar/<id>.usdz  →  /api/ar/painting/<id>?format=usdz
      //       /ar/<id>.glb   →  /api/ar/painting/<id>?format=glb
      //       /ar/sculpture/<id>.usdz → /api/ar/sculpture/<id>?format=usdz
      //       /ar/sculpture/<id>.glb  → /api/ar/sculpture/<id>?format=glb
      //
      // Listed before /ar/<id> page so they intercept the request.
      { source: '/ar/sculpture/:id.usdz', destination: '/api/ar/sculpture/:id?format=usdz' },
      { source: '/ar/sculpture/:id.glb',  destination: '/api/ar/sculpture/:id?format=glb'  },
      { source: '/ar/:id.usdz', destination: '/api/ar/painting/:id?format=usdz' },
      { source: '/ar/:id.glb',  destination: '/api/ar/painting/:id?format=glb'  },
    ]
  },

  async headers() {
    return [
      {
        // /embed/* must be iframeable from Squarespace + any partner site.
        // Drop legacy X-Frame-Options and use permissive CSP frame-ancestors.
        source: '/embed/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: "frame-ancestors *;" },
        ],
      },
      {
        // /ar/<id> — QR-scan landing for a single artwork. Same iframe
        // policy as /embed so partner gallery sites can drop the AR CTA in
        // a frame next to product listings if they want.
        source: '/ar/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: "frame-ancestors *;" },
        ],
      },
      {
        // Public submit endpoints used by /embed/newsletter.js and embedded
        // lead-capture forms. Permissive CORS so the script POSTs from any
        // origin (Squarespace, partner sites). Rate-limited in the route.
        source: '/api/(subscribe|leads)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },
    ]
  },
}

export default nextConfig
