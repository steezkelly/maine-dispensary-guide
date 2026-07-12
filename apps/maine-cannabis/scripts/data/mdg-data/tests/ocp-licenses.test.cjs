'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const ocpLic = require('../adapters/ocp-licenses.cjs');

let pass = 0, fail = 0;
function check(name, fn) {
    try { fn(); process.stderr.write('  ok  ' + name + '\n'); pass++; }
    catch (err) { process.stderr.write('  FAIL ' + name + ': ' + err.message + '\n'); fail++; }
}

const PAGE_URL = 'https://www.maine.gov/dafs/ocp/open-data/adult-use/licensee-search';

// Synthetic page HTML containing one Adult Use CSV link.
const SAMPLE_HTML = `<!doctype html><html><body>
<a href="/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/Adult_Use_Establishments_And_Contacts_2026_06_01.csv" title="Adult Use Data csv">Adult Use Data csv</a>
<a href="/something/else.xlsx" title="Adult Use Data xlsx">xlsx</a>
</body></html>`;

const SAMPLE_CSV = [
    '"LICENSE","LICENSE_TYPE","LICENSE_STATUS","DBA","LICENSE_CITY"',
    '"ACA001","Store","Active","STORE ONE","Portland"',
    '"ACA002","Store","Active","STORE TWO","Bangor"',
    '"ACA003","Cultivation, Tier 1 (Canopy)","Active","GREEN CO","Portland"',
    '"ACA004","Store","Pending Conditional","WAIT ONE","Portland"',
    '"ACA005","Store","Active","STORE ONE","Portland"',  // distinct license, same (DBA, city) as ACA001
    '"ACA001","Store","Active","STORE ONE","Portland"',  // exact duplicate of ACA001 row
    '"ACA006","Store","Conditional","SOMETHING","Augusta"'
].join('\n') + '\n';

check('discoverCsvUrl finds the title=Adult Use Data csv anchor', () => {
    const d = ocpLic.discoverCsvUrl(Buffer.from(SAMPLE_HTML, 'utf8'), PAGE_URL);
    assert.ok(d, 'should discover');
    assert.ok(d.url.endsWith('Adult_Use_Establishments_And_Contacts_2026_06_01.csv'));
    assert.strictEqual(d.filename, 'Adult_Use_Establishments_And_Contacts_2026_06_01.csv');
});

check('discoverCsvUrl returns null when no matching link exists', () => {
    const d = ocpLic.discoverCsvUrl(Buffer.from('<html><body>no csv here</body></html>', 'utf8'),
        PAGE_URL);
    assert.strictEqual(d, null);
});

check('parseCsv handles RFC-4180 quoting and emits rows', () => {
    const r = ocpLic.parseCsv(SAMPLE_CSV);
    assert.deepStrictEqual(r.headers, ['LICENSE', 'LICENSE_TYPE', 'LICENSE_STATUS', 'DBA', 'LICENSE_CITY']);
    assert.strictEqual(r.rows.length, 7);
    assert.strictEqual(r.rows[0].DBA, 'STORE ONE');
    assert.strictEqual(r.rows[1].LICENSE_CITY, 'Bangor');
});

check('profile enumerates status + type vocabularies', () => {
    const r = ocpLic.parseCsv(SAMPLE_CSV);
    const p = ocpLic.profile(r.rows, r.headers);
    assert.deepStrictEqual(p.license_status_vocabulary.sort(),
        ['Active', 'Conditional', 'Pending Conditional'].sort());
    assert.ok(p.license_type_vocabulary.includes('Store'));
    assert.ok(p.license_type_vocabulary.includes('Cultivation, Tier 1 (Canopy)'));
    assert.strictEqual(p.total_rows, 7);
});

check('profile detects license-number null/uniqueness', () => {
    const r = ocpLic.parseCsv(SAMPLE_CSV);
    const p = ocpLic.profile(r.rows, r.headers);
    // All LICENSE values are non-null and distinct across rows? No: ACA001 appears twice.
    assert.strictEqual(p.license_number.null_count, 0);
    assert.strictEqual(p.license_number.distinct, 6);
    assert.strictEqual(p.license_number.unique_among_non_null, false);
});

