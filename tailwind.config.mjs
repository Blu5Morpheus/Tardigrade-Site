/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        // Cybergothic palette
        bg: {
          deep: 'var(--bg-deep)',
          panel: 'var(--bg-panel)',
          elevated: 'var(--bg-elevated)',
        },
        violet: {
          deep: 'var(--violet-deep)',
          mid: 'var(--violet-mid)',
          bright: 'var(--violet-bright)',
          glow: 'var(--violet-glow)',
          pale: 'var(--violet-pale)',
        },
        magenta: { glow: 'var(--magenta-glow)' },
        pink: { soft: 'var(--pink-soft)' },
        mint: {
          rim: 'var(--mint-rim)',
          bright: 'var(--mint-bright)',
        },
        // Legacy aliases — same Tailwind shapes, remapped values via CSS vars
        ink: { DEFAULT: 'var(--ink)', 2: 'var(--ink-2)', 3: 'var(--ink-3)' },
        bone: { DEFAULT: 'var(--bone)', dim: 'var(--bone-dim)', faint: 'var(--bone-faint)' },
        phosphor: { DEFAULT: 'var(--phosphor)', dark: 'var(--phosphor-d)' },
        rust: 'var(--rust)',
        amber: 'var(--amber)',
        rule: 'var(--rule)',
      },
      fontFamily: {
        display: ['UnifrakturCook', 'Fraunces', 'Times New Roman', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        ui: ['Inter Tight', 'Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: { wrap: '1380px' },
    },
  },
  plugins: [],
};
