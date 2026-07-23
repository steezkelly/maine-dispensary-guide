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
        if (eventCount < 3) throw new Error(`${route}: expected >=3 data-signal-event elements, got ${eventCount}`);
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
