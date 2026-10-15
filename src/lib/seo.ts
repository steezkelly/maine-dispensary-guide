// =============================================================================
// lib/seo.ts — SEO + meta helpers for Maine Dispensary Guide
//
// Pure functions, no Astro dependencies. Reusable across pages and verticals.
// Extracted from Layout.astro frontmatter (Sprint 73d+) to make SEO
// constraints testable, readable, and tunable without touching the Layout.
// =============================================================================

export const MAX_SEO_TITLE_LENGTH = 60;
export const MAX_META_DESCRIPTION_LENGTH = 160;

/**
 * Truncate a meta description to MAX_META_DESCRIPTION_LENGTH chars at a
 * word boundary, preserving trailing period for sentence completeness.
 *
 * If truncation occurs, prefers the last space ≥ 110 chars from the start
 * to avoid mid-word cuts. Strips trailing punctuation/connectors.
 */
export function truncateMetaDescription(value: string): string {
  if (value.length <= MAX_META_DESCRIPTION_LENGTH) return value;
  const trimmed = value.slice(0, MAX_META_DESCRIPTION_LENGTH - 1).trimEnd();
  const lastSpace = trimmed.lastIndexOf(' ');
  let result = trimmed.slice(0, lastSpace > 110 ? lastSpace : trimmed.length).replace(/[,:;—-]+$/, '');
  const connector = /\s+(?:and|or|the|for|to|of|a|an|in|with|on|by|at|from|is|are|was|were|be|been)$/i;
  for (let i = 0; i < 3 && connector.test(result); i++) {
    result = result.replace(connector, '');
  }
  return `${result.replace(/[,:;—-]+$/, '')}.`;
}

/**
 * Build a branded <title> string. Prefers "Title | Site Name" form, but
 * falls back to truncated title (or original) when branded form exceeds
 * MAX_SEO_TITLE_LENGTH. Always uses word-boundary truncation.
 *
 * Sprint 73b safer alternative: prefers input title (with ellipsis) over
 * branded form when both would overflow. Currently uses the legacy logic
 * to match existing search-engine indexing of the production site.
 */
export function buildFullTitle(title: string, siteName: string): string {
  const brandedTitle = title.includes(siteName) ? title : `${title} | ${siteName}`;
  if (brandedTitle.length <= MAX_SEO_TITLE_LENGTH) return brandedTitle;
  if (title.length > MAX_SEO_TITLE_LENGTH) {
    // Truncate to one char under the limit, then strip the trailing partial
    // word AND any trailing punctuation/em-dash that would otherwise leave
    // the title mid-sentence (e.g. "Maine Home Grow Guide 2026 — Plant Limits,"
    // would render truncated to "...Plant Limits," — visibly broken).
    // Sprint 80 fix: also strip trailing ",", ";", ":", "—", "-" and the
    // common English connector words that would otherwise leave a sentence
    // visibly incomplete (and, or, the, for, to, of, a, an, in, with, on).
    const CONNECTORS = /^(?:and|or|the|for|to|of|a|an|in|with|on|by|at|from|is|are|was|were|be|been)$/i;
    let result = title.slice(0, MAX_SEO_TITLE_LENGTH - 1).replace(/\s+\S*$/, '');
    // After dropping the partial word, the result may end with a connector.
    // Strip it (and any preceding whitespace) up to 3 times to catch
    // chains like "...for the" → "...for the" → "...for" → "...".
    for (let i = 0; i < 3; i++) {
      const trailing = result.match(/(\s+\S+)$/);
      if (trailing && CONNECTORS.test(trailing[1].trim())) {
        result = result.slice(0, result.length - trailing[1].length);
      } else {
        break;
      }
    }
    return result.replace(/[,;:\u2014\-–\s]+$/, '');
  }
  return title;
}

export interface Breadcrumb {
  label: string;
  href: string;
}

const BREADCRUMB_LABELS: Record<string, string> = {
  'guides': 'Guides',
  'about': 'About',
  'blog': 'Blog',
  'resources': 'Resources',
  'founders': 'Founders',
  'download': 'Downloads',
  'contact': 'Contact',
  'start-here': 'Start Here',
  'roi-calculator': 'ROI Calculator',
  'glossary': 'Glossary',
  'market-stats': 'Market Stats',
};

/**
 * Build a breadcrumb trail from the current path. Uses explicit
 * breadcrumbs if provided, otherwise derives from URL segments.
 * Falls back to title-cased segment for unknown labels.
 */
export function buildCrumbs(path: string, explicitCrumbs: Breadcrumb[] = []): Breadcrumb[] {
  if (explicitCrumbs.length > 0) return explicitCrumbs;
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return [];
  const crumbs: Breadcrumb[] = [];
  let running = '';
  for (const part of parts) {
    running = running + '/' + part;
    crumbs.push({
      label: BREADCRUMB_LABELS[part] || part.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      href: running,
    });
  }
  return crumbs;
}

/**
 * Resolve a social-image URL for OG/Twitter meta. Returns heroImage
 * (absolute or relative → siteUrl-prepended) or a default OG image.
 * Determines the correct MIME type for crawler compatibility.
 */
export function resolveSocialImage(
  heroImage: string | undefined,
  siteUrl: string,
  defaultImage = '/og-image.svg',
): { url: string; mimeType: string } {
  const url = heroImage
    ? (heroImage.startsWith('http') ? heroImage : `${siteUrl}${heroImage}`)
    : `${siteUrl}${defaultImage}`;
  const mimeType = url.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg';
  return { url, mimeType };
}

/**
 * Parse JPEG SOF0/1/2/3 markers to read the actual width/height of a
 * hero image file. Returns DEFAULT if the file is missing, not a JPEG,
 * or the markers can't be located. This ensures <img> dimensions, OG
 * meta, and preload hints all report truthful values for the actual
 * asset (rather than hardcoded 1200x630).
 *
 * Touched: 2026-06-01 Sprint 72k. Touched again: 2026-06-05 refactor/layout.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

export function getHeroImageDimensions(
  heroImage: string | undefined,
  cwd: string = process.cwd(),
): { w: number; h: number } {
  const DEFAULT = { w: 1200, h: 630 };
  if (!heroImage || !heroImage.startsWith('/images/')) return DEFAULT;
  const publicDir = path.resolve(cwd, 'public');
  const filePath = path.join(publicDir, heroImage);
  let data: Buffer;
  try {
    data = fs.readFileSync(filePath);
  } catch {
    return DEFAULT;
  }
  let i = 2; // skip SOI (0xFFD8)
  while (i < data.length - 9) {
    if (data[i] !== 0xFF) return DEFAULT;
    const marker = data[i + 1];
    if (marker === 0xD8 || marker === 0xD9 || marker === 0x00) { i += 2; continue; }
    if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2 || marker === 0xC3) {
      const h = data.readUInt16BE(i + 5);
      const w = data.readUInt16BE(i + 7);
      return { w, h };
    }
    if (marker === 0xDA) return DEFAULT;
    if (i + 4 > data.length) return DEFAULT;
    const segLen = data.readUInt16BE(i + 2);
    i += 2 + segLen;
  }
  return DEFAULT;
}
