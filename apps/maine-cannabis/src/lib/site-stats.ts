/**
 * lib/site-stats.ts
 *
 * Single accessor for the canonical site-wide stat numbers (annual-report store
 * counts and dated live-roster counts) so consumer pages preserve their source
 * date and definition.
 *
 * Source: src/data/site-stats.json
 * Refresh: run `node scripts/ocp/refresh-site-stats.cjs` after each monthly
 * OCP CSV drop. See scripts/ocp/fetch-ocp-towns.py for the upstream fetcher.
 *
 * Sprint 78 observability: closes the annual-report-vs-live-roster drift
 * class — see BOT_COLLABORATION_HUB.md for the full audit context.
 */
import siteStats from '../data/site-stats.json';

export interface SiteStats {
    activeAdultUseRetailStores: number;
    activeAdultUseRetailStoresSource?: string;
    currentOcpLicenseeRoster?: {
        auRetailStores: number;
        auMunicipalities: number;
        caregiverStorefronts: number;
        caregiverMunicipalities: number;
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
 * Returns the fixed annual-report active retail-store count.
 * Convenience accessor for the most common case.
 */
export function activeRetailStoreCount(): number {
    return siteStats.activeAdultUseRetailStores;
}
