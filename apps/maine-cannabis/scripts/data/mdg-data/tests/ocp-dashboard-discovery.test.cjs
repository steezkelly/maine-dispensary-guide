'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const ocpDash = require('../adapters/ocp-dashboard-discovery.cjs');
const store = require('../lib/store.cjs');

let pass = 0, fail = 0;
function check(name, fn) {
    try { fn(); process.stderr.write('  ok  ' + name + '\n'); pass++; }
    catch (err) { process.stderr.write('  FAIL ' + name + ': ' + err.message + '\n'); fail++; }
}

const PAGE_URL = 'https://www.maine.gov/dafs/ocp/open-data/adult-use/retail-sales';
const HTML = '<!doctype html><html><body>'
    + '<h1>OCP Retail Sales</h1>'
    + '<iframe allowfullscreen="true" frameborder="0" height="747" '
    + 'src="https://app.powerbigov.us/view?r=eyJrIjotMTIzNDU2Nzg5MCJ9" '
    + 'title="DAFS_OCP_PublicReporting_Adult Use Retail Sales Data" width="1200"></iframe>'
    + '</body></html>';

check('discoverIframe finds the Power BI embed', () => {
    const f = ocpDash.discoverIframe(Buffer.from(HTML, 'utf8'), PAGE_URL);
    assert.ok(f);
    assert.ok(f.url.startsWith('https://app.powerbigov.us/'));
    assert.ok(/Adult Use Retail Sales/.test(f.title));
});

check('discoverIframe returns null when no iframe exists', () => {
    const f = ocpDash.discoverIframe(Buffer.from('<html><body>no iframe</body></html>', 'utf8'), PAGE_URL);
    assert.strictEqual(f, null);
});

check('classifyDashboard flags Power BI with programmatic_data_api=false', () => {
    const d = ocpDash.classifyDashboard({
        url: 'https://app.powerbigov.us/view?r=abc',
        title: 'DAFS_OCP_PublicReporting_Adult Use Retail Sales Data'
    });
    assert.strictEqual(d.family, 'powerbi');
    assert.strictEqual(d.publisher, 'Microsoft Power BI');
    assert.strictEqual(d.programmatic_data_api, false);
});

check('classifyDashboard handles unknown dashboards', () => {
    const d = ocpDash.classifyDashboard({
        url: 'https://example.com/dashboard',
        title: 'whatever'
    });
    assert.strictEqual(d.family, 'unknown');
});

check('run() with no page.html throws NO_PAGE_HTML', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-dash-'));
    // Write a fake source registry file but no page.html for this source.
    const fakeSrc = { source_id: 'ocp_retail_sales',
        authoritative_page_url: PAGE_URL };
    let threw = null;
    try { await ocpDash.run(tmp, fakeSrc); }
    catch (err) { threw = err; }
    assert.ok(threw);
    assert.strictEqual(threw.code, 'NO_PAGE_HTML');
    fs.rmSync(tmp, { recursive: true, force: true });
});

check('run() with archived page.html emits a transport_discovery report', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-dash-'));
    // Stage a page.html so the adapter can find it
    const wrote = store.writeRawArtifact(tmp, 'ocp_retail_sales',
        new Date().toISOString(), Buffer.from(HTML, 'utf8'), 'page.html');
    const fakeSrc = { source_id: 'ocp_retail_sales',
        authoritative_page_url: PAGE_URL };
    const out = await ocpDash.run(tmp, fakeSrc);
    assert.strictEqual(out.transport_discovery.dashboard_family, 'powerbi');
    assert.ok(out.transport_discovery.iframe_url);
    assert.strictEqual(out.transport_discovery.programmatic_data_api, false);
    fs.rmSync(tmp, { recursive: true, force: true });
});

process.stderr.write('\nocp-dashboard-discovery.test.cjs: ' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail === 0 ? 0 : 1);