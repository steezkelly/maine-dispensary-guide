'use strict';

/**
 * apps/maine-cannabis/scripts/build/__tests__/render-market-stats-charts.test.cjs
 *
 * Focused regression test for the §8.1 chart renderer. The renderer
 * consumes apps/maine-cannabis/src/data/market-stats/chart-sources.json
 * and writes one inline-SVG file per chart. The test guards:
 *   - the data JSON parses and every chart passes validation
 *   - the renderer writes one file per chart
 *   - every output file is well-formed XML and contains the chart's
 *     title and caption text (so screen readers and SEO still work)
 *   - every output file has a unique id used in aria-labelledby
 *
 * Run with: node apps/maine-cannabis/scripts/build/__tests__/render-market-stats-charts.test.cjs
 */

const assert = require('node:assert/strict');
const { existsSync, readdirSync, readFileSync, statSync } = require('node:fs');
const { resolve } = require('node:path');

const { main } = require('../render-market-stats-charts.cjs');

const REPO = resolve(__dirname, '..', '..', '..');
const OUT_DIR = resolve(REPO, 'public/images/charts/market-stats');
const DATA = resolve(REPO, 'src/data/market-stats/chart-sources.json');

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

const data = JSON.parse(readFileSync(DATA, 'utf8'));
const expected = data.charts.map((c) => c.id);
const result = main();
const writtenIds = result.charts.map((c) => c.id);

check('every chart in the source JSON has a written SVG', () => {
  assert.deepEqual(writtenIds, expected,
    'renderer must write one SVG per chart, in source-JSON order');
});

check('every written SVG is non-empty and well-formed XML', () => {
  for (const chart of result.charts) {
    assert.ok(existsSync(chart.path), `${chart.path} should exist`);
    const stat = statSync(chart.path);
    assert.ok(stat.size > 200, `${chart.path} is suspiciously small (${stat.size} bytes)`);
    const content = readFileSync(chart.path, 'utf8');
    assert.match(content, /^<\?xml version="1\.0" encoding="UTF-8"\?>/,
      `${chart.path} must start with the XML declaration`);
    assert.match(content, /<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/,
      `${chart.path} must declare the SVG namespace`);
    assert.match(content, /<\/svg>\s*$/,
      `${chart.path} must end with </svg>`);
  }
});

check('every SVG carries the chart id, title, and caption', () => {
  for (const chart of data.charts) {
    const path = resolve(OUT_DIR, chart.id + '.svg');
    const content = readFileSync(path, 'utf8');
    assert.ok(content.includes(`chart-title-${chart.id}`),
      `${chart.id}.svg must reference the chart-title id`);
    assert.ok(content.includes(`chart-caption-${chart.id}`),
      `${chart.id}.svg must reference the chart-caption id`);
    assert.ok(content.includes(chart.title),
      `${chart.id}.svg must include the title text for screen readers`);
  }
});

check('no chart id is duplicated', () => {
  const ids = result.charts.map((c) => c.id);
  const unique = new Set(ids);
  assert.equal(unique.size, ids.length, 'chart ids must be unique');
});

check('every chart in the source JSON has data and source for the audit trail', () => {
  for (const chart of data.charts) {
    assert.equal(typeof chart.source, 'string', `${chart.id}.source must be a string`);
    assert.ok(chart.source.length > 5, `${chart.id}.source must be a non-trivial string`);
    assert.equal(typeof chart.observation_period, 'string', `${chart.id}.observation_period must be a string`);
    assert.equal(typeof chart.caption, 'string', `${chart.id}.caption must be a string`);
  }
});

check('output directory only contains the expected chart files', () => {
  const onDisk = readdirSync(OUT_DIR).filter((f) => f.endsWith('.svg')).sort();
  const expectedFiles = expected.slice().sort().map((id) => id + '.svg');
  assert.deepEqual(onDisk, expectedFiles, 'on-disk SVGs must match source-JSON ids exactly');
});

process.stderr.write('\nrender-market-stats-charts.test.cjs: ' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail === 0 ? 0 : 1);
