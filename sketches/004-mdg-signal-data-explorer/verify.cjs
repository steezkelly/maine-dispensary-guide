const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const htmlPath = path.join(__dirname, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
for (const [index, source] of scripts.entries()) {
  new Function(source);
  console.log(`inline script ${index + 1} parsed`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });

  await page.goto('http://127.0.0.1:8742/004-mdg-signal-data-explorer/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(__dirname, 'desktop-light.png'), fullPage: true });

  await page.click('[data-trend="transactions"]');
  await page.click('[data-geo="density"]');
  await page.click('[data-open-drawer]');
  await page.click('#themeToggle');

  const state = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    trend: document.querySelector('[data-trend="transactions"]').classList.contains('active'),
    geo: document.querySelector('[data-geo="density"]').classList.contains('active'),
    geoHeadline: document.getElementById('geoHeadline').textContent,
    drawerOpen: document.getElementById('premiumDrawer').classList.contains('open'),
    drawerAria: document.getElementById('premiumDrawer').getAttribute('aria-hidden'),
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    bars: [...document.querySelectorAll('.bar-fill')].map(el => Math.round(el.getBoundingClientRect().width))
  }));
  await page.screenshot({ path: path.join(__dirname, 'desktop-dark-paid-workspace.png'), fullPage: true });

  if (state.theme !== 'dark') throw new Error(`theme did not toggle: ${state.theme}`);
  if (!state.trend) throw new Error('transaction trend did not activate');
  if (!state.geo || !state.geoHeadline.startsWith('South Portland')) throw new Error('density comparison did not activate');
  if (!state.drawerOpen || state.drawerAria !== 'false') throw new Error('paid workspace drawer did not open');
  if (state.scrollWidth > state.innerWidth) throw new Error(`horizontal overflow: ${state.scrollWidth} > ${state.innerWidth}`);
  if (new Set(state.bars).size < 4) throw new Error(`bars are not visibly proportional: ${state.bars.join(',')}`);
  if (errors.length) throw new Error(errors.join('\n'));

  console.log(JSON.stringify(state, null, 2));
  console.log('visual interaction smoke passed');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
