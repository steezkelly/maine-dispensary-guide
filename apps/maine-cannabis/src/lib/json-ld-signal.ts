// =============================================================================
// lib/json-ld-signal.ts
//
// Schema.org JSON-LD builder for the MDG Signal vertical slice.
//
// Mirrors the shape produced by buildJsonLdGraph() in ./json-ld.ts so the
// site's Organization + WebSite nodes can be re-used as a graph prefix
// without breaking Google's Rich Results parsing. Adds:
//   - WebPage         (the /signal/<city>/ or /signal/ page itself)
//   - Dataset         (the MDG-DATA-derived measurement set; primary
//                     schema for tabular data with provenance)
//
// Pure functions; no Astro dependencies. Imported by SignalLayout.astro.
// =============================================================================

interface GraphNode {
  '@type': string;
  '@id'?: string;
  [key: string]: unknown;
}

export interface SignalOrganizationConfig {
  siteName: string;
  siteUrl: string;
  socialLinks: string[];
  contactEmail?: string;
  faviconUrl?: string;
}

export interface SignalEvidence {
  releaseId: string;
  ocpDataAsOf: string;
  acsVintage: number;
  fetchedAtUtc: string;
  preliminary: boolean;
  sourceIds: string[];
  sourceUrls: string[];
}

export interface SignalCityRow {
  slug: string;
  city: string;
  geoid: string;
  licenses: number;
  population: number;
  density: number;
  dataAsOf: string;
  releaseId: string;
}

export interface SignalPageMeta {
  pageUrl: string;
  city: SignalCityRow | null;
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as T;
}

export function buildSignalJsonLd(
  config: SignalOrganizationConfig,
  evidence: SignalEvidence,
  page: SignalPageMeta,
): { '@context': string; '@graph': GraphNode[] } {
  const {
    siteName,
    siteUrl,
    socialLinks,
    contactEmail = 'info@mainedispensaryguide.com',
    faviconUrl = '/favicon.svg',
  } = config;
  const orgId = `${siteUrl}#organization`;
  const websiteId = `${siteUrl}#website`;
  const datasetId = page.city
    ? `${siteUrl}/signal/${page.city.slug}/#dataset`
    : `${siteUrl}/signal/#dataset`;
  const pageId = `${page.pageUrl}#webpage`;

  const organization: GraphNode = stripUndefined({
    '@type': 'Organization',
    '@id': orgId,
    name: siteName,
    url: siteUrl,
    logo: { '@type': 'ImageObject', url: `${siteUrl}${faviconUrl}` },
    sameAs: socialLinks,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: contactEmail,
    },
  });

  const website: GraphNode = stripUndefined({
    '@type': 'WebSite',
    '@id': websiteId,
    name: siteName,
    url: siteUrl,
    description: 'Maine cannabis research, market-stats, and licensing intelligence.',
    publisher: { '@id': orgId },
  });

  const variableMeasured = [
    { '@type': 'PropertyValue', name: 'active_adult_use_cannabis_store_licenses', description: 'Active adult-use store licenses in the municipality (Maine OCP licensee roster).' },
    { '@type': 'PropertyValue', name: 'population', description: `ACS ${evidence.acsVintage} 5-year municipality population (U.S. Census).` },
    { '@type': 'PropertyValue', name: 'rate_per_10k', description: 'Licenses per 10,000 residents (descriptive density, not a demand score).' },
  ];

  const spatialCoverage = page.city
    ? { '@type': 'Place', name: `${page.city.city}, Maine`, geo: { '@type': 'GeoCoordinates', latitude: undefined, longitude: undefined } }
    : { '@type': 'Place', name: 'Maine' };

  // Build the Dataset. Note: Schema.org/Dataset does not have an
  // established `provenance` or `freshness` slot, so we encode the release
  // identity in `identifier` + `isBasedOn` and put a human-readable freshness
  // note in `description`.
  const dataset: GraphNode = stripUndefined({
    '@type': 'Dataset',
    '@id': datasetId,
    name: page.city
      ? `MDG Signal — ${page.city.city} municipality research (release ${evidence.releaseId.slice(0, 7)})`
      : `MDG Signal — Maine municipality research (release ${evidence.releaseId.slice(0, 7)})`,
    description: page.city
      ? `Research surface for ${page.city.city}, Maine. License count, ACS ${evidence.acsVintage} population, and licenses per 10K are sourced from MDG-DATA release ${evidence.releaseId} (data as of ${evidence.ocpDataAsOf}). Density is descriptive.`
      : `Read-only research surface covering 11 curated Maine municipalities with active adult-use cannabis store licenses. License counts, ACS ${evidence.acsVintage} population, and licenses-per-10K density are sourced from MDG-DATA release ${evidence.releaseId} (data as of ${evidence.ocpDataAsOf}).`,
    identifier: evidence.releaseId,
    url: page.pageUrl,
    isBasedOn: evidence.sourceUrls.map((url) => ({ '@type': 'CreativeWork', url })),
    sameAs: evidence.sourceUrls,
    spatialCoverage,
    temporalCoverage: evidence.ocpDataAsOf,
    variableMeasured,
    creator: { '@type': 'Organization', '@id': orgId, name: siteName },
    license: `${siteUrl}/about/editorial-policy`,
    distribution: [
      {
        '@type': 'DataDownload',
        encodingFormat: 'text/html',
        contentUrl: page.pageUrl,
        name: page.city
          ? `${page.city.city} research page (HTML)`
          : 'MDG Signal index (HTML)',
      },
      {
        '@type': 'DataDownload',
        encodingFormat: 'application/json',
        contentUrl: `${siteUrl}/data/methodology/retail-licenses-by-municipality`,
        name: 'retail-licenses-by-municipality methodology',
      },
    ],
  });

  const webpage: GraphNode = stripUndefined({
    '@type': 'WebPage',
    '@id': pageId,
    url: page.pageUrl,
    name: page.city
      ? `${page.city.city}, Maine — MDG Signal`
      : 'MDG Signal — Maine cannabis research workspace',
    isPartOf: { '@id': websiteId },
    mainEntity: { '@id': datasetId },
    publisher: { '@id': orgId },
    inLanguage: 'en',
    dateModified: evidence.fetchedAtUtc,
  });

  return {
    '@context': 'https://schema.org',
    '@graph': [organization, website, dataset, webpage],
  };
}
