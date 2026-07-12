'use strict';
// scripts/firecrawl-optin-scroll-extract.cjs
//
// Driver: opens the OCP opt-in Power BI dashboard via the Firecrawl
// /v2/scrape session, then uses /v2/scrape/<id>/interact (bash +
// agent-browser) to:
//   1. snapshot -i the accessibility tree (returns @eN refs)
//   2. click the "Scroll down" button (ref=e43)
//   3. repeat, parsing rows from each snapshot
//   4. dedupe rows by name across snapshots
//   5. stop the session with DELETE
//
// Outputs: a JSON file at the path given on the command line.

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_BASE = 'https://api.firecrawl.dev/v2';
const API_KEY = process.env.FIRECRAWL_API_KEY;
if (!API_KEY) { console.error('FIRECRAWL_API_KEY not set'); process.exit(2); }

function api(method, urlPath, body) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const url = new URL(API_BASE + urlPath);
        const req = https.request({
            method,
            hostname: url.hostname,
            path: url.pathname + url.search,
            headers: {
                'Authorization': 'Bearer ' + API_KEY,
                'Content-Type': 'application/json',
                ...(data ? {'Content-Length': Buffer.byteLength(data)} : {})
            }
        }, (res) => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                const text = Buffer.concat(chunks).toString('utf8');
                try {
                    resolve({ status: res.statusCode, json: JSON.parse(text) });
                } catch (e) {
                    resolve({ status: res.statusCode, json: null, raw: text });
                }
            });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

function parseRows(snapshotText) {
    // Parse gridcell entries that look like:
    //     - gridcell "Anson" [ref=e65]
    //     - gridcell "Y" [ref=e66]
    //     - gridcell "Y" [ref=e67]
    //     - gridcell "Y" [ref=e68]
    //     - gridcell "Y" [ref=e69]
    //     - gridcell "Select Row" [ref=e64]  <- start of next row
    // Group rows by detecting: a municipality name gridcell + 4 Y/N cells.
    const cells = [...snapshotText.matchAll(/gridcell\s+"([^"]+)"\s+\[ref=(e\d+)\]/g)];
    // Filter out "Select Row" placeholders.
    const cellsFiltered = cells.filter(m => m[1] !== 'Select Row');
    // Column headers (skipped): Retail, Cultivation, Manufacturing, Testing
    const headerWords = new Set(['Retail', 'Cultivation', 'Manufacturing', 'Testing']);
    // Build rows by scanning 5-tuples (name, retail, cultivation, manufacturing, testing).
    const rows = [];
    let i = 0;
    while (i + 4 < cellsFiltered.length) {
        const [name, retail, cultivation, manufacturing, testing] = [
            cellsFiltered[i][1], cellsFiltered[i+1][1],
            cellsFiltered[i+2][1], cellsFiltered[i+3][1], cellsFiltered[i+4][1]
        ];
        if (headerWords.has(name) || headerWords.has(retail)) {
            i++;
            continue;
        }
        // Validate the 4 status values are Y / N / P (or empty / '-')
        const validStatus = /^[YNP\-]$/;
        if ([retail, cultivation, manufacturing, testing].every(v => validStatus.test(v))) {
            rows.push({
                municipality: name,
                adult_use_store_opt_in: retail,
                cultivation_opt_in: cultivation,
                manufacturing_opt_in: manufacturing,
                testing_opt_in: testing
            });
            i += 5;
        } else {
            // Not a valid 5-tuple; advance by one and retry.
            i++;
        }
    }
    return rows;
}

async function interact(scrapeId, code, language) {
    language = language || 'node';
    const res = await api('POST', `/scrape/${scrapeId}/interact`,
        { code, language, timeout: 60 });
    if (res.status !== 200) {
        console.error('interact error', res.status, JSON.stringify(res.json).slice(0, 300));
        return null;
    }
    return res.json;
}

async function main() {
    const args = process.argv.slice(2);
    const outPath = args[0] || '/tmp/ocp_optin_full.json';
    const maxScrolls = parseInt(process.env.MAX_SCROLLS || '80', 10);

    // 1) Start the session by scraping the opt-in dashboard URL.
    const optinUrl = fs.readFileSync('/tmp/ocp_optin_pb.txt', 'utf8').trim();
    console.error('1) Scrape opt-in dashboard...');
    const scrapeRes = await api('POST', '/scrape', {
        url: optinUrl,
        formats: ['markdown'],
        waitFor: 8000,
        timeout: 60000
    });
    if (scrapeRes.status !== 200 || !scrapeRes.json.data) {
        console.error('scrape failed', scrapeRes.status, JSON.stringify(scrapeRes.json).slice(0, 500));
        process.exit(1);
    }
    const scrapeId = scrapeRes.json.data.metadata.scrapeId;
    console.error('   scrapeId =', scrapeId);

    // 2) Wait for table to render via interact session.
    console.error('2) Waiting for table to render...');
    await interact(scrapeId,
        `await page.waitForTimeout(10000); return 'waited';`, 'node');

    // 3) Iteratively snapshot + click Scroll down + dedupe rows.
    const seen = new Map(); // municipality -> row
    let lastMunis = '';
    let noChangeCount = 0;
    for (let i = 0; i < maxScrolls; i++) {
        const snap = await interact(scrapeId,
            `const text = require('child_process').execSync('agent-browser snapshot -i', {encoding:'utf8'}); return text;`,
            'node');
        if (!snap) break;
        const text = snap.stdout || snap.result || '';
        const rows = parseRows(text);
        let newOnes = 0;
        for (const r of rows) {
            if (!seen.has(r.municipality)) {
                seen.set(r.municipality, r);
                newOnes++;
            }
        }
        const munisList = [...seen.keys()].join(',');
        const progress = (munisList === lastMunis);
        lastMunis = munisList;
        if (progress) {
            noChangeCount++;
            if (noChangeCount >= 3) {
                console.error(`   scroll ${i+1}: no new rows for 3 iterations; stopping`);
                break;
            }
        } else {
            noChangeCount = 0;
        }
        console.error(`   scroll ${i+1}: parsed=${rows.length} unique=${seen.size} new=${newOnes}`);
        if (seen.size >= 500) {
            console.error('   hit 500 unique municipalities; stopping');
            break;
        }
        // Click Scroll down (ref=e43 per the snapshot). Try a small wait then click.
        const click = await interact(scrapeId,
            `await page.click('[ref=e43]').catch(async () => { await page.keyboard.press('PageDown'); }); await page.waitForTimeout(800); return 'clicked';`,
            'node');
        if (!click) break;
    }

    // 4) Stop the session.
    console.error('4) Stop session...');
    await api('DELETE', `/scrape/${scrapeId}/interact`);

    // 5) Save.
    const result = {
        scrape_id: scrapeId,
        captured_at: new Date().toISOString(),
        source: 'firecrawl_scrape+interact+agent-browser',
        municipalities: [...seen.values()],
        count: seen.size
    };
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
    console.error(`Saved ${seen.size} municipalities to ${outPath}`);
}

main().catch(err => {
    console.error('FATAL', err.message);
    process.exit(1);
});