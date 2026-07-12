// apps/maine-cannabis/src/lib/page-route-family.ts
//
// MDG-ANALYTICS-001 Ticket 006 Surface A — route_family resolver.
//
// Used by Layout.astro to set data-page-type on <body>. The heuristic
// duplicates the classifier in scripts/analytics/page-manifest-build.cjs
// so Layout can compute the same route_family at SSR/SSG time without
// reading the JSONL file at runtime.
//
// Keep this module small and synchronous — it's imported into Astro frontmatter.
// Edits here should also update the build script's classify() for consistency.

export type RouteFamily =
  | 'city_guide'
  | 'operator_profile'
  | 'long_form_guide'
  | 'editorial_blog'
  | 'hub'
  | 'directory'
  | 'calculator'
  | 'data_product'
  | 'conversion_asset'
  | 'other';

const V04_MISMATCH_SLUGS = new Set([
  'portland-dispensary-guide',
  'old-orchard-beach-dispensary-guide',
  'casco-dispensary-guide',
]);

const CITY_GUIDE_RE = /-dispensary-guide\.astro$/;
const OPERATOR_RE = /(?:^|-)(cannabis|cann|dispensary|medco|weed|herb|greens|healing|farmacy|grow|puffin|hemp|botany|apoteka|company)(\.astro)?$/i;
const KNOWN_OPERATOR_SLUGS = new Set([
  '420-mules-bar-harbor',
  'bayside-bud-shack',
  'healing-community-medco-gardiner',
  'botany-cannabis',
  'great-atlantic-puffin-company',
  'lifted-cannabis-maine',
  'lakewood-cannabis',
  'highbrow-cannabis',
  'high-road-gray',
  'just-baked-maine-lincoln',
  'the-glass-cook-fryeburg',
  'white-mountain-craft-cannabis',
  'hidden-greens-dispensary',
  'founding-farmers-dispensary',
]);
const HUB_SLUGS = new Set([
  'greater-portland-sebago-lakes-cannabis-guide',
  'downeast-acadia-aroostook-cannabis-guide',
  'midcoast-waldo-northern-maine-cannabis-guide',
  'southern-maine-york-county-cannabis-guide',
]);
const CALCULATOR_SLUGS = new Set([
  'maine-cannabis-tax-calculator',
  'roi-calculator',
  'cannabis-edible-dose-calculator-maine',
]);
const DATA_PRODUCT_SLUGS = new Set([
  'market-pulse-2026',
  'market-stats',
  'glossary',
]);
const CONVERSION_ASSET_SLUGS = new Set([
  'launch-checklist',
  'download-checklist',
  'newsletter',
  'contact',
]);

/**
 * Compute the route_family for a given URL pathname.
 *
 * @param pathname - Astro.url.pathname (always begins with "/")
 * @returns a route_family from the closed vocabulary above
 */
export function routeFamilyFor(pathname: string): RouteFamily {
  if (pathname === '/404' || pathname === '/404') return 'other';

  // Top-level routes (no sub-path)
  if (pathname === '/' || pathname === '') return 'hub';
  if (pathname === '/guides' || pathname === '/guides/') return 'directory';
  if (pathname === '/find-a-dispensary') return 'directory';
  if (pathname === '/directory') return 'directory';
  if (pathname === '/search') return 'other';
  if (pathname === '/blog' || pathname === '/blog/') return 'hub';

  // Admin: noindex, exclude from analytics
  if (pathname.startsWith('/admin/')) return 'other';

  // Blog posts under /blog/*
  if (pathname.startsWith('/blog/')) return 'editorial_blog';

  // Founders and about
  if (pathname.startsWith('/founders/') || pathname === '/about' || pathname.startsWith('/about/')) {
    return 'long_form_guide';
  }

  // Slug-based classification for guides and other things
  const slug = pathname.split('/').pop() ?? '';
  const file = `${slug}.astro`; // files have .astro suffixes in our build script's view

  if (CALCULATOR_SLUGS.has(slug)) return 'calculator';
  if (DATA_PRODUCT_SLUGS.has(slug)) return 'data_product';
  if (CONVERSION_ASSET_SLUGS.has(slug)) return 'conversion_asset';
  if (HUB_SLUGS.has(slug)) return 'hub';
  if (CITY_GUIDE_RE.test(file)) return 'city_guide';
  if (KNOWN_OPERATOR_SLUGS.has(slug) || (OPERATOR_RE.test(file) && !CITY_GUIDE_RE.test(file))) {
    return 'operator_profile';
  }
  return 'long_form_guide';
}

/**
 * Convenience: data-page-type attribute value, derived from pathname.
 * Returns null for admin/noindex/exclusion paths so Layout can omit the
 * attribute cleanly.
 */
export function dataPageTypeFor(pathname: string): string | null {
  if (pathname.startsWith('/admin/')) return null;
  return routeFamilyFor(pathname);
}
