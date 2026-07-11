#!/usr/bin/env node
// Render the local MDG homepage and screenshot for visual review.
const { chromium } = require('playwright');
const fs = require('node:fs');

(async () => {
  const url = process.argv[2] || 'http://localhost:8421/';
  const outFull = process.argv[3] || '/tmp/mdg-render-full.png';
  const outView = process.argv[4] || '/tmp/mdg-render-viewport.png';

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log('document height:', height, 'px');

  await page.screenshot({ path: outFull, fullPage: true });
  await page.screenshot({ path: outView, fullPage: false });

  console.log('fullpage screenshot:', outFull, fs.statSync(outFull).size, 'bytes');
  console.log('viewport screenshot:', outView, fs.statSync(outView).size, 'bytes');

  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });