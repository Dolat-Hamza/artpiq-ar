import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // ArtPlacer LAYOUT/SHAPE, our COLORS (white + indigo)
        paper: '#FFFFFF',
        bg: '#FAFAFA',                // ArtPlacer body bg
        ink: '#1E293B',
        'ink-soft': '#475569',
        'ink-muted': '#64748B',
        line: '#F2F2F2',              // ArtPlacer border
        'line-strong': '#E5E5E5',
        accent: '#2563EB',            // our indigo (kept)
        'accent-soft': '#DBEAFE',
        'accent-ink': '#FFFFFF',
        'accent-2': '#1EAC99',        // SMART badge teal
        surface: '#F6F6F6',

        // Composer surfaces (kept for SampleRoom dock + stage)
        'surface-stage': '#EDEDEA',
        'surface-dock': '#141414',
        'on-dock': '#F4F4F0',
        'on-dock-muted': '#A8A8A0',

        // Status pill colors
        'pill-sale': '#10B981',
        'pill-sold': '#94A3B8',
        'pill-reserved': '#F59E0B',
        'pill-rented': '#8B5CF6',

        // Brand primitives (legacy — kept to avoid breakage)
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
        // PT Sans matches ArtPlacer body type exactly
        sans: ['var(--font-pt-sans)', 'PT Sans', '-apple-system', 'sans-serif'],
        display: ['var(--font-pt-sans)', 'PT Sans', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        meta:  ['10px', { lineHeight: '14px', letterSpacing: '0.10em' }],
        label: ['11px', { lineHeight: '15px', letterSpacing: '0.04em' }],
        body:  ['13px', { lineHeight: '18px' }],
        h3:    ['20px', { lineHeight: '26px', letterSpacing: '0' }],
        h2:    ['24px', { lineHeight: '30px', letterSpacing: '-0.005em' }],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.04)',
        pop:  '0 8px 24px rgba(0,0,0,0.10)',
        dock: '0 -8px 24px rgba(0,0,0,0.18)',
        focus: '0 0 0 2px rgba(224,35,60,0.50)',
      },
      borderRadius: {
        xs: '2px',
        sm: '4px',
        md: '6px',
        lg: '10px',
      },
      spacing: {
        touch: '44px',
        sidebar: '232px',
        'sidebar-collapsed': '60px',
        'topbar': '56px',
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
