/**
 * src/data/signal/manifest.ts
 *
 * Committed (non-generated) manifest describing what MDG Signal exposes
 * today, what is partial, and what is explicitly preview-only. The Astro
 * /signal/ routes read this file to label every block; the derivation
 * script (scripts/derived/signal-page-model.cjs) reads the same capability
 * vocabulary at runtime.
 *
 * Single source of truth for the prototype boundary.
 */

export type CapabilityState =
  | 'current'
  | 'partial'
  | 'not_ready'
  | 'proposed_paid';

export interface ManifestDataset {
  state: CapabilityState;
  label: string;
  description: string;
}

export interface ManifestEvidence {
  releaseId: string;
  ocpDataAsOf: string;
  acsVintage: number;
  fetchedAtUtc: string;
  preliminary: boolean;
  transformVersion: string;
  sourceIds: string[];
  sourceUrls: string[];
}

export interface SignalManifest {
  product: 'mdg-signal';
  posture: 'read-only';
  scope: 'maine';
  evidence: ManifestEvidence;
  datasets: {
    licensesByMunicipality: ManifestDataset;
    licensesPer10k: ManifestDataset;
    optinCoverage: ManifestDataset;
    menuPrices: ManifestDataset;
    watchlist: ManifestDataset;
    changeAlerts: ManifestDataset;
  };
  prototypeBoundary: string;
}

const manifest: SignalManifest = {
  product: 'mdg-signal',
  posture: 'read-only',
  scope: 'maine',
  evidence: {
    releaseId: 'ded381696bddf56f',
    ocpDataAsOf: '2026-06-01',
    acsVintage: 2024,
    fetchedAtUtc: '2026-07-12T06:21:30.028Z',
    preliminary: false,
    transformVersion: '1',
    sourceIds: [
      'ocp_licenses',
      'census_acs5_population',
      'ocp_dispensaries_firecrawl',
    ],
    sourceUrls: [
      'https://www.maine.gov/dafs/ocp/open-data/adult-use/licensee-search',
      'https://www.census.gov/data/developers/data-sets/acs-5year.html',
    ],
  },
  datasets: {
    licensesByMunicipality: {
      state: 'current',
      label: 'Active adult-use store licenses by municipality',
      description:
        'Current release. Counted from the OCP licensee roster; each store belongs to one Maine municipality via geoid.',
    },
    licensesPer10k: {
      state: 'current',
      label: 'Licenses per 10,000 residents',
      description:
        'Current release. ACS 2024 5-year population joined to the license count. Descriptive density; not a demand or viability score.',
    },
    optinCoverage: {
      state: 'partial',
      label: 'Municipal opt-in coverage',
      description:
        'Partial. The current Firecrawl capture covers part of Maine only and is not presented as a statewide status result.',
    },
    menuPrices: {
      state: 'not_ready',
      label: 'Menu-price comparisons',
      description:
        'Not ready. No customer-facing values are exposed for menu price.',
    },
    watchlist: {
      state: 'proposed_paid',
      label: 'Saved municipality / dataset watchlist',
      description:
        'Proposed paid capability. The UI previews what saving a scope would look like; nothing is persisted and no account exists.',
    },
    changeAlerts: {
      state: 'proposed_paid',
      label: 'Sourced change alerts',
      description:
        'Proposed paid capability. The UI previews the alert anatomy (old value, new value, source, effective date) only; no alert is delivered and there is no historical baseline yet.',
    },
  },
  prototypeBoundary:
    'MDG Signal exposes the current MDG-DATA release and previews the proposed ' +
    'paid workspace. It does not persist anything, does not deliver alerts, and ' +
    'does not present any preview control as a functional feature.',
};

export default manifest;
