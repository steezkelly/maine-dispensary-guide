const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '../..');
const source = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const paths = {
  stats: 'apps/maine-cannabis/src/data/site-stats.json',
  refresh: 'apps/maine-cannabis/scripts/ocp/refresh-site-stats.cjs',
  deriveRetailProducts: 'apps/maine-cannabis/scripts/data/mdg-data/adapters/derive-retail-products.cjs',
  fetchTowns: 'scripts/ocp/fetch-ocp-towns.py',
  marketStats: 'apps/maine-cannabis/src/pages/market-stats.astro',
  roi: 'apps/maine-cannabis/src/pages/roi-calculator.astro',
  licenseMap: 'apps/maine-cannabis/src/pages/guides/maine-ocp-license-map.astro',
  finder: 'apps/maine-cannabis/src/pages/find-a-dispensary.astro',
  notFound: 'apps/maine-cannabis/src/pages/404.astro',
  howToOpen: 'apps/maine-cannabis/src/pages/blog/maine-dispensary-how-to-open.astro',
  grayMarket: 'apps/maine-cannabis/src/pages/blog/maine-cannabis-gray-market-ocp-enforcement-2026.astro',
  roiBlog: 'apps/maine-cannabis/src/pages/blog/maine-dispensary-roi-what-to-expect-2026.astro',
  wholesale: 'apps/maine-cannabis/src/pages/guides/maine-cannabis-wholesale-guide.astro',
  licenseGuide: 'apps/maine-cannabis/src/pages/guides/maine-dispensary-license.astro',
};

test('annual-report facts stay distinct from dated live OCP roster facts', () => {
  const stats = JSON.parse(source(paths.stats));

  assert.equal(stats.activeAdultUseRetailStores, 180);
  assert.equal(stats.activeAdultUseMunicipalities, undefined);
  assert.match(stats.activeAdultUseRetailStoresSource, /2025 Annual Report/);
  assert.doesNotMatch(stats.activeAdultUseRetailStoresSource, /\b187\b/);
  assert.equal(stats.currentOcpLicenseeRoster.auRetailStores, 106);
  assert.equal(stats.currentOcpLicenseeRoster.auMunicipalities, 50);
  assert.equal(stats.currentOcpLicenseeRoster.caregiverStorefronts, 269);
  assert.equal(stats.currentOcpLicenseeRoster.caregiverMunicipalities, 116);
  assert.match(stats.dataSource, /Medical-Use Registrant CSVs/);
  assert.match(stats.currentOcpLicenseeRoster.source, /Medical-Use Registrant CSVs/);
  assert.match(stats.currentOcpLicenseeRoster.note, /Two parallel facts are intentional/);
});

