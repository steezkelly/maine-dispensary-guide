'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Routes excluded by configuration regardless of source-file contents.
const NOINDEX_PATH_PREFIXES = ['/experiments', '/search', '/admin/'];

function sourcePathForRoute(route, pagesDir) {
  const pathname = route.replace(/\/$/, '') || '/';
  if (pathname === '/') {
    const index = path.join(pagesDir, 'index.astro');
    return fs.existsSync(index) ? index : null;
  }
  const indexPath = path.join(pagesDir, pathname, 'index.astro');
  if (fs.existsSync(indexPath)) return indexPath;
  const directPath = path.join(pagesDir, `${pathname}.astro`);
  if (fs.existsSync(directPath)) return directPath;
  const segments = pathname.split('/');
  if (segments.length > 1) {
    const parentIndex = path.join(pagesDir, segments[1], 'index.astro');
    if (fs.existsSync(parentIndex)) return parentIndex;
  }
  return null;
}

function isNoindexSource(srcPath, route) {
  if (route === '/404') return true;
  if (NOINDEX_PATH_PREFIXES.some((prefix) => route === prefix.replace(/\/$/, '') || route.startsWith(prefix))) return true;
  try {
    const raw = fs.readFileSync(srcPath, 'utf8');
    return /noindex\s*=\s*\{\s*true\s*\}/.test(raw)
      || /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*\bnoindex\b/i.test(raw);
  } catch {
    return false;
  }
}

function isNoindexRoute(route, pagesDir) {
  return isNoindexSource(sourcePathForRoute(route, pagesDir), route);
}

module.exports = { NOINDEX_PATH_PREFIXES, sourcePathForRoute, isNoindexSource, isNoindexRoute };
