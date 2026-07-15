const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const appRoot = path.join(repoRoot, 'apps', 'maine-cannabis');
const rootDist = path.join(repoRoot, 'dist');
const publicDir = path.join(appRoot, 'public');
const sitemapPath = path.join(rootDist, 'sitemap-0.xml');

function newestMtime(paths) {
  let newest = null;
  for (const p of paths) {
    let stat;
    try { stat = fs.statSync(p); } catch { continue; }
    const mtimeMs = stat.mtimeMs;
    if (!newest || mtimeMs > newest.mtimeMs) newest = { path: p, mtimeMs };
  }
  return newest;
}

function representativeRenderedOutput(distDir = rootDist, sitemap = path.join(distDir, 'sitemap-0.xml')) {
  if (fs.existsSync(sitemap)) return sitemap;
  const candidates = [
    path.join(distDir, 'index.html'),
    path.join(distDir, 'guides', 'portland-dispensary-guide', 'index.html'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || sitemap;
}

function warnIfRenderedOutputStale({ distDir = rootDist, sitemap = path.join(distDir, 'sitemap-0.xml'), label = 'rendered output' } = {}) {
  const rendered = representativeRenderedOutput(distDir, sitemap);
  let renderedStat;
  try { renderedStat = fs.statSync(rendered); } catch { return false; }

  const marker = newestMtime([
    path.join(repoRoot, 'vercel-build.sh'),
    path.join(repoRoot, 'package.json'),
    path.join(repoRoot, 'package-lock.json'),
    path.join(appRoot, 'astro.config.mjs'),
    path.join(appRoot, 'src'),
    path.join(appRoot, 'public'),
  ]);
  if (!marker || renderedStat.mtimeMs >= marker.mtimeMs) return false;

  const renderedRel = path.relative(repoRoot, rendered) || rendered;
  const markerRel = path.relative(repoRoot, marker.path) || marker.path;
  const message = `${label} may be stale: ${renderedRel} (${new Date(renderedStat.mtimeMs).toISOString()}) is older than ${markerRel} (${new Date(marker.mtimeMs).toISOString()}). Run \`npm run build\` if this check depends on fresh rendered HTML.`;
  console.warn(`⚠️  ${message}`);
  if (process.env.STRICT_RENDERED_OUTPUT_STALENESS === '1') {
    throw new Error(message);
  }
  return true;
}

module.exports = {
  repoRoot,
  appRoot,
  rootDist,
  publicDir,
  sitemapPath,
  warnIfRenderedOutputStale,
};
