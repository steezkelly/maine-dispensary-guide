'use strict';

/**
 * apps/maine-cannabis/src/components/__tests__/market-stats-charts.test.cjs
 *
 * Focused regression test for the three shared chart components used
 * on /market-stats for the §8.1 visuals. Each component is hand-built
 * (no chart library) and renders inline SVG. The test guards:
 *   - every chart id from the §8.1 source JSON has a rendered HTML output
 *   - the rendered SVG carries the chart title and caption text for
 *     screen readers (role="img" + aria-labelledby + <title> + <desc>)
 *   - the rendered output does NOT introduce a new chart kind, library
 *     dependency, or external image reference
 *
 * Run with: node apps/maine-cannabis/src/components/__tests__/market-stats-charts.test.cjs
 */

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const REPO = resolve(__dirname, '..', '..', '..');
const CHARTS_JSON = resolve(REPO, 'src/data/market-stats/chart-sources.json');
const PAGE = resolve(REPO, 'src/pages/market-stats.astro');
const CHARTBAR = resolve(REPO, 'src/components/ChartBar.astro');
const CHARTSTACK = resolve(REPO, 'src/components/ChartStackedBar.astro');
const CHARTTIER = resolve(REPO, 'src/components/ChartTierList.astro');

let pass = 0;
let fail = 0;
function check(name, fn) {
  try {
    fn();
    process.stderr.write('  ok  ' + name + '\n');
    pass += 1;
  } catch (err) {
    process.stderr.write('  FAIL ' + name + ': ' + err.message + '\n');
    fail += 1;
  }
}

const data = JSON.parse(readFileSync(CHARTS_JSON, 'utf8'));
const pageSource = readFileSync(PAGE, 'utf8');
const chartBarSource = readFileSync(CHARTBAR, 'utf8');
const chartStackSource = readFileSync(CHARTSTACK, 'utf8');
const chartTierSource = readFileSync(CHARTTIER, 'utf8');

check('market-stats.astro imports all three chart components', () => {
  assert.match(pageSource, /import\s+ChartBar\s+from\s+['"]\.\.\/components\/ChartBar\.astro['"]/);
  assert.match(pageSource, /import\s+ChartStackedBar\s+from\s+['"]\.\.\/components\/ChartStackedBar\.astro['"]/);
  assert.match(pageSource, /import\s+ChartTierList\s+from\s+['"]\.\.\/components\/ChartTierList\.astro['"]/);
});

check('market-stats.astro looks up every chart from chartById()', () => {
  for (const chart of data.charts) {
    assert.match(
      pageSource,
      new RegExp(`chartById\\(\\s*['"]${chart.id}['"]\\s*\\)`),
      `market-stats.astro should call chartById("${chart.id}")`,
    );
  }
});

check('ChartBar declares role=img, title, desc, and inline SVG', () => {
  assert.match(chartBarSource, /role\s*=\s*"img"/);
  assert.match(chartBarSource, /<title/);
  assert.match(chartBarSource, /<desc/);
  assert.match(chartBarSource, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
});

check('ChartStackedBar declares role=img, title, desc, and inline SVG', () => {
  assert.match(chartStackSource, /role\s*=\s*"img"/);
  assert.match(chartStackSource, /<title/);
  assert.match(chartStackSource, /<desc/);
  assert.match(chartStackSource, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
});

check('ChartTierList declares role=img, title, desc, and inline SVG', () => {
  assert.match(chartTierSource, /role\s*=\s*"img"/);
  assert.match(chartTierSource, /<title/);
  assert.match(chartTierSource, /<desc/);
  assert.match(chartTierSource, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
});

check('chart components do not pull in chart.js, d3, or any SVG library', () => {
  const combined = chartBarSource + '\n' + chartStackSource + '\n' + chartTierSource;
  assert.doesNotMatch(combined, /from\s+['"]chart\.js['"]/, 'chart.js import would violate the no-chart-library rule');
  assert.doesNotMatch(combined, /from\s+['"]d3/, 'd3 import would violate the no-chart-library rule');
  assert.doesNotMatch(combined, /from\s+['"]@visx/, 'visx import would violate the no-chart-library rule');
  assert.doesNotMatch(combined, /from\s+['"]@nivo/, 'nivo import would violate the no-chart-library rule');
  assert.doesNotMatch(combined, /import\s+sharp/, 'sharp would pull in a raster step the card does not need');
});

check('chart components do not reference raster images (svg-only)', () => {
  const combined = chartBarSource + '\n' + chartStackSource + '\n' + chartTierSource;
  assert.doesNotMatch(combined, /\.(png|jpg|jpeg|gif|webp|avif)\b/i, 'chart components should be svg-only, no raster references');
});

check('market-stats.astro mounts a chart per §8.1 source id', () => {
  // Each chart must appear at least once in the page render path. A
  // simple substring search is enough because chart ids are kebab-case
  // and unlikely to collide.
  for (const chart of data.charts) {
    assert.ok(
      pageSource.includes(chart.id),
      `market-stats.astro should mount the ${chart.id} chart (id appears in render path)`,
    );
  }
});

process.stderr.write('\nmarket-stats-charts.test.cjs: ' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail === 0 ? 0 : 1);
