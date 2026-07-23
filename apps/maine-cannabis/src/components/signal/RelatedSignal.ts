// =============================================================================
// src/components/signal/RelatedSignal.ts
//
// Pure builder for the "Related MDG content" rail that links from a Signal
// research page back into the canonical Maine Dispensary Guide surfaces —
// the per-city dispensary guide (when one exists), the opt-in tracker, the
// OCP license map, find-a-dispensary, market-stats, and the "How many
// dispensaries" blog post. This is the load-bearing fix for dark-spot #3
// in the 2026-07-23 self-critique: /signal/ was orphaned because every
// internal link targeted another /signal/ URL or a fictional methodology
// page, so search engines and operators could never find a way back into
// the canonical MDG content.
//
// Pure function — no Astro, no DOM, no fetch. Consumed by
// RelatedSignal.astro.
// =============================================================================

export interface RelatedSignalLink {
  href: string;
  label: string;
  ariaLabel: string;
  kind: 'city-guide' | 'opt-in-tracker' | 'ocp-license-map' | 'find-a-dispensary' | 'market-stats' | 'blog-post';
}

export interface RelatedSignalInput {
  siteName: string;
  siteUrl: string;
  slug: string | null;
  city: string | null;
}

export interface RelatedSignalOutput {
  heading: string;
  blurb: string;
  links: RelatedSignalLink[];
}

// Curated cities for which a canonical per-city dispensary guide exists
// in MDG. This list is intentionally short — it matches the signal
// slice's 11 curated municipalities plus the always-existing regional
// guides. Adding a city here is the single place to teach the slice
// about a new MDG guide.
const CITY_GUIDES: Record<string, string> = {
  'portland': 'Portland',
  'south-portland': 'South Portland',
  'bangor': 'Bangor',
  'lewiston': 'Lewiston',
  'auburn': 'Auburn',
  'augusta': 'Augusta',
  'waterville': 'Waterville',
  'sanford': 'Sanford',
  'brunswick': 'Brunswick',
  'kittery': 'Kittery',
  'orono': 'Orono',
};

function cityGuideHref(slug: string): string | null {
  // Only emit a per-city guide link when we know one exists. The MDG
  // content corpus has dispensary guides for ~109 cities; this list is
  // restricted to the 11 currently in the Signal slice so we never
  // surface a dead link to a city page that does not exist.
  if (!slug) return null;
  if (!Object.prototype.hasOwnProperty.call(CITY_GUIDES, slug)) return null;
  return `/guides/${slug}-dispensary-guide/`;
}

export function buildRelatedSignal(input: RelatedSignalInput): RelatedSignalOutput {
  const { city, slug } = input;
  const links: RelatedSignalLink[] = [];

  if (city && slug) {
    const cityHref = cityGuideHref(slug);
    if (cityHref) {
      links.push({
        href: cityHref,
        label: `${city} dispensary guide`,
        ariaLabel: `Read the canonical MDG ${city} dispensary guide (operator overviews, hours, addresses)`,
        kind: 'city-guide',
      });
    }
  }

  links.push({
    href: '/guides/maine-cannabis-opt-in-tracker',
    label: 'Municipal opt-in tracker',
    ariaLabel: 'Track which Maine municipalities have opted in to adult-use cannabis retail',
    kind: 'opt-in-tracker',
  });
  links.push({
    href: '/guides/maine-ocp-license-map',
    label: 'Maine OCP license map',
    ariaLabel: 'Open the canonical Maine OCP license map across all municipalities',
    kind: 'ocp-license-map',
  });
  links.push({
    href: '/blog/how-many-dispensaries-in-maine',
    label: 'How many dispensaries are in Maine?',
    ariaLabel: 'Read the MDG explainer on current Maine dispensary counts and what they mean',
    kind: 'blog-post',
  });
  links.push({
    href: '/find-a-dispensary',
    label: 'Find a dispensary',
    ariaLabel: 'Search the MDG directory of adult-use and medical dispensaries',
    kind: 'find-a-dispensary',
  });
  links.push({
    href: '/market-stats',
    label: 'Maine cannabis market stats',
    ariaLabel: 'Open the MDG Maine cannabis market-stats dashboard (sales, transactions, product mix)',
    kind: 'market-stats',
  });

  const heading = city
    ? `Continue your ${city} research on MDG`
    : 'Explore more MDG research';
  const blurb = city
    ? `The Signal research surface is one tool. MDG also publishes a canonical ${city} guide and statewide datasets.`
    : 'The Signal research surface is one tool. MDG also publishes statewide datasets and per-city dispensary guides.';

  return { heading, blurb, links };
}
