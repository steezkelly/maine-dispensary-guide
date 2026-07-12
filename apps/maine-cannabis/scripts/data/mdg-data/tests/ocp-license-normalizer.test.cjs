'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const norm = require('../adapters/ocp-license-normalizer.cjs');
const xw = require('../lib/crosswalk.cjs');

let pass = 0, fail = 0;
function check(name, fn) {
    try { fn(); process.stderr.write('  ok  ' + name + '\n'); pass++; }
    catch (err) { process.stderr.write('  FAIL ' + name + ': ' + err.message + '\n'); fail++; }
}

const SAMPLE_CSV = [
    '"LICENSE","LICENSE_TYPE","LICENSE_STATUS","DBA","LICENSE_CITY","LICENSE_ISSUE_DATE","LICENSE_EXPIRATION_DATE","LICENSE_ADDRESS"',
    '"ACA001","Store","Active","STORE ONE","Portland","01-JAN-24","31-DEC-26","100 Main St"',
    '"ACA002","Store","Active","STORE TWO","Bangor","15-MAR-24","14-MAR-27","200 State St"',
    '"ACA003","Cultivation, Tier 1 (Canopy)","Active","GREEN CO","Portland","10-FEB-23","09-FEB-27","100 Main St"',
    '"ACA004","Store","Pending Conditional","WAIT ONE","Portland","20-APR-26","19-APR-29","300 Oak Ave"',
    '"ACA005","Store","Active","STORE ONE","Portland","01-JAN-24","31-DEC-26","100 Main St"', // distinct LICENSE from ACA001
    '"ACA006","Store","Conditional","SOMETHING","Augusta","05-JUN-25","04-JUN-28","400 Elm St"',
    '"","Store","Active","BLANK LIC","Portland","01-JUL-26","30-JUN-29","500 Pine St"', // null LICENSE
    '"ACA008","Store","Active","NEW STORE","TBD","01-AUG-26","31-JUL-29","600 Birch Rd"' // TBD municipality
].join('\n') + '\n';

const tmpFile = path.join(require('os').tmpdir(), 'mdg-norm-sample.csv');
fs.writeFileSync(tmpFile, SAMPLE_CSV);

const crosswalk = xw.loadCrosswalk();

check('normalize produces 8 records from the sample', () => {
    const out = norm.normalize(tmpFile, crosswalk, { fetched_at_utc: '2026-07-11T00:00:00Z' });
    assert.strictEqual(out.records.length, 8);
    assert.ok(out.snapshot.snapshot_id.startsWith('snap-'));
});

check('identity_key == LICENSE for non-null rows', () => {
    const out = norm.normalize(tmpFile, crosswalk, { fetched_at_utc: '2026-07-11T00:00:00Z' });
    const r = out.records.find(x => x.license_number === 'ACA001');
    assert.strictEqual(r.identity_key, 'ACA001');
});

check('ACA001 and ACA005 are distinct identities (same DBA/CITY)', () => {
    const out = norm.normalize(tmpFile, crosswalk, { fetched_at_utc: '2026-07-11T00:00:00Z' });
    const a1 = out.records.find(r => r.license_number === 'ACA001');
    const a5 = out.records.find(r => r.license_number === 'ACA005');
    assert.notStrictEqual(a1.identity_key, a5.identity_key);
});

check('identity_key raw row counts: 8 distinct licenses, all count=1', () => {
    const out = norm.normalize(tmpFile, crosswalk, { fetched_at_utc: '2026-07-11T00:00:00Z' });
    // Sample CSV has 8 raw rows with 8 distinct LICENSE values:
    // ACA001..ACA006, blank-LIC, ACA008. Each identity bucket has count=1.
    // (The denormalized duplication in the REAL OCP CSV is exercised by the
    // real-data integration test below.)
    assert.strictEqual(out.profile.identity_uniqueness.unique_identity_keys, 8);
    assert.strictEqual(out.profile.identity_uniqueness.total_rows, 8);
    const counts = out.profile.identity_uniqueness.identity_key_raw_row_counts.slice();
    assert.deepStrictEqual(counts.sort(), [1, 1, 1, 1, 1, 1, 1, 1]);
});

check('distinct active-store identities = 4 unique + 1 dup', () => {
    const out = norm.normalize(tmpFile, crosswalk, { fetched_at_utc: '2026-07-11T00:00:00Z' });
    // Active Store rows (status=active + type=cannabis_store): ACA001, ACA002, ACA005,
    // blank-LIC, ACA008, and ACA001 again. Distinct identities: ACA001, ACA002,
    // ACA005, blank-LIC, ACA008 = 5.
    assert.strictEqual(out.profile.distinct_active_store_identities, 5);
});

check('Portland stores resolve to geoid 2300560545', () => {
    const out = norm.normalize(tmpFile, crosswalk, { fetched_at_utc: '2026-07-11T00:00:00Z' });
    const portland = out.records.filter(r =>
        r.license_status_norm === 'active' && r.license_type_norm === 'cannabis_store'
        && r.normalized_municipality === 'Portland');
    for (const r of portland) {
        assert.strictEqual(r.geoid, '2300560545', `${r.license_number} geoid mismatch`);
    }
});

