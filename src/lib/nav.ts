import { SHOP_LIVE } from './config';

export const NAV_ITEMS = [
  { href: '/lab', label: 'Lab' },
  { href: '/builds', label: 'Builds' },
  { href: '/chat', label: 'Ask' },
  { href: '/research', label: 'Research' },
  ...(SHOP_LIVE ? [{ href: '/shop', label: 'Shop' }] : []),
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];
