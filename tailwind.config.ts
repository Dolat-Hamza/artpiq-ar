import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Semantic (used across components) — minimal white / light-blue / light-grey
        paper: '#FFFFFF',
        ink: '#1E293B',
        'ink-muted': '#64748B',
        line: '#E2E8F0',
        accent: '#3B82F6',
        'accent-soft': '#DBEAFE',
        'accent-ink': '#FFFFFF',
        surface: '#F8FAFC',

        // Brand primitives
        mist: '#FFFFFF',
        obsidian: '#F1F5F9',
        indigo: '#3B82F6',
        'indigo-light': '#93C5FD',
        cyan: '#BAE6FD',

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
