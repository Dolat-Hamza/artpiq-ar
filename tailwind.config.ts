import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Editorial Monograph palette — warm cream paper, deep ink, burnt-ochre accent
        paper: '#FAF8F3',             // primary surface (warm cream)
        'paper-elev': '#FFFFFF',      // drawers / modals (slight lift)
        bg: '#F2EDDF',                // page chrome / sidebar (deeper cream)
        ink: '#14181C',
        'ink-soft': '#34383D',
        'ink-muted': '#7C8189',
        line: '#D8D2C5',              // warm hairline divider
        'line-strong': '#BFB8A6',
        rule: '#D8D2C5',              // explicit alias for the warm rule
        accent: '#B45309',            // burnt ochre
        'accent-soft': '#FEF3E2',
        'accent-ink': '#FFFFFF',
        'accent-2': '#3D5A3D',        // gallery moss (secondary)
        surface: '#EEE9DA',

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
        // Editorial Monograph stack
        sans:    ['var(--font-body)', 'Inter Tight', '-apple-system', 'sans-serif'],
        display: ['var(--font-display)', 'Cormorant Garamond', 'Times New Roman', 'serif'],
        body:    ['var(--font-body)', 'Inter Tight', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        meta:  ['10px', { lineHeight: '14px', letterSpacing: '0.10em' }],
        label: ['11px', { lineHeight: '15px', letterSpacing: '0.04em' }],
        body:  ['13px', { lineHeight: '19px' }],
        h3:    ['22px', { lineHeight: '28px', letterSpacing: '0' }],
        h2:    ['30px', { lineHeight: '36px', letterSpacing: '-0.01em' }],
        h1:    ['44px', { lineHeight: '50px', letterSpacing: '-0.015em' }],
      },
      boxShadow: {
        // Almost-zero ink — depth comes from paper-vs-paper-elev contrast
        card: '0 1px 0 rgba(20, 24, 28, 0.04)',
        pop:  '0 6px 24px rgba(20, 24, 28, 0.06)',
        dock: '0 -8px 24px rgba(0, 0, 0, 0.18)',
        focus: '0 0 0 2px rgba(180, 83, 9, 0.50)',
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
