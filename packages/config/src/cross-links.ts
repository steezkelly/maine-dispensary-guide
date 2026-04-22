// @ts-nocheck
/**
 * Cross-Site Links Manifest
 * Tracks editorial cross-links between network sites
 * Each link has a review date for link rot prevention
 */

export const crossLinks = [
  // {
  //   from: { site: 'maine-cannabis', path: '/guides/maine-cannabis-regulations', text: 'federal policy' },
  //   to: { site: 'maine-psychedelics', path: '/guides/federal-policy' },
  //   context: 'Contextual description of why this link exists',
  //   addedDate: '2026-04-20',
  //   reviewDate: '2027-04-20',
  // }
];

/**
 * Get cross-link candidates for a given site and path
 */
export function getCrossLinkCandidates(site, path) {
  return crossLinks.filter(link => link.from.site === site && link.from.path === path);
}
