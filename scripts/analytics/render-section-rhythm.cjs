// Capture multiple viewport screenshots at different scroll positions
// so we can visually inspect the A/B/C section rhythm down the page.
const { chromium } = require('playwright');

(async () => {
  const url = process.argv[2] || 'http://localhost:8421/';
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const targets = [
    { y: 119,   out: '/tmp/mdg-abc-01-hero.png' },
    { y: 1500,  out: '/tmp/mdg-abc-02-market-intel.png' },
    { y: 1700,  out: '/tmp/mdg-abc-03-mission-b.png' },
    { y: 2300,  out: '/tmp/mdg-abc-04-overview-a.png' },
    { y: 2900,  out: '/tmp/mdg-abc-05-ops-b.png' },
    { y: 4350,  out: '/tmp/mdg-abc-06-hubs-c.png' },
    { y: 4900,  out: '/tmp/mdg-abc-07-geo-b.png' },
    { y: 6360,  out: '/tmp/mdg-abc-08-whatsnew-c.png' },
    { y: 6950,  out: '/tmp/mdg-abc-09-stats-a.png' },
    { y: 7300,  out: '/tmp/mdg-abc-10-journey-b.png' },
    { y: 10600, out: '/tmp/mdg-abc-11-faq-b.png' },
    { y: 11600, out: '/tmp/mdg-abc-12-resources-c.png' },
    { y: 12400, out: '/tmp/mdg-abc-13-newsletter-a.png' },
  ];

  for (const t of targets) {
    await page.evaluate(`window.scrollTo(0, ${t.y})`);
    await page.waitForTimeout(250);
    await page.screenshot({ path: t.out, fullPage: false });
    console.log(`scrolled ${t.y}px → ${t.out}`);
  }

  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });