const { chromium } = require('/home/steve/projects/maine-dispensary-guide/node_modules/playwright');
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
    page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });

    await page.goto('http://127.0.0.1:8743/005-mdg-signal-municipality-workflow/', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(__dirname, 'desktop-light.png'), fullPage: true });

    await page.fill('#municipalitySearch', 'Bang');
    await page.click('[data-result="Bangor"]');
    await page.click('#addPeer');
    await page.click('[data-open="evidence"]');
    const evidenceState = await page.evaluate(() => ({
      selected: document.getElementById('subjectName').textContent,
      licenses: document.getElementById('licenseValue').textContent,
      density: document.getElementById('densityValue').textContent,
      evidenceOpen: document.getElementById('evidenceDrawer').classList.contains('open'),
      evidenceAria: document.getElementById('evidenceDrawer').getAttribute('aria-hidden'),
      peerRows: document.querySelectorAll('#comparisonBody tr').length,
      bars: [...document.querySelectorAll('.density-fill')].map((element) => Math.round(element.getBoundingClientRect().width)),
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth
    }));
    if (evidenceState.selected !== 'Bangor, Maine' || evidenceState.licenses !== '10' || evidenceState.density !== '3.13') throw new Error(`municipality selection failed: ${JSON.stringify(evidenceState)}`);
    if (!evidenceState.evidenceOpen || evidenceState.evidenceAria !== 'false') throw new Error('evidence drawer did not open');
    if (evidenceState.peerRows !== 4 || new Set(evidenceState.bars).size < 3) throw new Error(`comparison did not render distinct peers: ${JSON.stringify(evidenceState)}`);
    if (evidenceState.scrollWidth > evidenceState.innerWidth) throw new Error(`desktop horizontal overflow: ${evidenceState.scrollWidth} > ${evidenceState.innerWidth}`);

    await page.keyboard.press('Escape');
    await page.click('[data-open="watch"]');
    await page.click('[data-condition="refresh"]');
    await page.click('#previewAlert');
    await page.keyboard.press('Escape');
    await page.click('#themeToggle');
    const paidState = await page.evaluate(() => ({
      theme: document.documentElement.dataset.theme,
      watchOpen: document.getElementById('watchDrawer').classList.contains('open'),
      watchAria: document.getElementById('watchDrawer').getAttribute('aria-hidden'),
      condition: document.querySelector('[data-condition="refresh"]').classList.contains('active'),
      alertCopy: document.getElementById('alertCopy').textContent,
      step: document.querySelector('[data-step].active').dataset.step,
      toast: document.getElementById('toast').textContent
    }));
    if (paidState.theme !== 'dark' || paidState.watchOpen || paidState.watchAria !== 'true') throw new Error(`paid preview/theme failed: ${JSON.stringify(paidState)}`);
    if (!paidState.condition || paidState.step !== 'alert' || !paidState.alertCopy.includes('newer verified source release')) throw new Error(`alert preview failed: ${JSON.stringify(paidState)}`);
    if (!paidState.toast.includes('no alert was saved or sent')) throw new Error(`prototype boundary toast missing: ${paidState.toast}`);
    await page.screenshot({ path: path.join(__dirname, 'desktop-dark-alert-preview.png'), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.keyboard.press('Escape');
    await page.goto('http://127.0.0.1:8743/005-mdg-signal-municipality-workflow/', { waitUntil: 'networkidle' });
    const mobileState = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      stepCount: document.querySelectorAll('[data-step]').length,
      minimumStepHeight: Math.min(...[...document.querySelectorAll('[data-step]')].map((element) => element.getBoundingClientRect().height))
    }));
    if (mobileState.scrollWidth > mobileState.innerWidth) throw new Error(`mobile horizontal overflow: ${mobileState.scrollWidth} > ${mobileState.innerWidth}`);
    if (mobileState.stepCount !== 5 || mobileState.minimumStepHeight < 44) throw new Error(`mobile workflow controls failed: ${JSON.stringify(mobileState)}`);
    await page.screenshot({ path: path.join(__dirname, 'mobile-light.png'), fullPage: true });

    if (errors.length) throw new Error(errors.join('\n'));
    console.log(JSON.stringify({ evidenceState, paidState, mobileState }, null, 2));
    console.log('municipality workflow visual interaction smoke passed');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
