// =============================================================================
// lib/json-ld.ts — JSON-LD graph builders for Maine Dispensary Guide
//
// Produces a single Schema.org @graph containing the entity types that
// every page emits: Organization, WebSite (with SearchAction), and — for
// content pages — Article. Output is a single JSON-LD <script> tag rather
// than 3 separate ones (Sprint 73b unification; saves ~600 bytes + 2
// parser passes per page).
//
// Pure functions, no Astro dependencies.
// =============================================================================

export interface ArticleMeta {
  title: string;
  description: string;
  author?: string;
  authorTitle?: string;
  authorId?: string;
  publishDate?: string;
  modifiedDate?: string;
  section?: string;
  heroImage?: string;
  topics?: string[];
  pageUrl: string;
}

export interface OrganizationConfig {
  siteName: string;
  siteUrl: string;
  socialLinks: string[];
  contactEmail?: string;
  faviconUrl?: string;
}

interface GraphNode {
  '@type': string;
  '@id'?: string;
  [key: string]: unknown;
}

/**
 * Build a Schema.org @graph for the site. The graph contains:
 *   - Organization (with logo, sameAs, contactPoint)
 *   - WebSite (with SearchAction for sitelinks search)
 *   - Article (only if `article` is provided)
 *
 * Google Rich Results picks up any node in the graph, so unification
 * (vs. 3 separate <script> tags) doesn't degrade SEO. The @id values
 * create stable inter-node references that the WebSite node can cite
 * via `publisher`.
 */
export function buildJsonLdGraph(
  config: OrganizationConfig,
  article?: ArticleMeta,
): { '@context': string; '@graph': GraphNode[] } {
  const { siteName, siteUrl, socialLinks, contactEmail = 'info@mainedispensaryguide.com', faviconUrl = '/favicon.svg' } = config;
  const orgId = `${siteUrl}#organization`;
  const websiteId = `${siteUrl}#website`;

  const organization: GraphNode = {
    '@type': 'Organization',
    '@id': orgId,
    name: siteName,
    url: siteUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${siteUrl}${faviconUrl}`,
    },
    sameAs: socialLinks,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: contactEmail,
    },
  };

  const website: GraphNode = {
    '@type': 'WebSite',
    '@id': websiteId,
    name: siteName,
    url: siteUrl,
    description: 'Your complete guide to opening and operating a cannabis dispensary.',
    publisher: { '@id': orgId },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const graph: GraphNode[] = [organization, website];

  if (article) {
    const author = article.authorId
      ? {
          '@type': 'Person',
          '@id': `${siteUrl}/about/authors#${article.authorId}`,
          name: article.author,
          jobTitle: article.authorTitle,
          url: `${siteUrl}/about/authors#${article.authorId}`,
        }
      : {
          '@type': 'Organization',
          name: article.author || siteName,
        };

    graph.push({
      '@type': 'Article',
      headline: article.title,
      description: article.description,
      image: article.heroImage
        ? (article.heroImage.startsWith('http') ? article.heroImage : `${siteUrl}${article.heroImage}`)
        : undefined,
      author,
      publisher: { '@id': orgId },
      datePublished: article.publishDate,
      dateModified: article.modifiedDate || article.publishDate,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': article.pageUrl,
      },
      articleSection: article.section,
      keywords: article.topics && article.topics.length > 0 ? article.topics.join(', ') : undefined,
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}
