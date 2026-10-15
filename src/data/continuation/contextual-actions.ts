import type { Audience, Intent } from './editorial-next-steps';

export type ActionFamily =
  | 'directory'
  | 'calculator'
  | 'download'
  | 'lead_magnet'
  | 'contact'
  | 'dataset'
  | 'affiliate';

export interface ContextualAction {
  id: string;
  sourcePath: string;
  href: string;
  audience: Audience;
  intent: Intent;
  label: string;
  description: string;
  actionFamily: ActionFamily;
  disclosure?: string;
  confidence: 'high' | 'medium';
}

export const contextualActions = [
  {
    id: 'license-launch-checklist',
    sourcePath: '/guides/maine-dispensary-license',
    href: '/download-checklist',
    audience: 'business',
    intent: 'start',
    label: 'Use the Maine launch checklist',
    description: 'Turn the licensing overview into a practical application and opening sequence.',
    actionFamily: 'lead_magnet',
    disclosure: 'Free MDG resource. Email follow-up is optional.',
    confidence: 'high',
  },
  {
    id: 'opt-in-launch-checklist',
    sourcePath: '/guides/maine-cannabis-opt-in-tracker',
    href: '/download-checklist',
    audience: 'business',
    intent: 'start',
    label: 'Put municipal approval into the launch sequence',
    description: 'Use the Maine launch checklist to place opt-in, zoning, licensing, and build-out work in order.',
    actionFamily: 'lead_magnet',
    disclosure: 'Free MDG resource. Email follow-up is optional.',
    confidence: 'high',
  },
  {
    id: 'zoning-roi-calculator',
    sourcePath: '/guides/maine-cannabis-zoning-requirements',
    href: '/roi-calculator',
    audience: 'business',
    intent: 'analyze',
    label: 'Model the site economics',
    description: 'Test revenue, margin, rent, labor, and operating assumptions before advancing a compliant location.',
    actionFamily: 'calculator',
    confidence: 'high',
  },
  {
    id: 'site-selection-roi-calculator',
    sourcePath: '/guides/maine-cannabis-site-selection',
    href: '/roi-calculator',
    audience: 'business',
    intent: 'analyze',
    label: 'Run the dispensary ROI model',
    description: 'Compare the financial effect of rent, traffic, market size, and operating costs before signing.',
    actionFamily: 'calculator',
    confidence: 'high',
  },
  {
    id: 'inventory-metrc-checklist',
    sourcePath: '/guides/maine-cannabis-inventory-management',
    href: '/download/metrc-reconciliation-checklist',
    audience: 'business',
    intent: 'operate',
    label: 'Download the METRC reconciliation checklist',
    description: 'Use a daily, weekly, and monthly inventory-control routine for counts, variances, and review.',
    actionFamily: 'lead_magnet',
    disclosure: 'Free resource with an immediate direct-download option.',
    confidence: 'high',
  },
  {
    id: 'metrc-reconciliation-checklist',
    sourcePath: '/guides/maine-metrc-compliance-guide',
    href: '/download/metrc-reconciliation-checklist',
    audience: 'business',
    intent: 'operate',
    label: 'Use the METRC reconciliation checklist',
    description: 'Convert seed-to-sale requirements into repeatable daily, weekly, and monthly controls.',
    actionFamily: 'lead_magnet',
    disclosure: 'Free resource with an immediate direct-download option.',
    confidence: 'high',
  },
  {
    id: 'edibles-first-timer-guide',
    sourcePath: '/blog/best-maine-edibles-2026',
    href: '/download/first-timer-field-guide',
    audience: 'consumer',
    intent: 'learn',
    label: 'Get the first-timer field guide',
    description: 'Bring a concise visit, payment, product-selection, and first-purchase checklist with you.',
    actionFamily: 'lead_magnet',
    disclosure: 'Free resource with an immediate direct-download option.',
    confidence: 'high',
  },
  {
    id: 'best-dispensaries-directory',
    sourcePath: '/blog/best-maine-dispensaries-2026',
    href: '/find-a-dispensary',
    audience: 'consumer',
    intent: 'locate',
    label: 'Search Maine dispensaries',
    description: 'Move from the statewide comparison to towns and licensed storefront options.',
    actionFamily: 'directory',
    confidence: 'high',
  },
  {
    id: 'gift-cards-directory',
    sourcePath: '/blog/maine-dispensary-gift-cards',
    href: '/find-a-dispensary',
    audience: 'consumer',
    intent: 'locate',
    label: 'Find a Maine dispensary',
    description: 'Compare towns and storefront options before checking an operator-specific gift-card policy.',
    actionFamily: 'directory',
    confidence: 'high',
  },
  {
    id: 'machias-directory',
    sourcePath: '/guides/machias-dispensary-guide',
    href: '/find-a-dispensary',
    audience: 'consumer',
    intent: 'locate',
    label: 'Search Maine dispensaries',
    description: 'Compare more Maine towns and licensed storefront options beyond the Machias area.',
    actionFamily: 'directory',
    confidence: 'high',
  },
] as const satisfies readonly ContextualAction[];

export function getContextualAction(currentPath: string): ContextualAction | undefined {
  return contextualActions.find(
    (item) => item.sourcePath === currentPath && item.confidence === 'high',
  );
}
