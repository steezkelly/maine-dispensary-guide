/**
 * Vertical Configuration
 * Design tokens per vertical - allows personality while maintaining brand consistency
 */

export const verticals = {
  cannabis: {
    name: 'Cannabis Dispensary Guide',
    colorPrimary: '#0D4E50',
    colorAccent: '#588157',
    fontSerif: 'Fraunces',
    fontSans: 'Plus Jakarta Sans',
  },
  psychedelics: {
    name: 'Psychedelics Guide',
    colorPrimary: '#1A1A2E',
    colorAccent: '#6B4C9A',
    fontSerif: 'Fraunces',
    fontSans: 'Plus Jakarta Sans',
  },
} as const;

export type Vertical = keyof typeof verticals;
