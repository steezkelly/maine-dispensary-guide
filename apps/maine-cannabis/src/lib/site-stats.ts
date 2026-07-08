/**
 * lib/site-stats.ts
 *
 * Single accessor for the canonical site-wide stat numbers (active stores,
 * opt-in municipalities, market value, etc.) so all consumer pages — index,
 * 404, market, ROI, hub — read from one source of truth.
 *
 * Source: src/data/site-stats.json
 * Refresh: run `node scripts/ocp/refresh-site-stats.cjs` after each monthly
 * OCP CSV drop. See scripts/ocp/fetch-ocp-towns.py for the upstream fetcher.
 *
 * Sprint 78 observability: closes the "187 hardcode across 7 pages" drift
 * class — see BOT_COLLABORATION_HUB.md for the full audit context.
 */
import siteStats from '../data/site-stats.json';

export interface SiteStats {
    activeAdultUseRetailStores: number;
    activeAdultUseRetailStoresSource?: string;
    activeAdultUseMunicipalities: number;
    activeAdultUseMunicipalitiesSource?: string;
    currentOcpLicenseeRoster?: {
        auRetailStores: number;
        auMunicipalities: number;
        caregiverStorefronts: number;
        asOf: string;
        source: string;
        note: string;
    };
    totalMarketValueAdultUse: string;
    mainePopulation: number;
    fiscalYearLastUpdated: string;
    liveOcpRefreshedAt?: string;
    dataSource: string;
    nextRefresh: string;
    notes: string;
}

export function getSiteStats(): SiteStats {
    return siteStats as SiteStats;
}

/**
 * Returns active store count formatted as a stat-friendly number, e.g. 187.
 * Convenience accessor for the most common case.
 */
export function activeRetailStoreCount(): number {
    return siteStats.activeAdultUseRetailStores;
}

/**
 * Returns the opt-in municipality count.
 */
export function activeMunicipalitiesCount(): number {
    return siteStats.activeAdultUseMunicipalities;
}