check('profile detects exact duplicate rows', () => {
    const r = ocpLic.parseCsv(SAMPLE_CSV);
    const p = ocpLic.profile(r.rows, r.headers);
    assert.strictEqual(p.exact_duplicate_rows.duplicate_row_count, 1);
    assert.strictEqual(p.exact_duplicate_rows.groups_with_duplicates, 1);
});

check('profile detects repeated (DBA, CITY) pairs with distinct licenses', () => {
    const r = ocpLic.parseCsv(SAMPLE_CSV);
    const p = ocpLic.profile(r.rows, r.headers);
    // STORE ONE + Portland: ACA001, ACA005 — 2 distinct licenses
    const matches = p.repeated_dba_city_with_distinct_license_numbers.sample
        .filter(x => x.dba_normalized === 'store one' && x.city_normalized === 'portland');
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].distinct_license_count, 2);
    assert.strictEqual(p.repeated_dba_city_with_distinct_license_numbers.count, 1);
});

check('buildFixture drops PII columns and keeps canonical headers', () => {
    const headers = ['LICENSE', 'LICENSE_TYPE', 'LICENSE_STATUS', 'DBA', 'LICENSE_CITY',
        'PRIMARY_CONTACT_EMAIL', 'LICENSE_ADDRESS', 'BUSINESS_ENTITY_MEMBER'];
    const r = ocpLic.parseCsv(SAMPLE_CSV);
    const f = ocpLic.buildFixture(r.rows, headers);
    assert.ok(!f.kept_headers.includes('PRIMARY_CONTACT_EMAIL'));
    assert.ok(!f.kept_headers.includes('LICENSE_ADDRESS'));
    assert.ok(!f.kept_headers.includes('BUSINESS_ENTITY_MEMBER'));
    assert.ok(f.kept_headers.includes('LICENSE'));
    assert.ok(f.sample_rows.length >= 1);
    assert.ok(f.sample_rows.every(s => !('PRIMARY_CONTACT_EMAIL' in s)));
});

check('adapter run() with mocked http stores CSV + emits profile + fixture', async () => {
    // Mock the store.httpGet function to return our sample CSV.
    const origGet = require('../lib/store.cjs').httpGet;
    require('../lib/store.cjs').httpGet = async (url, opts) => {
        if (url.endsWith('.csv')) {
            return { status: 200, headers: {}, body: Buffer.from(SAMPLE_CSV, 'utf8') };
        }
        return { status: 200, headers: {}, body: Buffer.from(SAMPLE_HTML, 'utf8') };
    };
    try {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-ocp-'));
        const out = await ocpLic.run(Buffer.from(SAMPLE_HTML, 'utf8'), PAGE_URL, tmp);
        assert.ok(out.raw_sha256);
        assert.ok(fs.existsSync(out.raw_path));
        assert.ok(out.profile.total_rows > 0);
        assert.ok(out.fixture.sample_rows.length > 0);
        fs.rmSync(tmp, { recursive: true, force: true });
    } finally {
        require('../lib/store.cjs').httpGet = origGet;
    }
});

check('adapter run() throws CSV_LINK_NOT_FOUND on bad HTML', async () => {
    const origGet = require('../lib/store.cjs').httpGet;
    require('../lib/store.cjs').httpGet = async () => ({
        status: 200, headers: {}, body: Buffer.from('<html>nothing</html>', 'utf8')
    });
    try {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-ocp-'));
        let threw = null;
        try {
            await ocpLic.run(Buffer.from('<html>nothing</html>', 'utf8'), PAGE_URL, tmp);
        } catch (err) { threw = err; }
        assert.ok(threw, 'should throw');
        assert.strictEqual(threw.code, 'CSV_LINK_NOT_FOUND');
        fs.rmSync(tmp, { recursive: true, force: true });
    } finally {
        require('../lib/store.cjs').httpGet = origGet;
    }
});

process.stderr.write('\nocp-licenses.test.cjs: ' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail === 0 ? 0 : 1);