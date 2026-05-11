import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 64, height: 64 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#2563EB',
          borderRadius: 14,
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
            fontSize: 44,
            fontWeight: 700,
            letterSpacing: -2,
            lineHeight: 1,
            marginTop: -2,
          }}
        >
          a
        </span>
        {/* Brand chip — small white square bottom-right */}
        <div
          style={{
            position: 'absolute',
            right: 8,
            bottom: 8,
            width: 10,
            height: 10,
            background: '#FFFFFF',
            borderRadius: 2,
            opacity: 0.95,
          }}
        />
      </div>
    ),
    { ...size },
  )
}