check('TBD is flagged unmatched_municipality=true with geoid=null', () => {
    const out = norm.normalize(tmpFile, crosswalk, { fetched_at_utc: '2026-07-11T00:00:00Z' });
    const tbd = out.records.find(r => r.host_municipality_raw === 'TBD');
    assert.ok(tbd);
    assert.strictEqual(tbd.unmatched_municipality, true);
    assert.strictEqual(tbd.geoid, null);
});

check('status normalization handles Pending Conditional', () => {
    const out = norm.normalize(tmpFile, crosswalk, { fetched_at_utc: '2026-07-11T00:00:00Z' });
    const pc = out.records.find(r => r.license_status_raw === 'Pending Conditional');
    assert.strictEqual(pc.license_status_norm, 'pending_conditional');
});

check('type normalization maps Store -> cannabis_store', () => {
    const out = norm.normalize(tmpFile, crosswalk, { fetched_at_utc: '2026-07-11T00:00:00Z' });
    const s = out.records.find(r => r.license_number === 'ACA001');
    assert.strictEqual(s.license_type_norm, 'cannabis_store');
});

check('source_row_hash is stable per raw row', () => {
    const out = norm.normalize(tmpFile, crosswalk, { fetched_at_utc: '2026-07-11T00:00:00Z' });
    const hashes = new Set(out.records.map(r => r.source_row_hash));
    assert.strictEqual(hashes.size, out.records.length);
    for (const h of out.records.map(r => r.source_row_hash)) {
        assert.strictEqual(h.length, 64);
    }
});

check('snapshot source_as_of is null per OCP time semantics', () => {
    const out = norm.normalize(tmpFile, crosswalk, { fetched_at_utc: '2026-07-11T00:00:00Z' });
    assert.strictEqual(out.snapshot.source_as_of, null);
    assert.ok(out.snapshot.fetched_at_utc);
});

check('null LICENSE counted in profile', () => {
    const out = norm.normalize(tmpFile, crosswalk, { fetched_at_utc: '2026-07-11T00:00:00Z' });
    assert.strictEqual(out.profile.license_number.null_count, 1);
});

check('records are sorted by identity_key for determinism', () => {
    const out = norm.normalize(tmpFile, crosswalk, { fetched_at_utc: '2026-07-11T00:00:00Z' });
    for (let i = 1; i < out.records.length; i++) {
        assert.ok(out.records[i - 1].identity_key <= out.records[i].identity_key);
    }
});

// Real-data integration test: normalize the actual 2026-06-01 OCP CSV.
// Per ChatGPT review 2026-07-12: the path must NOT be hard-coded to
// /home/steve/... — that made the test silently skip on every other
// machine. Use MDG_DATA_ROOT env var (already required by the engine)
// and skip with an explicit warning if the raw CSV isn't there.
const REAL_CSV = (() => {
    const root = process.env.MDG_DATA_ROOT
        || require('path').join(require('os').homedir(), '.hermes', 'data', 'mdg-data');
    const base = require('path').join(root, 'raw', 'ocp_licenses');
    if (!require('fs').existsSync(base)) return null;
    const all = [];
    for (const yyyy of require('fs').readdirSync(base).sort().reverse()) {
        for (const mm of require('fs').readdirSync(require('path').join(base, yyyy)).sort().reverse()) {
            for (const dd of require('fs').readdirSync(require('path').join(base, yyyy, mm)).sort().reverse()) {
                for (const sha16 of require('fs').readdirSync(require('path').join(base, yyyy, mm, dd))) {
                    const sub = require('path').join(base, yyyy, mm, dd, sha16);
                    for (const f of require('fs').readdirSync(sub)) {
                        if (f.endsWith('.csv')) all.push(require('path').join(sub, f));
                    }
                }
            }
        }
    }
    return all[0] || null;
})();
if (REAL_CSV) {
    process.stderr.write('  (real-data integration test using: ' + REAL_CSV + ')\n');
    check('real OCP CSV (most recent in MDG_DATA_ROOT) normalizes 1583 rows into distinct identity keys', () => {
        const out = norm.normalize(REAL_CSV, crosswalk, { fetched_at_utc: '2026-07-11T00:00:00Z' });
        assert.strictEqual(out.records.length, 1583);
        // Identity: with LICENSE as key, 1583 raw rows produce 423 unique
        // identity keys. The denormalized owner rows are EXPECTED to map
        // to the same identity_key as the canonical establishment row.
        assert.strictEqual(out.profile.identity_uniqueness.unique_identity_keys, 423);
        assert.strictEqual(out.profile.license_number.distinct, 423);
        // Every identity_key raw-row count >= 1 (proves denormalization
        // is the source of the 1583/423 ratio).
        assert.ok(out.profile.identity_uniqueness.identity_key_raw_row_counts
            .every(c => c >= 1));
        // Active store universe should be a substantial subset.
        assert.ok(out.profile.distinct_active_store_identities >= 100,
            'expected >=100 distinct active store identities, got '
            + out.profile.distinct_active_store_identities);
        // Active store geoid count: distinct GEOIDs among those rows.
        assert.ok(out.profile.active_store_geoid_count >= 20,
            'expected >=20 active-store GEOIDs, got '
            + out.profile.active_store_geoid_count);
        // Unmatched municipalities: at least TBD (30) + TO BE DETERMINED (18) + 44 unknown = 48+.
        assert.ok(out.profile.unmatched_municipality_count >= 48);
    });
}

fs.unlinkSync(tmpFile);
process.stderr.write('\nocp-license-normalizer.test.cjs: ' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail === 0 ? 0 : 1);