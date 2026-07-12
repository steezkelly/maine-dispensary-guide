'use strict';
const assert = require('assert');
const xw = require('../lib/crosswalk.cjs');

let pass = 0, fail = 0;
function check(name, fn) {
    try { fn(); process.stderr.write('  ok  ' + name + '\n'); pass++; }
    catch (err) { process.stderr.write('  FAIL ' + name + ': ' + err.message + '\n'); fail++; }
}

check('crosswalk JSON parses and validates', () => {
    const cw = xw.loadCrosswalk();
    assert.strictEqual(cw.schema_version, 1);
    assert.ok(Array.isArray(cw.aliases) && cw.aliases.length > 0);
});

check('every alias match_method is exact_alias or manual', () => {
    const cw = xw.loadCrosswalk();
    for (const a of cw.aliases) {
        assert.ok(['exact_alias', 'manual'].includes(a.match_method),
            `bad match_method for ${a.source_value}: ${a.match_method}`);
    }
});

check('every alias with geoid is exactly 10 digits', () => {
    const cw = xw.loadCrosswalk();
    for (const a of cw.aliases) {
        if (a.geoid !== null && a.geoid !== undefined) {
            assert.ok(/^[0-9]{10}$/.test(a.geoid),
                `bad geoid for ${a.source_value}: ${a.geoid}`);
        }
    }
});

check('every alias is reviewed=true', () => {
    const cw = xw.loadCrosswalk();
    for (const a of cw.aliases) {
        assert.strictEqual(a.reviewed, true, `${a.source_value} not reviewed`);
    }
});

check('unmatched_queue contains no alias values', () => {
    const cw = xw.loadCrosswalk();
    const aliasValues = new Set(cw.aliases.map(a => a.source_value));
    for (const u of cw.unmatched_queue) {
        assert.ok(!aliasValues.has(u), `unmatched_queue contains alias: ${u}`);
    }
});

check('resolve returns alias for known city', () => {
    const cw = xw.loadCrosswalk();
    const r = xw.resolve(cw, 'Portland');
    assert.strictEqual(r.match_method, 'exact_alias');
    assert.strictEqual(r.geoid, '2300560545');
    assert.strictEqual(r.unmatched, false);
});

check('resolve handles "So Portland" abbreviation', () => {
    const cw = xw.loadCrosswalk();
    const r = xw.resolve(cw, 'So Portland');
    assert.strictEqual(r.match_method, 'manual');
    assert.strictEqual(r.normalized_value, 'South Portland');
    assert.strictEqual(r.geoid, '2300570590');
});

check('resolve returns unmatched=true for unknown city', () => {
    const cw = xw.loadCrosswalk();
    const r = xw.resolve(cw, 'Atlantis');
    assert.strictEqual(r.unmatched, true);
    assert.strictEqual(r.geoid, null);
});

check('resolve handles "TBD" as unmatched with explicit note', () => {
    const cw = xw.loadCrosswalk();
    const r = xw.resolve(cw, 'TBD');
    assert.strictEqual(r.unmatched, true);
    assert.strictEqual(r.note, 'unmatched');
});

check('resolve handles "Baring Plt" -> Baring Plantation', () => {
    const cw = xw.loadCrosswalk();
    const r = xw.resolve(cw, 'Baring Plt');
    assert.strictEqual(r.normalized_value, 'Baring Plantation');
});

check('coverage: at least 20 OCP cities have a GEOID', () => {
    const cw = xw.loadCrosswalk();
    const withGeoid = cw.aliases.filter(a => a.geoid !== null).length;
    assert.ok(withGeoid >= 20,
        `only ${withGeoid} aliases have a geoid; need >= 20`);
});

check('coverage: TBD and TO BE DETERMINED are in unmatched_queue', () => {
    const cw = xw.loadCrosswalk();
    assert.ok(cw.unmatched_queue.includes('TBD'));
    assert.ok(cw.unmatched_queue.includes('TO BE DETERMINED'));
});

process.stderr.write('\ncrosswalk.test.cjs: ' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail === 0 ? 0 : 1);