export interface GuideRoute {
  name: string;
  href: string;
}

export interface MunicipalityRow {
  name: string;
  county: string;
  href: string;
  activeStoreLicenses: number;
  regulatoryNote: string;
}

interface AuthorizationRecord {
  name: string;
  county: string;
  status: string;
}

interface DirectoryRecord {
  city_raw: string;
  dispensary_count: number;
}

interface MunicipalityInputs {
  guideRoutes: GuideRoute[];
  authorization: { municipalities: AuthorizationRecord[] };
  directory: { by_city: DirectoryRecord[] };
}

export function normalizeMunicipalityName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u2018\u2019']/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export function buildMunicipalityRows({
  guideRoutes,
  authorization,
  directory,
}: MunicipalityInputs): MunicipalityRow[] {
  for (const route of guideRoutes) {
    if (!route.href.startsWith('/guides/')) {
      throw new Error(`Municipality guide href must begin with /guides/: ${route.href}`);
    }
  }

  const authorizationByName = new Map(
    authorization.municipalities.map((item) => [normalizeMunicipalityName(item.name), item]),
  );
  const storesByName = new Map(
    directory.by_city.map((item) => [normalizeMunicipalityName(item.city_raw), item.dispensary_count]),
  );

  return guideRoutes
    .map((route) => {
      const key = normalizeMunicipalityName(route.name);
      const record = authorizationByName.get(key);
      return {
        name: route.name,
        county: record?.county ?? 'Maine',
        href: route.href,
        activeStoreLicenses: storesByName.get(key) ?? 0,
        regulatoryNote: record?.status === 'retail_authorized'
          ? 'Adult-use retail authorized'
          : 'No OCP-recorded retail authorization',
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function buildLatestIntelligence<T extends { date: string }>(
  items: T[],
  limit = 8,
): T[] {
  return [...items]
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, limit);
}

export interface FeaturedAnalysisCandidate {
  href: string;
  date: string;
  image?: { src: string; alt: string };
}

export function selectFeaturedAnalysis<T extends FeaturedAnalysisCandidate>(
  items: T[],
  homepageFeaturedPath?: string,
): T {
  if (homepageFeaturedPath) {
    const overridden = items.find((item) => item.href === homepageFeaturedPath);
    if (!overridden) {
      throw new Error(`Homepage featured path does not resolve: ${homepageFeaturedPath}`);
    }
    return overridden;
  }

  const selected = buildLatestIntelligence(items)
    .find((item) => Boolean(item.image?.src && item.image.alt));
  if (!selected) {
    throw new Error('Homepage featured analysis requires an item with a real image');
  }
  return selected;
}