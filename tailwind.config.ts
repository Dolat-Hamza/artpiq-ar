import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Semantic (used across components)
        paper: '#FFFFFF',
        ink: '#1E293B',
        'ink-muted': '#475569',          // bumped from #64748B for AA on small text
        'ink-soft': '#94A3B8',
        line: '#E2E8F0',
        'line-strong': '#CBD5E1',
        accent: '#2563EB',
        'accent-soft': '#DBEAFE',
        'accent-ink': '#FFFFFF',
        surface: '#F8FAFC',

        // ArtPlacer-style surfaces
        'surface-stage': '#EDEDEA',
        'surface-dock': '#141414',
        'on-dock': '#F4F4F0',
        'on-dock-muted': '#A8A8A0',

        // Status pill colors
        'pill-sale': '#10B981',
        'pill-sold': '#94A3B8',
        'pill-reserved': '#F59E0B',
        'pill-rented': '#8B5CF6',

        // Brand primitives (kept for legacy usage)
        mist: '#FFFFFF',
        obsidian: '#F1F5F9',
        indigo: '#3B82F6',
        'indigo-light': '#93C5FD',
        cyan: '#BAE6FD',

        'slate-50':  '#F8FAFC',
        'slate-100': '#F1F5F9',
        'slate-200': '#E2E8F0',
        'slate-400': '#94A3B8',
        'slate-500': '#64748B',
        'slate-600': '#475569',
        'slate-700': '#334155',
      },
      fontFamily: {
        display: ['var(--font-sans)', 'Plus Jakarta Sans', 'sans-serif'],
        sans: ['var(--font-sans)', 'Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      fontSize: {
        meta:  ['11px', { lineHeight: '14px', letterSpacing: '0.18em' }],
        label: ['12px', { lineHeight: '16px', letterSpacing: '0.04em' }],
        body:  ['14px', { lineHeight: '20px' }],
        h3:    ['20px', { lineHeight: '24px', letterSpacing: '-0.01em' }],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.06)',
        pop:  '0 8px 24px rgba(15,23,42,0.18)',
        dock: '0 -8px 24px rgba(0,0,0,0.18)',
        focus: '0 0 0 2px rgba(37,99,235,0.50)',
      },
      borderRadius: {
        xs: '2px',
        sm: '4px',
        md: '6px',
        lg: '10px',
      },
      spacing: {
        touch: '44px',
      },
      transitionTimingFunction: {
        snap: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      maxWidth: {
        content: '1440px',
      },
    },
  },
  plugins: [],
}

export default config
