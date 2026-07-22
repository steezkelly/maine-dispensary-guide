'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  REPO_ROOT,
  assertPrivateGscPath,
  daysBetween,
  loadGsc,
  parseArgs,
  readArticle,
} = require('./stale-guide-report.cjs');

function writeCsv(root, name, rows) {
  const csv = path.join(root, name);
  fs.writeFileSync(csv, [
    'page,clicks,impressions,ctr,position',
    ...rows,
    '',
  ].join('\n'));
  return csv;
}

test('default GSC input resolves outside the public repository', () => {
  const { gscCsv } = parseArgs([]);
  assert.equal(path.isAbsolute(gscCsv), true);
  assert.doesNotThrow(() => assertPrivateGscPath(gscCsv));
  assert.equal(path.relative(REPO_ROOT, gscCsv).startsWith('..'), true);
});

test('repository-local GSC input is rejected', () => {
  assert.throws(
    () => assertPrivateGscPath(path.join(REPO_ROOT, 'gsc-last-28d.csv')),
    /must be outside the repository/
  );
});

test('slash and slash-less GSC rows aggregate deterministically', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-stale-guide-test-'));
  const csv = writeCsv(root, 'gsc.csv', [
    'https://mainedispensaryguide.com/guides/example/,2,20,0.1,4',
    'https://mainedispensaryguide.com/guides/example,3,30,0.1,8',
  ]);
  try {
    assert.deepEqual(loadGsc(csv).get('guides/example'), {
      page: 'https://mainedispensaryguide.com/guides/example',
      clicks: 5,
      impressions: 50,
      ctr: 0.1,
      position: 6.4,
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('GSC host and scheme variants produce the canonical public URL regardless of row order', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-stale-guide-host-test-'));
  const rows = [
    'http://mainedispensaryguide.com/guides/example,2,20,0.1,4',
    'https://www.mainedispensaryguide.com/guides/example/,3,30,0.1,8',
  ];
  const first = writeCsv(root, 'first.csv', rows);
  const second = writeCsv(root, 'second.csv', [...rows].reverse());
  const expected = {
    page: 'https://mainedispensaryguide.com/guides/example',
    clicks: 5,
    impressions: 50,
    ctr: 0.1,
    position: 6.4,
  };
  try {
    assert.deepEqual(loadGsc(first).get('guides/example'), expected);
    assert.deepEqual(loadGsc(second).get('guides/example'), expected);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('canonical aggregation is byte-identical for semantic row permutations', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-stale-guide-order-test-'));
  const rows = [
    'https://mainedispensaryguide.com/guides/example,1,521999,0.0000019157,19.6567957401',
    'https://www.mainedispensaryguide.com/guides/example/,2,13,0.1538461538,93.123456789',
    'http://mainedispensaryguide.com/guides/example,3,7,0.4285714286,71.987654321',
  ];
  const first = writeCsv(root, 'first.csv', rows);
  const second = writeCsv(root, 'second.csv', [...rows].reverse());
  try {
    assert.equal(
      JSON.stringify([...loadGsc(first)]),
      JSON.stringify([...loadGsc(second)])
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('malformed GSC numeric fields fail closed with the source row', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-stale-guide-numeric-test-'));
  const csv = writeCsv(root, 'gsc.csv', [
    'https://mainedispensaryguide.com/guides/example,not-a-number,20,0.1,4',
  ]);
  try {
    assert.throws(() => loadGsc(csv), /row 2.*clicks/i);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('fractional counts, zero position, and short rows fail closed', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-stale-guide-shape-test-'));
  const cases = [
    ['fractional-clicks.csv', 'https://mainedispensaryguide.com/guides/example,1.5,20,0.075,4', /clicks.*integer/i],
    ['fractional-impressions.csv', 'https://mainedispensaryguide.com/guides/example,1,20.5,0.05,4', /impressions.*integer/i],
    ['zero-position.csv', 'https://mainedispensaryguide.com/guides/example,1,20,0.05,0', /position.*greater than zero/i],
    ['short.csv', 'https://mainedispensaryguide.com/guides/example,1,20,0.05', /row 2.*5 columns/i],
  ];
  try {
    for (const [name, row, expected] of cases) {
      const csv = writeCsv(root, name, [row]);
      assert.throws(() => loadGsc(csv), expected);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('an outside symlink cannot point back to repository-local data', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-stale-guide-symlink-test-'));
  const link = path.join(root, 'gsc.csv');
  fs.symlinkSync(path.join(REPO_ROOT, 'apps/maine-cannabis/scripts/seo/stale-guide-report.test.cjs'), link);
  try {
    assert.throws(() => assertPrivateGscPath(link), /must be outside the repository/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('calendar dates fail closed instead of rolling into the next month', () => {
  assert.throws(() => parseArgs(['--today', '2026-02-31']), /valid calendar date/);
  assert.equal(daysBetween('2026-02-01', '2026-02-31'), null);
});

test('article dates support single-quoted literals and imported meta.retrieved_at', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-stale-guide-date-test-'));
  const pages = path.join(root, 'pages');
  const data = path.join(root, 'data');
  fs.mkdirSync(pages);
  fs.mkdirSync(data);
  const literal = path.join(pages, 'literal.astro');
  const dynamic = path.join(pages, 'dynamic.astro');
  fs.writeFileSync(literal, "---\nconst article = { modifiedDate: '2026-07-18' };\n---\n<h1>Literal</h1>\n");
  fs.writeFileSync(path.join(data, 'meta.json'), JSON.stringify({ meta: { retrieved_at: '2026-07-17T17:32:43.899Z' } }));
  fs.writeFileSync(dynamic, "---\nimport authorizationData from '../data/meta.json';\nconst { meta } = authorizationData;\nconst article = { modifiedDate: meta.retrieved_at };\n---\n<h1>Dynamic</h1>\n");
  try {
    assert.equal(readArticle(literal).modifiedDate, '2026-07-18');
    assert.equal(readArticle(dynamic).modifiedDate, '2026-07-17');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
