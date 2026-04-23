import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Semantic (used across components)
        paper: '#F8FAFC',
        ink: '#0A0E1A',
        'ink-muted': '#64748B',
        line: '#E2E8F0',
        accent: '#6366F1',
        'accent-ink': '#FFFFFF',
        surface: '#FFFFFF',

        // Brand primitives
        mist: '#F8FAFC',
        obsidian: '#0A0E1A',
        indigo: '#6366F1',
        'indigo-light': '#818CF8',
        cyan: '#06B6D4',

        // Slate scale
        'slate-50':  '#F8FAFC',
        'slate-100': '#F1F5F9',
        'slate-200': '#E2E8F0',
        'slate-400': '#94A3B8',
        'slate-500': '#64748B',
        'slate-700': '#334155',
      },
      fontFamily: {
        display: ['var(--font-sans)', 'Plus Jakarta Sans', 'sans-serif'],
        sans: ['var(--font-sans)', 'Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      maxWidth: {
        content: '1440px',
      },
    },
  },
  plugins: [],
}

export default config
