/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: 'var(--ink)', 2: 'var(--ink-2)', 3: 'var(--ink-3)' },
        bone: { DEFAULT: 'var(--bone)', dim: 'var(--bone-dim)', faint: 'var(--bone-faint)' },
        phosphor: { DEFAULT: 'var(--phosphor)', dark: 'var(--phosphor-d)' },
        rust: 'var(--rust)',
        amber: 'var(--amber)',
        rule: 'var(--rule)',
      },
      fontFamily: {
        display: ['Fraunces', 'Times New Roman', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        ui: ['Inter Tight', 'system-ui', 'sans-serif'],
      },
      maxWidth: { wrap: '1380px' },
    },
  },
  plugins: [],
};
