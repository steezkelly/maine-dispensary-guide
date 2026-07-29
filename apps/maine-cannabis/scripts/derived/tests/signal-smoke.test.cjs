'use strict';

/**
 * Focused Playwright smoke for the built /signal/ routes.
 *
 * Checks:
 *  - both routes return 200 and contain expected content
 *  - signal intent tracker is wired (button[data-signal-event] is present)
 *  - drawers toggle via button click + Escape
 *  - no horizontal overflow at 1440 and 390 widths
 *  - no contact_email / contact_phone leaks anywhere on the page
 */

const { chromium } = require('/home/steve/projects/maine-dispensary-guide/node_modules/playwright');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const DIST = '/home/steve/.cache/mdg-signal-vertical-slice/apps/maine-cannabis/dist/signal';
const PORT = Number(process.env.SIGNAL_SMOKE_PORT || 8771);

function start() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(DIST, url);
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      const withSlash = url.endsWith('/') ? url : `${url}/`;
      file = path.join(DIST, withSlash, 'index.html');
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.statusCode = 404; res.end('not found'); return;
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(fs.readFileSync(file, 'utf8'));
  });
  return new Promise((resolve) => {
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

(async () => {
  const server = await start();
  let browser;
  let exit = 0;
  try {
    browser = await chromium.launch({ headless: true });
    const errors = [];

    for (const route of ['/', '/portland/', '/south-portland/', '/kittery/']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
      page.on('pageerror', (e) => errors.push(`pageerror ${route}: ${e.message}`));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(`console ${route}: ${m.text()}`); });
      const url = `http://127.0.0.1:${PORT}${route}`;
      const resp = await page.goto(url, { waitUntil: 'load' });
      if (!resp || resp.status() !== 200) throw new Error(`bad status for ${url}: ${resp && resp.status()}`);
      const html = await page.content();
      if (/contact_email/.test(html)) throw new Error(`${route}: contact_email leaked`);
      if (/contact_phone/.test(html)) throw new Error(`${route}: contact_phone leaked`);
      // signal intent events must be wired on research pages
      if (route !== '/') {
        const eventCount = await page.locator('[data-signal-event]').count();
        if (eventCount < 2) throw new Error(`${route}: expected >=2 data-signal-event elements (drawers + toast), got ${eventCount}`);
        // workspace interactivity: alert-condition buttons + pool entries
        const alertBtnCount = await page.locator('[data-signal-alert-condition]').count();
        if (alertBtnCount !== 3) throw new Error(`${route}: expected 3 alert-condition buttons, got ${alertBtnCount}`);
        const poolCount = await page.locator('[data-pool-entry]').count();
        if (poolCount < 1) throw new Error(`${route}: expected >=1 peer-pool entry, got ${poolCount}`);
        // toast element exists and starts hidden
        const toastVisible = await page.evaluate(() => {
          const el = document.getElementById('toast');
          return el ? el.getAttribute('data-visible') : 'missing';
        });
        if (toastVisible !== 'false') throw new Error(`${route}: #toast must start data-visible=false, got ${toastVisible}`);
        // click the first pool entry (Swap to <city>) — third peer row should change
        const thirdPeerBefore = await page.evaluate(() => {
          const rows = Array.from(document.querySelectorAll('[data-peer]'));
          return rows.length ? rows[rows.length - 1].getAttribute('data-peer') : null;
        });
        await page.locator('[data-pool-entry]').first().click();
        const thirdPeerAfter = await page.evaluate(() => {
          const rows = Array.from(document.querySelectorAll('[data-peer]'));
          return rows.length ? rows[rows.length - 1].getAttribute('data-peer') : null;
        });
        if (thirdPeerAfter === thirdPeerBefore) {
          throw new Error(`${route}: clicking a pool entry should change the third peer slot`);
        }
        // toast should now be visible
        const toastVisibleAfter = await page.evaluate(() => document.getElementById('toast').getAttribute('data-visible'));
        if (toastVisibleAfter !== 'true') throw new Error(`${route}: toast should be visible after swap, got ${toastVisibleAfter}`);
        // alert-condition buttons live inside the alert drawer; open it
        // first (the drawer is correctly hidden off-screen now that the
        // scoped-CSS fix applies .drawer { transform: translateX(100%) }).
        await page.click('[data-open-drawer="alert"]');
        const copyBefore = await page.evaluate(() => document.getElementById('alertCopy').textContent);
        await page.locator('[data-signal-alert-condition="license"]').click();
        const copyAfter = await page.evaluate(() => document.getElementById('alertCopy').textContent);
        if (copyBefore === copyAfter) throw new Error(`${route}: license condition click should update alertCopy`);
        if (!copyAfter.includes('old and new license counts')) throw new Error(`${route}: alert copy did not change to license text, got: ${copyAfter}`);
        await page.keyboard.press('Escape');
      }
      // drawer toggle on a research page only
      if (route !== '/') {
        await page.click('[data-open-drawer="evidence"]');
        const open = await page.evaluate(() => document.getElementById('evidenceDrawer').getAttribute('aria-hidden'));
        if (open !== 'false') throw new Error(`${route}: evidence drawer did not open`);
        await page.keyboard.press('Escape');
        const closed = await page.evaluate(() => document.getElementById('evidenceDrawer').getAttribute('aria-hidden'));
        if (closed !== 'true') throw new Error(`${route}: escape did not close evidence drawer`);
      }
      const dims1440 = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
      if (dims1440.sw > dims1440.iw + 1) throw new Error(`${route}: desktop overflow ${dims1440.sw} > ${dims1440.iw}`);
      await page.setViewportSize({ width: 390, height: 844 });
      const dims390 = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
      if (dims390.sw > dims390.iw + 1) throw new Error(`${route}: mobile overflow ${dims390.sw} > ${dims390.iw}`);
      await page.close();
      console.log(`PASS ${route}`);
    }
    if (errors.length) throw new Error(errors.join('\n'));
    console.log('signal smoke passed');
  } catch (err) {
    console.error(err.stack || err);
    exit = 1;
  } finally {
    if (browser) await browser.close();
    server.close();
  }
  process.exit(exit);
})();
