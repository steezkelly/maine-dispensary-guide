#!/usr/bin/env node
// Dashboard render verifier — opens the dashboard in headless Chromium,
// waits for all 4 Chart.js charts to mount, captures a screenshot,
// and prints any console errors.
const { chromium } = require('playwright');
const path = require('path');

const DASHBOARD = path.resolve(__dirname, '..', '..', 'apps', 'maine-cannabis', 'data', 'ga4-pull-2026-07-11', 'dashboard.html');
const OUT = '/tmp/ga4-dashboard-render.png';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1800 } });

  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => pageErrors.push(err.message));

  console.log('Loading:', DASHBOARD);
  await page.goto('file://' + DASHBOARD);

  // Wait for all 4 Chart.js charts to mount (Chart.getChart() is the v4 API)
  const chartStatus = await page.evaluate(async () => {
    const start = Date.now();
    while (Date.now() - start < 10000) {
      if (typeof Chart !== 'undefined' &&
          ['tsChart','pageChart','srcChart','devChart'].every(id => !!Chart.getChart(id))) break;
      await new Promise(r => setTimeout(r, 200));
    }
    const result = {};
    ['tsChart','pageChart','srcChart','devChart'].forEach(id => {
      const inst = Chart.getChart(id);
      result[id] = inst ? {
        type: inst.config.type,
        datasets: inst.data.datasets.length,
        labels: inst.data.labels.length,
        firstLabel: String(inst.data.labels[0] ?? ''),
        firstValue: inst.data.datasets[0]?.data[0],
      } : 'NOT_MOUNTED';
    });
    return result;
  });

  console.log('\n=== CHART MOUNT STATUS ===');
  for (const [id, status] of Object.entries(chartStatus)) {
    console.log(`${id.padEnd(12)}: ${typeof status === 'object' ? JSON.stringify(status) : status}`);
  }

  console.log('\n=== CONSOLE ERRORS ===');
  if (consoleErrors.length === 0) console.log('  (none)');
  else consoleErrors.forEach(e => console.log('  -', e));

  console.log('\n=== PAGE ERRORS ===');
  if (pageErrors.length === 0) console.log('  (none)');
  else pageErrors.forEach(e => console.log('  -', e));

  await page.screenshot({ path: OUT, fullPage: true });
  console.log('\nScreenshot saved:', OUT);

  // Pass/fail summary
  const allMounted = Object.values(chartStatus).every(s => typeof s === 'object');
  const noErrors = consoleErrors.length === 0 && pageErrors.length === 0;
  console.log('\n=== VERDICT ===');
  console.log('All 4 charts mounted:', allMounted ? 'YES' : 'NO');
  console.log('No console/page errors:', noErrors ? 'YES' : 'NO');
  console.log('Overall:', (allMounted && noErrors) ? 'PASS' : 'FAIL');

  await browser.close();
  process.exit((allMounted && noErrors) ? 0 : 1);
})().catch(e => { console.error('FATAL:', e.message); process.exit(2); });