/**
 * Site Configuration Interface
 * Each vertical site has its own site-config.json
 */

import type { ArticleData } from './article';

export interface SiteConfig {
  siteName: string;
  siteUrl: string;
  stateName: string;
  vertical: 'cannabis' | 'psychedelics' | string;
  analyticsId: string;
  formspreeEndpoint: string;
  primaryColor?: string;
  accentColor?: string;
}

export interface Breadcrumb {
  label: string;
  href: string;
}

export interface Props {
  title: string;
  description?: string;
  stateName?: string;
  isHub?: boolean;
  heroImage?: string;
  article?: ArticleData;
  breadcrumbs?: Breadcrumb[];
  noindex?: boolean;
  topics?: string[];
  tags?: string[];
}
