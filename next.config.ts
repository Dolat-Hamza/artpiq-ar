import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
    ],
  },
  // sharp ships native binaries — keep it external so Vercel serverless
  // functions pick up the platform-specific build at runtime.
  serverExternalPackages: ['sharp'],
}

export default nextConfig
