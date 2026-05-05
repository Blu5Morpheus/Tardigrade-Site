import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://portfolio-lab-v05x.onrender.com',
  integrations: [
    tailwind({ applyBaseStyles: false }),
    mdx(),
    sitemap(),
  ],
  build: {
    assets: '_astro',
  },
  vite: {
    ssr: {
      noExternal: ['@fontsource-variable/fraunces', '@fontsource/jetbrains-mono', '@fontsource/inter-tight'],
    },
  },
});
