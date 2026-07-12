'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const census = require('../adapters/census-acs5.cjs');

let pass = 0, fail = 0;
function check(name, fn) {
    try { fn(); process.stderr.write('  ok  ' + name + '\n'); pass++; }
    catch (err) { process.stderr.write('  FAIL ' + name + ': ' + err.message + '\n'); fail++; }
}

check('composeGeoid builds a 10-digit canonical GEOID', () => {
    assert.strictEqual(census.composeGeoid('23', '001', '02060'), '2300102060');
    assert.strictEqual(census.composeGeoid(23, 1, 2060), '2300102060');
});

check('isValidGeoid accepts only 10-digit numeric strings', () => {
    assert.strictEqual(census.isValidGeoid('2300102060'), true);
    assert.strictEqual(census.isValidGeoid('23001'), false);
    assert.strictEqual(census.isValidGeoid('230010206X'), false);
    assert.strictEqual(census.isValidGeoid(null), false);
});

check('parseApiResponse parses header + rows, sorts by geoid, validates integer pop', () => {
    const api = [
        ['NAME', 'B01003_001E', 'state', 'county', 'county subdivision'],
        ['Bangor city, Penobscot County, Maine', '32073', '23', '019', '02740'],
        ['Portland city, Cumberland County, Maine', '68408', '23', '005', '60545'],
        ['Bad Row', null, '23', '001', '02060']  // null population should count as null, not skip
    ];
    const out = census.parseApiResponse(api);
    assert.strictEqual(out.diagnostics.total_rows, 3);
    assert.strictEqual(out.diagnostics.null_population, 1);
    assert.strictEqual(out.diagnostics.valid_rows, 2);
    // Sorted by geoid
    assert.strictEqual(out.rows[0].geoid, '2300560545'); // 23005...
    assert.strictEqual(out.rows[1].geoid, '2301902740');
});

check('parseApiResponse rejects negative population', () => {
    const api = [
        ['NAME', 'B01003_001E', 'state', 'county', 'county subdivision'],
        ['Bad', '-1', '23', '001', '02060']
    ];
    const out = census.parseApiResponse(api);
    assert.strictEqual(out.diagnostics.negative_population, 1);
    assert.strictEqual(out.diagnostics.valid_rows, 0);
});

check('parseApiResponse rejects malformed input', () => {
    try { census.parseApiResponse('not an array'); assert.fail('should throw'); }
    catch (err) { assert.strictEqual(err.code, 'CENSUS_BAD_SHAPE'); }
    try { census.parseApiResponse([]); assert.fail('should throw'); }
    catch (err) { assert.strictEqual(err.code, 'CENSUS_BAD_SHAPE'); }
    try { census.parseApiResponse([['NAME']]); assert.fail('should throw'); }
    catch (err) { assert.strictEqual(err.code, 'CENSUS_BAD_SHAPE'); }
});

check('toCanonicalRecords produces population + comparison rows with pinned vintage', () => {
    const rows = [{
        geoid: '2300102060', state_fips: '23', county_fips: '001',
        cousub_fips: '02060', census_name: 'Auburn city, Androscoggin County, Maine',
        population_estimate: 24071
    }];
    const out = census.toCanonicalRecords(rows);
    assert.strictEqual(out.population.length, 1);
    assert.strictEqual(out.population[0].acs_vintage, 2024);
    assert.strictEqual(out.population[0].variable_id, 'B01003_001E');
    assert.strictEqual(out.population[0].population_estimate, 24071);
    assert.strictEqual(out.comparison[0].display_name, 'Auburn city');
    assert.strictEqual(out.comparison[0].comparison_eligible, true);
});

check('adapter run() errors without mock or live key', async () => {
    // Live data supersedes the mock. When the operator provides
    // CENSUS_API_KEY the run() path takes the live branch. When both
    // are absent and the mock fixture file is gone, run() should
    // error rather than silently producing empty results.
    const prevKey = process.env.CENSUS_API_KEY;
    delete process.env.CENSUS_API_KEY;
    const prevGet = require('../lib/store.cjs').httpGet;
    require('../lib/store.cjs').httpGet = async () => {
        throw new Error('httpGet should not be called in this test');
    };
    try {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-census-'));
        let threw = null;
        try { await census.run(tmp); } catch (err) { threw = err; }
        assert.ok(threw, 'should throw without mock or live key');
        fs.rmSync(tmp, { recursive: true, force: true });
    } finally {
        require('../lib/store.cjs').httpGet = prevGet;
        if (prevKey !== undefined) process.env.CENSUS_API_KEY = prevKey;
    }
});

check('adapter run() with CENSUS_API_KEY env var attempts live API', async () => {
    // Set a dummy key; expect the adapter to attempt the live URL.
    // We do not hit the network — we mock httpGet.
    const prev = process.env.CENSUS_API_KEY;
    const prevGet = require('../lib/store.cjs').httpGet;
    let hit = null;
    require('../lib/store.cjs').httpGet = async (url, opts) => {
        hit = { url, opts };
        // Return the mock fixture shape (so the rest of the pipeline works).
        return {
            status: 200, headers: {},
            body: Buffer.from(JSON.stringify(require('../../../../docs/data/mdg-data/fixtures/census_acs5_2024_mock.json').response), 'utf8')
        };
    };
    process.env.CENSUS_API_KEY = 'TESTKEY123';
    // Use a minimal Census-shaped response so the parser has data.
    const fakeResponse = [['NAME', 'B01003_001E', 'state', 'county', 'county subdivision'],
        ['Auburn city, Androscoggin County, Maine', '24602', '23', '001', '02060']];
    require('../lib/store.cjs').httpGet = async (url, opts) => {
        hit = { url, opts };
        return { status: 200, headers: {},
            body: Buffer.from(JSON.stringify(fakeResponse), 'utf8') };
    };
    try {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-census-'));
        const out = await census.run(tmp);
        assert.strictEqual(out.source, 'live');
        assert.ok(hit.url.includes('key=TESTKEY123'),
            'live URL must include the API key, got: ' + hit.url);
        assert.ok(hit.url.includes('state%3A23') || hit.url.includes('state:23'),
            'live URL must scope to state:23, got: ' + hit.url);
        fs.rmSync(tmp, { recursive: true, force: true });
    } finally {
        require('../lib/store.cjs').httpGet = prevGet;
        if (prev === undefined) delete process.env.CENSUS_API_KEY;
        else process.env.CENSUS_API_KEY = prev;
    }
});

process.stderr.write('\ncensus-acs5.test.cjs: ' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail === 0 ? 0 : 1);