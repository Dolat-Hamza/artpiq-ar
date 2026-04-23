import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg:     '#0c0c0c',
        s1:     '#181818',
        s2:     '#232323',
        border: '#2c2c2c',
        text:   '#f0ece6',
        muted:  '#888888',
        accent: '#c8a96e',
      },
      borderRadius: { DEFAULT: '12px' },
      boxShadow: { art: '0 12px 48px rgba(0,0,0,0.6)' },
    },
  },
  plugins: [],
}

export default config
