// =============================================================================
// lib/page-stats.ts — single source of truth for site-wide content counts.
//
// Computes counts from the on-disk source tree at build time. The numbers
// stay in sync with whatever was on disk when the build ran — no fabricated
// counts, no manual updating when a new guide is added.
//
// Originally lived inline in site-health.astro. Sprint 77 observability
// extracted it here so 404.astro (and any future page that needs the same
// numbers) can use a single source of truth. 404.astro's "City Guides: 40+"
// stat had drifted to ~109 actual files; centralizing the count prevents
// future drift.
// =============================================================================

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PAGES_DIR = './src/pages';
const HEROES_DIR = './public/images/heroes';

function walkAstro(dir: string): string[] {
  const out: string[] = [];
  const stack: string[] = [dir];
  while (stack.length) {
    const cur = stack.pop()!;
    let entries;
    try { entries = readdirSync(cur, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const p = join(cur, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile() && e.name.endsWith('.astro')) out.push(p);
    }
  }
  return out;
}

const isCityGuide = (p: string) =>
  /\/[a-z-]+-dispensary-guide\.astro$/.test(p) && !p.includes('/blog/');
const isTechGuide = (p: string) =>
  p.includes('/guides/') && !p.includes('/blog/') && !isCityGuide(p);
const isBlogPost = (p: string) =>
  p.includes('/blog/') && !p.endsWith('/index.astro');
const isFounder = (p: string) =>
  p.includes('/founders/') && !p.endsWith('/index.astro');
const isResource = (p: string) =>
  p.includes('/resources/') && !p.endsWith('/index.astro');
const isDownload = (p: string) =>
  p.includes('/download/') && !p.endsWith('/index.astro');

export interface PageStats {
  cityGuides: number;
  techGuides: number;
  blogPosts: number;
  founders: number;
  resources: number;
  downloads: number;
  corePages: number;
  totalPages: number;
  totalWords: number;
  heroImages: number;
  contentPages: number;
}

function countWords(file: string): number {
  try {
    const text = readFileSync(file, 'utf8');
    const stripped = text
      .replace(/^---[\s\S]*?---/, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return stripped.split(' ').filter(Boolean).length;
  } catch { return 0; }
}

export function getPageStats(pagesDir: string = PAGES_DIR): PageStats {
  const allAstro = walkAstro(pagesDir);
  const cityGuides = allAstro.filter(isCityGuide).length;
  const techGuides = allAstro.filter(isTechGuide).length;
  const blogPosts = allAstro.filter(isBlogPost).length;
  const founders = allAstro.filter(isFounder).length;
  const resources = allAstro.filter(isResource).length;
  const downloads = allAstro.filter(isDownload).length;
  const corePages =
    allAstro.length - cityGuides - techGuides - blogPosts - founders - resources - downloads;
  const totalWords = allAstro.reduce((sum, f) => sum + countWords(f), 0);
  const contentPages = cityGuides + techGuides + blogPosts + founders + resources + downloads;

  // Hero-image count — mirrors the exact filter used by the /site-health
  // dashboard so the strip and the dashboard never drift.
  let heroImages = 0;
  try {
    heroImages = readdirSync(HEROES_DIR).filter(f =>
      f.endsWith('.jpg') && !f.startsWith('_') && !f.startsWith('.')
    ).length;
  } catch { heroImages = 0; }

  return {
    cityGuides,
    techGuides,
    blogPosts,
    founders,
    resources,
    downloads,
    corePages,
    totalPages: allAstro.length,
    totalWords,
    heroImages,
    contentPages,
  };
}
