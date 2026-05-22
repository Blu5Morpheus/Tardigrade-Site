import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

import react from '@astrojs/react';

// Canonical site URL for sitemap.xml + og/canonical tags. Override at
// build time with PUBLIC_SITE_URL when migrating between Render
// hostnames (see src/lib/config.ts).
const SITE_URL =
  process.env.PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  'https://tardigrade-site.onrender.com';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  integrations: [tailwind({ applyBaseStyles: false }), mdx(), sitemap(), react()],
  build: {
    assets: '_astro',
  },
  vite: {
    ssr: {
      noExternal: [
        '@fontsource/unifrakturcook',
        '@fontsource/jetbrains-mono',
        '@fontsource/inter-tight',
      ],
    },
  },
});