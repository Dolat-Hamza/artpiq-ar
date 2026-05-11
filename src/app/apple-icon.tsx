import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#2563EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        <span
          style={{
            color: '#FFFFFF',
            fontSize: 128,
            fontWeight: 700,
            letterSpacing: -6,
            lineHeight: 1,
            marginTop: -6,
          }}
        >
          a
        </span>
        <div
          style={{
            position: 'absolute',
            right: 24,
            bottom: 24,
            width: 28,
            height: 28,
            background: '#FFFFFF',
            borderRadius: 4,
            opacity: 0.95,
          }}
        />
      </div>
    ),
    { ...size },
  )
}
