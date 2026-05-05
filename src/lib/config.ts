export const SITE = {
  name: 'Tardigrade Innovation',
  url: 'https://portfolio-lab-v05x.onrender.com',
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
 * Streamlit demo host. The public Streamlit instance currently at
 * portfolio-lab-v05x; will move to a subdomain when the Astro site
 * takes over the main URL.
 */
export const STREAMLIT_HOST = 'https://lab-portfolio-lab-v05x.onrender.com';

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
