const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');

const dataModulePath = path.resolve(__dirname, '../homepage-editorial-data.ts');

const originalLoad = Module._load;
Module._load = function patched(request, parent, isMain) {
  if (request.endsWith('homepage-editorial-data')) {
    const url = require('node:url').pathToFileURL(dataModulePath).href;
    return import(url);
  }
  return originalLoad(request, parent, isMain);
};

(async () => {
  const { buildMunicipalityRows, buildLatestIntelligence, selectFeaturedAnalysis, normalizeMunicipalityName } = await import(
    require('node:url').pathToFileURL(dataModulePath).href
  );

  await test('normalizeMunicipalityName produces stable guide-safe keys', () => {
    assert.equal(normalizeMunicipalityName('South Portland'), 'south-portland');
    assert.equal(normalizeMunicipalityName('Madawaska, Maine'), 'madawaska-maine');
    assert.equal(normalizeMunicipalityName('  Presque  Isle '), 'presque-isle');
  });

  await test('buildMunicipalityRows joins current evidence without inventing opt-outs', () => {
    const rows = buildMunicipalityRows({
      guideRoutes: [
        { name: 'Portland', href: '/guides/portland-dispensary-guide' },
        { name: 'Bangor', href: '/guides/bangor-dispensary-guide' },
        { name: 'Wells', href: '/guides/wells-dispensary-guide' },
      ],
      authorization: {
        municipalities: [
          { name: 'Portland', county: 'Cumberland', status: 'retail_authorized' },
          { name: 'Bangor', county: 'Penobscot', status: 'retail_authorized' },
          { name: 'Wells', county: 'York', status: 'no_recorded_retail_authorization' },
        ],
      },
      directory: {
        by_city: [
          { city_raw: 'Portland', dispensary_count: 27 },
          { city_raw: 'Bangor', dispensary_count: 10 },
        ],
      },
    });
    assert.equal(rows.length, 3);
    assert.deepEqual(rows.map((row) => row.name), ['Bangor', 'Portland', 'Wells']);
    const portland = rows.find((row) => row.name === 'Portland');
    assert.equal(portland.activeStoreLicenses, 27);
    assert.equal(portland.regulatoryNote, 'Adult-use retail authorized');
    const wells = rows.find((row) => row.name === 'Wells');
    assert.equal(wells.activeStoreLicenses, 0);
    assert.equal(wells.regulatoryNote, 'No OCP-recorded retail authorization');
  });

  await test('buildMunicipalityRows rejects guide routes outside /guides/', () => {
    assert.throws(
      () =>
        buildMunicipalityRows({
          guideRoutes: [{ name: 'X', href: '/about' }],
          authorization: { municipalities: [] },
          directory: { by_city: [] },
        }),
      /must begin with \/guides\//,
    );
  });

  await test('buildLatestIntelligence orders ISO dates descending and caps output at eight', () => {
    const input = [
      { title: 'a', date: '2026-07-06' },
      { title: 'b', date: '2026-07-09' },
      { title: 'c', date: '2026-06-30' },
      { title: 'd', date: '2026-07-09' },
    ];
    const out = buildLatestIntelligence([...input].reverse());
    assert.deepEqual(out.map((item) => item.title), ['d', 'b', 'a', 'c']);
    const longInput = Array.from({ length: 12 }, (_, i) => ({
      title: `t${i}`,
      date: `2026-07-${(i + 1).toString().padStart(2, '0')}`,
    }));
    const capped = buildLatestIntelligence(longInput);
    assert.equal(capped.length, 8);
    assert.equal(capped[0].title, 't11');
  });

  await test('selectFeaturedAnalysis honors a valid override or chooses the newest item with a real image', () => {
    const items = [
      { href: '/blog/a', date: '2026-07-10', image: undefined },
      { href: '/blog/b', date: '2026-07-09', image: { src: '/img/b.jpg', alt: 'B' } },
    ];
    assert.equal(selectFeaturedAnalysis(items).href, '/blog/b');
    assert.throws(() => selectFeaturedAnalysis(items, '/blog/missing'), /does not resolve/);
    assert.throws(
      () => selectFeaturedAnalysis([{ href: '/blog/x', date: '2026-07-10' }]),
      /requires an item with a real image/,
    );
  });
})().catch((error) => {
  console.error(error);
  process.exit(1);
});