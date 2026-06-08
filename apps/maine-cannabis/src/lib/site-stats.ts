/**
 * lib/site-stats.ts
 * Single source of truth for site-wide stat numbers (active stores, etc.)
 */
import siteStats from '../data/site-stats.json';

export interface SiteStats {
    activeAdultUseRetailStores: number;
    activeAdultUseMunicipalities: number;
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
    dataSource: string;
}

export function getSiteStats(): SiteStats {
    return siteStats as SiteStats;
}
