export type Audience = 'consumer' | 'business';

export type Intent =
  | 'locate'
  | 'compare'
  | 'learn'
  | 'travel'
  | 'start'
  | 'license'
  | 'site'
  | 'fund'
  | 'comply'
  | 'operate'
  | 'analyze'
  | 'invest'
  | 'work';

export type EditorialRelationship =
  | 'prerequisite'
  | 'next_dependency'
  | 'nearby_comparison'
  | 'deeper_explanation'
  | 'supporting_evidence'
  | 'next_decision';

export interface EditorialNextStep {
  id: string;
  sourcePath: string;
  destinationPath: string;
  audience: Audience;
  sourceIntent: Intent;
  destinationIntent: Intent;
  eyebrow: string;
  title: string;
  reason: string;
  relationship: EditorialRelationship;
  confidence: 'high' | 'medium';
}

export const editorialNextSteps = [
  {
    id: 'license-to-opt-in',
    sourcePath: '/guides/maine-dispensary-license',
    destinationPath: '/guides/maine-cannabis-opt-in-tracker',
    audience: 'business',
    sourceIntent: 'license',
    destinationIntent: 'site',
    eyebrow: 'Next dependency',
    title: 'Verify municipal participation',
    reason: 'A state licensing path still depends on local opt-in and written municipal approval.',
    relationship: 'next_dependency',
    confidence: 'high',
  },
  {
    id: 'opt-in-to-zoning',
    sourcePath: '/guides/maine-cannabis-opt-in-tracker',
    destinationPath: '/guides/maine-cannabis-zoning-requirements',
    audience: 'business',
    sourceIntent: 'site',
    destinationIntent: 'site',
    eyebrow: 'Before choosing a town',
    title: 'Check the local zoning rules',
    reason: 'Opt-in permits the category, but zoning, buffers, and local permits determine whether a specific site can work.',
    relationship: 'next_dependency',
    confidence: 'high',
  },
  {
    id: 'zoning-to-site-selection',
    sourcePath: '/guides/maine-cannabis-zoning-requirements',
    destinationPath: '/guides/maine-cannabis-site-selection',
    audience: 'business',
    sourceIntent: 'site',
    destinationIntent: 'site',
    eyebrow: 'Next decision',
    title: 'Compare viable sites',
    reason: 'Once the zoning constraints are known, compare traffic, competition, access, demographics, and lease risk before committing.',
    relationship: 'next_decision',
    confidence: 'high',
  },
  {
    id: 'site-selection-to-real-estate',
    sourcePath: '/guides/maine-cannabis-site-selection',
    destinationPath: '/guides/maine-cannabis-real-estate',
    audience: 'business',
    sourceIntent: 'site',
    destinationIntent: 'site',
    eyebrow: 'Before signing',
    title: 'Structure the real-estate deal',
    reason: 'A promising location still needs a cannabis-contingent lease, diligence terms, and a clear path through municipal approval.',
    relationship: 'next_decision',
    confidence: 'high',
  },
  {
    id: 'inventory-to-metrc',
    sourcePath: '/guides/maine-cannabis-inventory-management',
    destinationPath: '/guides/maine-metrc-compliance-guide',
    audience: 'business',
    sourceIntent: 'operate',
    destinationIntent: 'comply',
    eyebrow: 'Next dependency',
    title: 'Translate inventory controls into Metrc',
    reason: 'Physical counts, adjustments, transfers, and discrepancies must match the state seed-to-sale record.',
    relationship: 'next_dependency',
    confidence: 'high',
  },
  {
    id: 'metrc-to-waste',
    sourcePath: '/guides/maine-metrc-compliance-guide',
    destinationPath: '/guides/maine-cannabis-waste-management',
    audience: 'business',
    sourceIntent: 'comply',
    destinationIntent: 'operate',
    eyebrow: 'Next operating control',
    title: 'Document waste and product disposition',
    reason: 'Metrc records remain incomplete unless destruction, waste handling, and final disposition follow Maine requirements.',
    relationship: 'next_dependency',
    confidence: 'high',
  },
  {
    id: 'edibles-to-first-visit',
    sourcePath: '/blog/best-maine-edibles-2026',
    destinationPath: '/guides/first-time-maine-dispensary-buyer',
    audience: 'consumer',
    sourceIntent: 'compare',
    destinationIntent: 'learn',
    eyebrow: 'Before you shop',
    title: 'Plan your first dispensary visit',
    reason: 'Know what to bring, how checkout works, and how to ask product and dosing questions before selecting an edible.',
    relationship: 'next_decision',
    confidence: 'high',
  },
  {
    id: 'best-dispensaries-to-value',
    sourcePath: '/blog/best-maine-dispensaries-2026',
    destinationPath: '/blog/cheapest-maine-dispensary-2026',
    audience: 'consumer',
    sourceIntent: 'compare',
    destinationIntent: 'compare',
    eyebrow: 'Compare the tradeoffs',
    title: 'Check value, not rankings alone',
    reason: 'Price, taxes, product format, and travel distance can change which Maine dispensary is the practical choice.',
    relationship: 'deeper_explanation',
    confidence: 'high',
  },
  {
    id: 'gift-cards-to-store-comparison',
    sourcePath: '/blog/maine-dispensary-gift-cards',
    destinationPath: '/blog/best-maine-dispensaries-2026',
    audience: 'consumer',
    sourceIntent: 'learn',
    destinationIntent: 'compare',
    eyebrow: 'Choose where to use it',
    title: 'Compare Maine dispensaries',
    reason: 'Gift-card policies vary by operator, so compare locations, product selection, and access before deciding where to shop.',
    relationship: 'next_decision',
    confidence: 'high',
  },
  {
    id: 'machias-to-downeast-region',
    sourcePath: '/guides/machias-dispensary-guide',
    destinationPath: '/guides/downeast-acadia-aroostook-cannabis-guide',
    audience: 'consumer',
    sourceIntent: 'compare',
    destinationIntent: 'compare',
    eyebrow: 'Compare the region',
    title: 'Explore more Downeast options',
    reason: 'A regional view makes it easier to compare travel distance, nearby towns, and licensed storefront options beyond Machias.',
    relationship: 'nearby_comparison',
    confidence: 'high',
  },
] as const satisfies readonly EditorialNextStep[];

export function getEditorialNextStep(currentPath: string): EditorialNextStep | undefined {
  return editorialNextSteps.find(
    (item) => item.sourcePath === currentPath && item.confidence === 'high',
  );
}
