'use strict';

/**
 * Pure builder for the reciprocal cross-link that appears on the per-city
 * dispensary guides. One link per page, pointing to /signal/<city>/,
 * with a short blurb explaining what the Signal surface is and why it
 * complements the operator/buyer guide.
 *
 * Testable without a browser; the Astro component consumes the result
 * via the .astro file.
 */

export interface CrossLinkFromGuideInput {
  /** The page's own city slug, e.g. "portland". Required. */
  slug: string;
  /** The page's own city name, e.g. "Portland". */
  city: string;
  /** Optional override for the URL the page is read from; default = "https://mainedispensaryguide.com". */
  siteUrl?: string;
  /** Optional release id from MDG-DATA; surface in the blurb for context. */
  releaseId?: string;
  /** When true, the rendered link carries rel="nofollow" so the addition
   *  does not artificially push PageRank to a /signal/ page that the
   *  project keeps out of the public sitemap during the prototype phase. */
  nofollow?: boolean;
}

export interface CrossLinkFromGuideOutput {
  href: string;
  label: string;
  blurb: string;
  nofollow: boolean;
  /** A short uppercase tag like "RESEARCH DATA" rendered above the blurb. */
  eyebrow: string;
}

export function buildCrossLinkFromGuide(input: CrossLinkFromGuideInput): CrossLinkFromGuideOutput {
  const slug = String(input.slug || '').trim();
  const city = String(input.city || '').trim();
  if (!slug || !city) {
    throw new Error('buildCrossLinkFromGuide: slug and city are required');
  }
  const siteUrl = String(input.siteUrl || 'https://mainedispensaryguide.com').replace(/\/$/, '');
  const releaseFragment = input.releaseId
    ? ` Sourced from MDG-DATA release ${input.releaseId.slice(0, 7)}.`
    : '';
  return {
    href: `${siteUrl}/signal/${slug}`,
    label: `${city} municipality research on MDG Signal`,
    blurb: `Read-only research surface for ${city}: active store licenses, ACS population, and licenses per 10K, with primary-source attribution.${releaseFragment} Complements this ${slug}-dispensary-guide with structured data you can cite.`,
    nofollow: input.nofollow !== false, // default true
    eyebrow: 'Research data',
  };
}
