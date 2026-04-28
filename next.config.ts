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
    ]
  },
}

export default nextConfig