test('approved reader surfaces do not preserve the false annual-report 187 or unsupported annual 65 claims', () => {
  for (const relativePath of [
    paths.roi,
    paths.notFound,
    paths.howToOpen,
    paths.grayMarket,
    paths.roiBlog,
    paths.wholesale,
  ]) {
    assert.doesNotMatch(source(relativePath), /\b187\+?\b/, relativePath);
  }

  const marketStats = source(paths.marketStats);
  assert.doesNotMatch(marketStats, /activeAdultUseMunicipalities/);
  assert.doesNotMatch(marketStats, /\b65\s+(?:host )?municipalities/);

  const roi = source(paths.roi);
  assert.doesNotMatch(roi, /\$1\.31M|\$1\.32M|÷ 187/);
  assert.match(roi, /\$1\.37M/);
  assert.match(roi, /\$126K/);
  assert.match(roi, /31% annual return/);
  assert.match(roi, /÷ 180/);

  const wholesale = source(paths.wholesale);
  assert.match(wholesale, /\b180 licensed retail stores\b/);
  assert.doesNotMatch(wholesale, /\b180\+ (?:licensed )?(?:retail )?stores\b/);

  assert.match(marketStats, /\+11 net \(2024→25\)/);
  assert.doesNotMatch(marketStats, /County-level active AU retailer distribution \(OCP 2025 Annual Report snapshots\)/);
  assert.match(marketStats, /canonical June 1, 2026 active Store-license snapshot/);
  assert.match(marketStats, /not a 2025 Annual Report retail-store distribution or the July 8, 2026 live storefront roster/);
  assert.match(marketStats, /95 of the state's 187 distinct active Store-license identities/);
  const roiBlog = source(paths.roiBlog);
  assert.match(roiBlog, /343 \(2025 OCP Annual Report/);
  assert.match(roiBlog, /180 active cannabis retail stores/);
});

test('OCP data refresh uses current source discovery and labels the refreshed town snapshot', () => {
  const fetchTowns = source(paths.fetchTowns);
  const refresh = source(paths.refresh);
  const finder = source(paths.finder);
  const licenseMap = source(paths.licenseMap);
  const deriveRetailProducts = source(paths.deriveRetailProducts);
  const licenseGuide = source(paths.licenseGuide);

  assert.doesNotMatch(fetchTowns, /2026_04_01/);
  assert.match(fetchTowns, /adult-use\/licensee-search/);
  assert.match(fetchTowns, /medical-use\/registrant-search/);
  assert.match(fetchTowns, /\.csv/);
  assert.match(refresh, /caregiverStorefronts:\s*live\.cgStores/);
  assert.match(refresh, /caregiverMunicipalities:\s*live\.cgMunicipalities/);
  assert.doesNotMatch(refresh, /stored\.activeAdultUseRetailStores\} live=\$\{live\.auStores\}/);
  assert.match(deriveRetailProducts, /activeAdultUseRetailStores_annualReport:\s*180/);
  assert.match(deriveRetailProducts, /full active-store count \(187 in the\s+\/\/ June 2026 snapshot\)/);
  assert.doesNotMatch(deriveRetailProducts, /of which 187 are retail stores/);
  assert.match(licenseGuide, /187 distinct active adult-use Store-license identities/);
  assert.match(licenseGuide, /snapshot dated June 1, 2026/);
  assert.doesNotMatch(licenseGuide, /\b65 of 500-plus Maine municipalities/);
  assert.doesNotMatch(finder, /April 2026/);
  assert.match(finder, /July 8, 2026/);
  assert.match(licenseMap, /not a live licensee mirror/);
  assert.match(licenseMap, /static annual-report context/);
  assert.doesNotMatch(licenseMap, /mirrors the OCP open data licensee dataset/);
  assert.doesNotMatch(licenseMap, /mirrors that data in a filterable format/);
  assert.doesNotMatch(licenseMap, /filterable (?:OCP )?(?:dataset|list)/i);
});

test('town fetch counts caregiver storefronts in towns that also have adult-use stores', () => {
  const fixture = {
    au: [
      { LICENSE_STATUS: 'Active', LICENSE_TYPE: 'Store', DBA: 'North AU', LICENSE_CITY: 'North' },
      { LICENSE_STATUS: 'Active', LICENSE_TYPE: 'Store', DBA: 'North AU', LICENSE_CITY: 'North' },
    ],
    cg: [
      { RETAIL_TOWN: 'North', REGISTRANT_DBA: 'North Care' },
      { RETAIL_TOWN: 'North', REGISTRANT_DBA: 'North Care' },
      { RETAIL_TOWN: 'South', REGISTRANT_DBA: 'South Care' },
    ],
  };
  const python = [
    'import importlib.util, json, sys',
    'spec = importlib.util.spec_from_file_location("ocp_towns", sys.argv[1])',
    'mod = importlib.util.module_from_spec(spec)',
    'spec.loader.exec_module(mod)',
    'data = json.load(sys.stdin)',
    'towns, counts = mod.build_town_data(data["au"], data["cg"])',
    'print(json.dumps({"towns": towns, "counts": counts}))',
  ].join('; ');
  const result = spawnSync('python3', ['-c', python, path.join(repoRoot, paths.fetchTowns)], {
    encoding: 'utf8',
    input: JSON.stringify(fixture),
  });
  assert.equal(result.status, 0, result.stderr);
  const actual = JSON.parse(result.stdout);

  assert.equal(actual.counts.auStores, 1);
  assert.equal(actual.counts.auMunicipalities, 1);
  assert.equal(actual.counts.caregiverStorefronts, 2);
  assert.equal(actual.counts.caregiverMunicipalities, 2);
  assert.deepEqual(actual.towns, [
    { n: 'North', t: 'au', c: 1, s: ['North AU'] },
    { n: 'South', t: 'med', c: 1, s: ['South Care'] },
  ]);
});

test('town fetch canonicalizes known OCP municipality aliases before grouping', () => {
  const fixture = {
    au: [
      { LICENSE_STATUS: 'Active', LICENSE_TYPE: 'Store', DBA: 'Goose River', LICENSE_CITY: 'Baring Plantation' },
      { LICENSE_STATUS: 'Active', LICENSE_TYPE: 'Store', DBA: 'Pine Island', LICENSE_CITY: 'Baring Plt' },
    ],
    cg: [
      { RETAIL_TOWN: 'Baring Plantation', REGISTRANT_DBA: 'Baring Care' },
      { RETAIL_TOWN: 'Baring Plt', REGISTRANT_DBA: 'Baring Care Two' },
    ],
  };
  const python = [
    'import importlib.util, json, sys',
    'spec = importlib.util.spec_from_file_location("ocp_towns", sys.argv[1])',
    'mod = importlib.util.module_from_spec(spec)',
    'spec.loader.exec_module(mod)',
    'data = json.load(sys.stdin)',
    'towns, counts = mod.build_town_data(data["au"], data["cg"])',
    'print(json.dumps({"towns": towns, "counts": counts}))',
  ].join('; ');
  const result = spawnSync('python3', ['-c', python, path.join(repoRoot, paths.fetchTowns)], {
    encoding: 'utf8',
    input: JSON.stringify(fixture),
  });
  assert.equal(result.status, 0, result.stderr);
  const actual = JSON.parse(result.stdout);

  assert.equal(actual.counts.auMunicipalities, 1);
  assert.equal(actual.counts.caregiverMunicipalities, 1);
  assert.deepEqual(actual.towns, [
    { n: 'Baring Plantation', t: 'au', c: 2, s: ['Goose River', 'Pine Island'] },
  ]);
});

test('refresh writer reads complete caregiver counts rather than medical-only display rows', () => {
  const tempDir = fs.mkdtempSync(path.join('/tmp', 'ocp-refresh-fixture-'));
  const pythonShim = path.join(tempDir, 'python3-fixture');
  fs.writeFileSync(pythonShim, `#!/usr/bin/env sh
if [ "$1" = "--version" ]; then
  echo 'Python 3 fixture'
  exit 0
fi
printf '[{"n":"North","t":"au","c":1,"s":["North AU"]},{"n":"South","t":"med","c":1,"s":["South Care"]}]'
printf 'Source date: 2026-07-08 (adult-use), 2026-07-08 (medical)\\n' >&2
printf 'Counts: {"auStores": 1, "auMunicipalities": 1, "caregiverStorefronts": 2, "caregiverMunicipalities": 2}\\n' >&2
`, { mode: 0o755 });
  try {
    const result = spawnSync('node', [path.join(repoRoot, paths.refresh), '--dry-run'], {
      encoding: 'utf8',
      env: { ...process.env, PYTHON: pythonShim },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /2 caregiver storefronts across 2 municipalities/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('embedded directory roster is deduplicated and matches the generated medical-only display total', () => {
  const finder = source(paths.finder);
  const match = finder.match(/const ocpCities = (\[[\s\S]*?\n\]);/);
  assert.ok(match, 'ocpCities array is present');
  const cities = JSON.parse(match[1]);
  const medical = cities.filter(city => city.t === 'med');
  const adultUse = cities.filter(city => city.t === 'au');

  assert.equal(medical.reduce((sum, city) => sum + city.c, 0), 128);
  assert.equal(adultUse.length, 50);
  assert.deepEqual(adultUse.filter(city => city.n.startsWith('Baring')), [
    { n: 'Baring Plantation', t: 'au', c: 2, s: ['PINE ISLAND REC', 'PURPLE HAZE BY GOOSE RIVER'] },
  ]);
  const byTown = new Map(medical.map(city => [city.n, city]));
  assert.deepEqual(byTown.get('Corinth'), { n: 'Corinth', t: 'med', c: 1, s: ['THE NEON PIPE LLC'] });
  assert.deepEqual(byTown.get('Eastport'), { n: 'Eastport', t: 'med', c: 1, s: ['SNOW GROW LLC'] });
});
