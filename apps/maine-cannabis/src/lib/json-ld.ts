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

export interface AuthorMeta {
  /** Display name (required — every Author entity must have one) */
  name: string;
  /** Role/job title shown in byline, e.g. "Licensing & Compliance Analyst" */
  jobTitle?: string | undefined;
  /** Author slug for @id stability, e.g. "calvin-waters" */
  id?: string | undefined;
  /** Short bio paragraph (1-2 sentences) */
  description?: string | undefined;
  /** Photo URL (relative or absolute). If null, schema `image` is omitted. */
  image?: string | null | undefined;
  /** Array of sameAs URLs (LinkedIn, Twitter, etc). Empty array = omit field. */
  sameAs?: string[] | undefined;
  /** Array of topics the author has expertise in. Empty array = omit field. */
  knowsAbout?: string[] | undefined;
}

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
  /**
   * Optional reviewer/medical reviewer Person. When provided, emits as a
   * second `@type:Person` node in the Article graph, attached via the
   * `reviewedBy` property. Doubles the E-E-A-T signal for YMYL pages.
   * Per Google's 2024-2026 Quality Rater Guidelines on "double E-E-A-T":
   * YMYL content with both an author AND a named reviewer is preferred.
   */
  reviewer?: AuthorMeta;
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
 *   - Article (only if `article` is provided), with optional reviewer
 *
 * Google Rich Results picks up any node in the graph, so unification
 * (vs. 3 separate <script> tags) doesn't degrade SEO. The @id values
 * create stable inter-node references that the WebSite node can cite
 * via `publisher`.
 *
 * Sprint 83 enhancement: every Person node (author + reviewer) now
 * emits description, knowsAbout, image, and sameAs when those fields
 * are populated. All four are optional — empty/null = omitted from
 * JSON-LD output (no `null` values leaked into structured data).
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
    const author = buildPersonNode(siteUrl, article.authorId
      ? {
          // article.author is optional in the schema interface; fall back to
          // siteName when omitted. This preserves the pre-Sprint-83 behavior
          // where an Article with no author still rendered an Organization
          // node in the graph.
          name: article.author || siteName,
          jobTitle: article.authorTitle,
          id: article.authorId,
          // Future: lookup description/image/sameAs/knowsAbout from authors.json
          // when the Article frontmatter exposes them. For now, only jobTitle
          // + name + id are guaranteed; other fields are skipped.
        }
      : { name: article.author || siteName });

    const articleNode: GraphNode = {
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
    };

    // Add reviewer as a separate Person node when provided. Per
    // schema.org/Article spec, `reviewedBy` accepts a Person or
    // Organization. Google reads the second Person as a second E-E-A-T
    // signal — exactly what the "double E-E-A-T" YMYL guidance calls for.
    if (article.reviewer && article.reviewer.name) {
      const reviewerNode = buildPersonNode(siteUrl, article.reviewer);
      // Push as a top-level graph node so Rich Results can identify both
      // Person entities independently. Then attach via `reviewedBy` on
      // the Article node.
      graph.push(reviewerNode);
      articleNode.reviewedBy = reviewerNode['@id']
        ? { '@id': reviewerNode['@id'] }
        : { '@type': 'Person', name: reviewerNode.name };
    }

    graph.push(articleNode);
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

/**
 * Build a Schema.org Person node from AuthorMeta. All optional fields
 * (description, knowsAbout, image, sameAs) are emitted ONLY when
 * populated — empty arrays / null / undefined are stripped before
 * serializing so the JSON-LD never contains `"image": null` (which
 * is a schema-validity bug for Google).
 *
 * The `siteUrl` parameter is the absolute URL prefix used to build
 * stable @id and url values for the Person entity. Centralized here
 * rather than via closure so this helper stays pure and testable.
 */
function buildPersonNode(siteUrl: string, meta: AuthorMeta): GraphNode {
  const { name, jobTitle, id, description, image, sameAs, knowsAbout } = meta;

  const person: GraphNode = {
    '@type': 'Person',
    '@id': id ? `${siteUrl}/about/authors#${id}` : undefined,
    name,
    url: id ? `${siteUrl}/about/authors#${id}` : undefined,
    jobTitle,
    description: description || undefined,
    image: image || undefined,
    sameAs: sameAs && sameAs.length > 0 ? sameAs : undefined,
    knowsAbout: knowsAbout && knowsAbout.length > 0 ? knowsAbout : undefined,
  };

  // Strip undefined values before returning to keep the JSON-LD clean.
  return Object.fromEntries(
    Object.entries(person).filter(([_, v]) => v !== undefined),
  ) as GraphNode;
}
