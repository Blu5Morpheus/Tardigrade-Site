/**
 * Read a build-time env var with a fallback. Astro exposes `import.meta.env`
 * in components, but only `PUBLIC_*` vars survive into the client bundle.
 * Both `PUBLIC_*` and unprefixed forms are checked so this works in
 * `astro build` as well as plain Node/SSR contexts.
 */
const env = (key: string, fallback: string): string => {
  const e = import.meta.env as Record<string, string | undefined>;
  return e[`PUBLIC_${key}`] ?? e[key] ?? fallback;
};

export const SITE = {
  name: 'Tardigrade Innovation',
  /**
   * The site's canonical URL. Currently `tardigrade-site.onrender.com`;
   * post-migration it flips to `portfolio-lab-v05x.onrender.com` once
   * the Render service that owns that hostname is converted from the
   * Streamlit web service to this Astro static site.
   *
   * Override at build time with `PUBLIC_SITE_URL=https://example.com`.
   */
  url: env('SITE_URL', 'https://tardigrade-site.onrender.com'),
  description:
    'An independent research lab building quantum machine learning, gravitational-wave detection pipelines, and physics-constrained embodied AI.',
  author: 'Raven Roberts',
  callsign: 'KN4ABK',
  location: 'Newport, Tennessee',
  email: 'ravenroberts@tardigradeinnovation.com',
  emailDisplay: 'ravenroberts [at] tardigradeinnovation.com',
} as const;

/**
 * Master switch for shop visibility.
 * - false: shop link hidden in nav, /shop renders cosmic-dust gate, all
 *          product detail pages 404, "Available" section on homepage
 *          replaced with "Coming soon" placeholder.
 * - true:  shop is fully live (do not flip until Stripe Payment Links
 *          are configured on each product entry).
 */
export const SHOP_LIVE = false;

/**
 * Streamlit demo host. The public Streamlit instance is currently at
 * `portfolio-lab-v05x.onrender.com` (the original lab deployment). At
 * migration time the lab moves to a new hostname and this value flips.
 *
 * Override at build time with
 *   `PUBLIC_STREAMLIT_HOST=https://tardigrade-lab.onrender.com`
 * (no trailing slash).
 */
export const STREAMLIT_HOST = env(
  'STREAMLIT_HOST',
  'https://portfolio-lab-v05x.onrender.com',
);

/**
 * Formspree form IDs. See LAUNCH_CHECKLIST.md.
 * One Formspree form is used for all three submission types — the hidden
 * `_subject` field on each form distinguishes them in the inbox.
 */
export const FORMSPREE_IDS = {
  shopNotify: 'mkoyrezo',
  preprintNotify: 'mkoyrezo',
  contact: 'mkoyrezo',
} as const;
