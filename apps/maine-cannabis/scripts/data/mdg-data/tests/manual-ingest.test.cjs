'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const salesManual = require('../adapters/ocp-retail-sales-manual.cjs');
const optinManual = require('../adapters/ocp-optin-manual.cjs');
const store = require('../lib/store.cjs');

let pass = 0, fail = 0;
function check(name, fn) {
    try { fn(); process.stderr.write('  ok  ' + name + '\n'); pass++; }
    catch (err) { process.stderr.write('  FAIL ' + name + ': ' + err.message + '\n'); fail++; }
}

const SAMPLE_SALES_CSV = '"Month","Total Sales ($)","Active Stores"\n' +
    '"2025-01",12450000,184\n' +
    '"2025-02",11200000,185\n' +
    '"2025-03",13900000,187\n';

const SAMPLE_OPTIN_CSV = '"Municipality","Adult-Use Store Opt-in","Cultivation Opt-in","Manufacturing Opt-in"\n' +
    '"Auburn",true,false,false\n' +
    '"Bangor",true,true,false\n' +
    '"Portland",true,true,true\n';

function setupManualDir(rootDir, sourceId, filename, csvContent) {
    const dir = path.join(rootDir, 'raw', sourceId, 'manual', '2026', '07', '12');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, filename), csvContent);
    return dir;
}

check('sales manual discover returns empty when no files', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-manual-'));
    const r = salesManual.discoverManualArtifacts(tmp);
    assert.deepStrictEqual(r, []);
    fs.rmSync(tmp, { recursive: true, force: true });
});

check('sales manual discover finds a CSV and profiles columns', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-manual-'));
    setupManualDir(tmp, 'ocp_retail_sales', 'sales_revenue.csv', SAMPLE_SALES_CSV);
    const r = salesManual.run(tmp);
    assert.strictEqual(r.artifacts.length, 1);
    assert.strictEqual(r.artifacts[0].tab_slug, 'sales_revenue');
    assert.strictEqual(r.artifacts[0].profile.row_count, 3);
    assert.deepStrictEqual(r.artifacts[0].profile.headers,
        ['Month', 'Total Sales ($)', 'Active Stores']);
    // Column profile
    const pop = r.artifacts[0].profile.column_profiles['Total Sales ($)'];
    assert.strictEqual(pop.int_like, 3);
    assert.strictEqual(pop.distinct, 3);
    // Raw archived at content-addressed path
    assert.ok(fs.existsSync(r.artifacts[0].raw_path));
    fs.rmSync(tmp, { recursive: true, force: true });
});

check('sales manual handles all 3 expected tabs', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-manual-'));
    const dir = path.join(tmp, 'raw', 'ocp_retail_sales', 'manual', '2026', '07', '12');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'sales_revenue.csv'), SAMPLE_SALES_CSV);
    fs.writeFileSync(path.join(dir, 'sales_transactions.csv'),
        '"Month","Total Transactions"\n"2025-01",212000\n"2025-02",195000\n');
    fs.writeFileSync(path.join(dir, 'price_per_gram.csv'),
        '"Month","Avg Price per Gram ($)","Median Price per Gram ($)"\n"2025-01",11.20,10.50\n');
    const r = salesManual.run(tmp);
    assert.strictEqual(r.artifacts.length, 3);
    const tabs = r.artifacts.map(a => a.tab_slug).sort();
    assert.deepStrictEqual(tabs, ['price_per_gram', 'sales_revenue', 'sales_transactions']);
    fs.rmSync(tmp, { recursive: true, force: true });
});

check('sales manual ignores files that are not the expected tabs', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-manual-'));
    const dir = path.join(tmp, 'raw', 'ocp_retail_sales', 'manual', '2026', '07', '12');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'sales_revenue.csv'), SAMPLE_SALES_CSV);
    fs.writeFileSync(path.join(dir, 'random_other_file.csv'), 'foo,bar\n1,2\n');
    const r = salesManual.run(tmp);
    assert.strictEqual(r.artifacts.length, 2);  // unknown tab still gets archived
    fs.rmSync(tmp, { recursive: true, force: true });
});

check('optin manual discover and profile', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-manual-'));
    setupManualDir(tmp, 'ocp_optin', 'optin_by_municipality.csv', SAMPLE_OPTIN_CSV);
    const r = optinManual.run(tmp);
    assert.strictEqual(r.artifacts.length, 1);
    assert.strictEqual(r.artifacts[0].tab_slug, 'optin_by_municipality');
    assert.strictEqual(r.artifacts[0].profile.row_count, 3);
    const au = r.artifacts[0].profile.column_profiles['Adult-Use Store Opt-in'];
    assert.strictEqual(au.bool_like, 3);
    assert.deepStrictEqual(au.sample_values.sort(), ['true']);
    fs.rmSync(tmp, { recursive: true, force: true });
});

check('run() returns empty artifacts + explanatory note when no files', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-manual-'));
    const r = salesManual.run(tmp);
    assert.strictEqual(r.artifacts.length, 0);
    assert.ok(/drop CSVs/.test(r.note));
    fs.rmSync(tmp, { recursive: true, force: true });
});

process.stderr.write('\nmanual-ingest.test.cjs: ' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail === 0 ? 0 : 1);