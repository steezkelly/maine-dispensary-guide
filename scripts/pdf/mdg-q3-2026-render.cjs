'use strict';

/**
 * scripts/pdf/mdg-q3-2026-render.cjs
 *
 * Q3 2026 PDF render pipeline. Consumes the 11 chart-data JSONs from
 * sub-card 2a and produces the Maine Cannabis Industry Report Q3 2026
 * PDF via Puppeteer HTML→PDF.
 *
 * Run with: node scripts/pdf/mdg-q3-2026-render.cjs
 */

const { readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const { resolve } = require('node:path');

const REPO = resolve(__dirname, '..', '..');
const DATA_DIR = resolve(REPO, 'apps/maine-cannabis/scripts/pdf/data/q3-2026');
const OUT_DIR = resolve(REPO, 'apps/maine-cannabis/public/pdfs');
const OUT_PDF = resolve(OUT_DIR, 'maine-cannabis-industry-report-q3-2026.pdf');

function loadChart(id) {
  return JSON.parse(readFileSync(resolve(DATA_DIR, id + '.json'), 'utf8'));
}

function fmt(n) {
  if (typeof n !== 'number') return String(n);
  if (Number.isInteger(n)) return n.toLocaleString('en-US');
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function chartTable(chart) {
  const rows = (chart.data || chart.tiers || [])
    .map((d) => {
      const label = d.label || d.tier || '';
      const value = d.value !== undefined ? fmt(d.value) : (d.status || '');
      const kind = d.kind || '';
      return `<tr><td>${label}</td><td class="num">${value}</td><td class="kind">${kind}</td></tr>`;
    })
    .join('\n');
  return `
    <figure class="chart">
      <figcaption>${chart.title}</figcaption>
      <table>
        <thead><tr><th>Label</th><th>Value</th><th>Kind</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="source"><small>Source: ${chart.source.url} — retrieved ${chart.source.retrieval_date} — ${chart.source.status}</small></p>
      <p class="note"><small>${chart.note || ''}</small></p>
    </figure>`;
}

function buildHtml() {
  const c1 = loadChart('adult-use-monthly-sales-trailing-12m');
  const c2 = loadChart('2026-ytd-kpi-cards');
  const c3 = loadChart('bud-flower-price-compression');
  const c4 = loadChart('product-mix-shift');
  const c5 = loadChart('ocp-vs-mrs-monthly-lens');
  const c6 = loadChart('adult-use-tax-receipts');
  const c7 = loadChart('active-adult-use-license-mix');
  const c8 = loadChart('adult-use-footprint-by-county');
  const c9 = loadChart('medical-program-divergence');
  const c10 = loadChart('medical-access-geography');
  const c11 = loadChart('market-structure-snapshot');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Maine Cannabis Industry Report — Q3 2026</title>
<style>
  @page { size: letter; margin: 0.75in; }
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 11pt; line-height: 1.5; color: #1a1a1a; }
  h1 { font-size: 22pt; margin: 0 0 4pt; }
  h2 { font-size: 16pt; margin: 18pt 0 6pt; page-break-after: avoid; }
  h3 { font-size: 13pt; margin: 12pt 0 4pt; }
  .subtitle { font-size: 12pt; color: #555; margin: 0 0 24pt; }
  .meta { font-size: 9pt; color: #777; margin: 2pt 0; }
  .section { page-break-inside: avoid; margin-bottom: 16pt; }
  .chart { margin: 12pt 0; page-break-inside: avoid; }
  .chart figcaption { font-weight: bold; font-size: 10pt; margin-bottom: 4pt; }
  table { border-collapse: collapse; width: 100%; font-size: 9pt; }
  th, td { border: 1px solid #ccc; padding: 3pt 5pt; text-align: left; }
  th { background: #f0f0f0; font-weight: bold; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.kind { color: #888; font-size: 8pt; }
  .source { color: #666; font-size: 8pt; margin: 3pt 0 0; }
  .note { color: #888; font-size: 8pt; font-style: italic; margin: 2pt 0 0; }
  .kpi-grid { display: flex; gap: 12pt; margin: 8pt 0; }
  .kpi { flex: 1; border: 1px solid #ddd; border-radius: 4pt; padding: 8pt; text-align: center; }
  .kpi .value { font-size: 16pt; font-weight: bold; color: #1F3D2E; }
  .kpi .label { font-size: 8pt; color: #666; }
  .cover { text-align: center; padding: 120pt 0 60pt; }
  .cover h1 { font-size: 28pt; }
  .toc { page-break-after: always; }
  .toc li { margin: 4pt 0; }
  .footer { font-size: 8pt; color: #999; text-align: center; margin-top: 24pt; }
</style>
</head>
<body>

<!-- COVER -->
<div class="cover">
  <h1>Maine Cannabis Industry Report</h1>
  <p class="subtitle">Q3 2026 — In-Quarter Edition</p>
  <p class="meta">Data cutoff: 2026-07-22</p>
  <p class="meta">OCP operational dashboards: through June 2026 (preliminary, unaudited, subject to revision)</p>
  <p class="meta">MRS tax-filer series: through May 2026 (filing-period-based, revisable)</p>
  <p class="meta">Published by Maine Dispensary Guide — mainedispensaryguide.com</p>
  <p class="meta">CC BY 4.0</p>
</div>

<!-- TABLE OF CONTENTS -->
<div class="toc">
  <h2>Contents</h2>
  <ol>
    <li>Introduction &amp; Methodology</li>
    <li>Maine Market Snapshot</li>
    <li>Legal &amp; Regulatory News</li>
    <li>Industry, Technology &amp; Business Context</li>
    <li>Economic Performance &amp; Forecast</li>
    <li>Future Outlook</li>
    <li>Conclusion</li>
    <li>References &amp; Methodology</li>
  </ol>
</div>

<!-- 1. INTRODUCTION -->
<div class="section">
  <h2>1. Introduction &amp; Methodology</h2>
  <p>This report presents the latest available data on Maine's cannabis market as of the Q3 2026 publication window. It is an <strong>in-quarter edition</strong>: data reflects the most recent complete reporting periods, not final audited annual results.</p>
  <p><strong>Source precedence:</strong> (1) OCP adult-use and medical dashboards for current-month operational data; (2) Maine Revenue Services monthly tax-filer reports for tax and taxable-sales data; (3) OCP 2025 annual reports for complete-year structural context; (4) OCP licensee-search rosters for supply footprint.</p>
  <p><strong>Status labels:</strong> OCP dashboard figures are <em>preliminary, unaudited, and subject to revision</em>. MRS figures are <em>filing-period-based and revisable</em>. The CY2025 anchor uses the live OCP dashboard edition (~$246.817M) as the headline, with the frozen statutory annual-report edition ($246.424M) presented as a separate labeled line.</p>
  <p><strong>Data cutoff:</strong> 2026-07-22. OCP dashboards show through June 2026. MRS shows through May 2026. July 2026 is incomplete and excluded from all monthly charts.</p>
</div>

<!-- 2. MAINE MARKET SNAPSHOT -->
<div class="section">
  <h2>2. Maine Market Snapshot</h2>
  <h3>2.1 June 2026 Adult-Use Performance</h3>
  <div class="kpi-grid">
    <div class="kpi"><div class="value">$${fmt(c1.data.find(d => /jun/i.test(d.label)).value)}</div><div class="label">June 2026 Sales</div></div>
    <div class="kpi"><div class="value">${fmt(425839)}</div><div class="label">June 2026 Transactions</div></div>
    <div class="kpi"><div class="value">${fmt(c2.data.find(d => /transaction/i.test(d.label)).value)}</div><div class="label">YTD Transactions</div></div>
    <div class="kpi"><div class="value">$${fmt(c2.data.find(d => /price/i.test(d.label)).value)}</div><div class="label">YTD Avg Price/g</div></div>
  </div>
  ${chartTable(c1)}
  ${chartTable(c2)}

  <h3>2.2 Price Compression Trend</h3>
  ${chartTable(c3)}

  <h3>2.3 Product Mix</h3>
  ${chartTable(c4)}

  <h3>2.4 Active License Footprint</h3>
  ${chartTable(c7)}
  ${chartTable(c8)}
</div>

<!-- 3. LEGAL & REGULATORY -->
<div class="section">
  <h2>3. Legal &amp; Regulatory News</h2>
  <p>As of the 2026-07-22 data cutoff, Maine's cannabis regulatory environment is shaped by the following key developments:</p>
  <ul>
    <li><strong>Adult-use program:</strong> Operational under 28-B M.R.S. §113 et seq. OCP administers licensing, compliance, and reporting. 346 unique active adult-use licenses as of June 1, 2026.</li>
    <li><strong>Medical program:</strong> Operational under 22 M.R.S. §2425-A et seq. 1,414 active caregiver registrations and 95 active dispensary licenses as of June 1, 2026.</li>
    <li><strong>Tax structure (post-Jan 1, 2026):</strong> Adult-use retail sales tax 14% (up from 10%); excise tax $223/lb (down from $335/lb). Medical remains sales-tax-only at 5.5%.</li>
    <li><strong>Federal context:</strong> State-licensed medical cannabis rescheduled to Schedule III effective April 22, 2026 (91 FR doc 2026-08176). Adult-use remains Schedule I. Broader rescheduling NPRM pending DEA ALJ outcome (hearing concluded July 15, 2026; post-hearing briefs due August 17, 2026).</li>
    <li><strong>Hemp/CBD:</strong> Federal definition changes to total-THC standard + 0.4 mg/container cap effective November 12, 2026 (2026 Appropriations §781), contested by H.R. 7024 / H.R. 7010 / Senate delay bills.</li>
  </ul>
  <p class="source"><small>Sources: OCP licensee-search roster (2026-06-01); DEA marijuana rescheduling page; 91 FR 22777; 91 FR doc 2026-08176; 2018 Farm Bill §10113; 2026 Appropriations §781; CRS IF13136. Retrieved 2026-07-22.</small></p>
</div>

<!-- 4. INDUSTRY / TECH / BUSINESS -->
<div class="section">
  <h2>4. Industry, Technology &amp; Business Context</h2>
  <h3>4.1 OCP vs MRS Monthly Sales Lens</h3>
  <p>OCP tracks retail sales via inventory-tracking (METRC); MRS tracks taxable sales via tax filing periods. The two systems have different period semantics and revision cadences. May 2026 is the latest common month.</p>
  ${chartTable(c5)}

  <h3>4.2 Medical Program Divergence</h3>
  <p>The medical program shows structural divergence between annual-report totals and current roster snapshots. Printed certificates are not unique patient counts and may include reprints.</p>
  ${chartTable(c9)}
  ${chartTable(c10)}
</div>

<!-- 5. ECONOMIC PERFORMANCE -->
<div class="section">
  <h2>5. Economic Performance &amp; Forecast</h2>
  <h3>5.1 Adult-Use Tax Receipts</h3>
  <p>Maine's adult-use tax revenue reflects the January 1, 2026 rate reset. Sales-tax revenue and excise-tax revenue are tracked separately by MRS. Revenue timing does not exactly equal the sales month.</p>
  ${chartTable(c6)}

  <h3>5.2 Market Structure Snapshot</h3>
  <p>The CY2025 anchor uses two editions: the live OCP dashboard (~$246.817M / ~4,845,XXX transactions) and the frozen statutory annual report ($246.423,512 / 4,835,682 transactions). Both are presented to preserve source identity.</p>
  ${chartTable(c11)}
</div>

<!-- 6. FUTURE OUTLOOK -->
<div class="section">
  <h2>6. Future Outlook</h2>
  <ul>
    <li><strong>Q3 2026 trajectory:</strong> June 2026 sales of $${fmt(c1.data.find(d => /jun/i.test(d.label)).value)} suggest a Q3 run-rate consistent with the 2025 plateau (~1% YoY growth). Full Q3 requires July–September OCP dashboard exports.</li>
    <li><strong>Price compression:</strong> The 2026 YTD average of $${fmt(c3.data.find(d => /2026/i.test(d.label)).value)}/g continues the multi-year compression trend (2021: $12.75 → 2025: $6.62). Margin pressure on cultivators persists.</li>
    <li><strong>Federal rescheduling:</strong> The DEA ALJ hearing concluded July 15, 2026. Post-hearing briefs are due August 17, 2026. The ALJ has no statutory deadline; the DEA Administrator's final rule has no deadline. A Schedule I → III move for adult-use would be structurally significant for Maine operators.</li>
    <li><strong>Hemp/CBD:</strong> The November 12, 2026 federal definition change (total-THC standard + 0.4 mg/container cap) will reshape the hemp-derived product market. Delay bills (H.R. 7024 / H.R. 7010) introduce uncertainty.</li>
    <li><strong>Medical program:</strong> Caregiver registrations (1,414 active) and dispensary licenses (95 active) remain stable. The 2-record dashboard/roster disagreement (1,412 vs 1,414) is a known source-timing artifact.</li>
  </ul>
</div>

<!-- 7. CONCLUSION -->
<div class="section">
  <h2>7. Conclusion</h2>
  <p>Maine's cannabis market in Q3 2026 is a mature, plateau-state by national standards. Adult-use sales are flat-to-slightly-up YoY, prices continue compressing, and the license footprint is stable at 346 active adult-use licenses. The medical program remains structurally distinct, with caregiver-centric access and a smaller dispensary footprint.</p>
  <p>The most consequential near-term variable is federal rescheduling. The DEA ALJ process is in the post-hearing-brief phase; a final rule has no statutory deadline. Maine operators should plan for both Schedule I and Schedule III adult-use scenarios and maintain separate medical/adult-use P&amp;L lines.</p>
  <p>All figures in this report are sourced from primary Maine state data (OCP, MRS) and are labeled with their respective status (preliminary, unaudited, filing-period-based, revisable). The data cutoff is 2026-07-22. This is an in-quarter edition; final Q3 2026 results will require the July–September OCP dashboard exports.</p>
</div>

<!-- 8. REFERENCES -->
<div class="section">
  <h2>8. References &amp; Methodology</h2>
  <h3>Primary Sources</h3>
  <ul>
    <li>OCP Adult Use Retail Sales dashboard — https://www.maine.gov/dafs/ocp/open-data/adult-use/retail-sales (June 2026; preliminary, unaudited)</li>
    <li>MRS Monthly cannabis taxable sales — https://www.maine.gov/revenue/taxes/tax-policy-office/sales-tax-reports (May 2026; filing-period-based, revisable)</li>
    <li>OCP Adult Use licensee-search roster — https://www.maine.gov/dafs/ocp/open-data/adult-use/licensee-search (2026-06-01 snapshot)</li>
    <li>OCP Medical Program At-a-Glance — https://www.maine.gov/dafs/ocp/open-data/medical-use/at-a-glance (June 2026; preliminary)</li>
    <li>OCP Medical registrant-search roster — https://www.maine.gov/dafs/ocp/open-data/medical-use/registrant-search (2026-06-01 snapshot)</li>
    <li>OCP 2025 Adult Use Annual Report — https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/2025%20AUCP%20Annual%20Report.pdf (CY2025; issued 2026-02-13)</li>
    <li>OCP 2025 Medical Use Annual Report — https://legislature.maine.gov/doc/12333 (CY2025; issued 2026-02-13)</li>
    <li>DEA Marijuana Rescheduling — https://www.dea.gov/drug-information/drug-scheduling</li>
    <li>Federal Register 91 FR 22777 (DEA rescheduling NPRM hearing notice)</li>
    <li>Federal Register 91 FR doc 2026-08176 (Schedule III final rule, effective April 22, 2026)</li>
    <li>2018 Farm Bill §10113 (7 U.S.C. §1639o)</li>
    <li>2026 Appropriations Act §781 (hemp definition change, effective November 12, 2026)</li>
    <li>CRS IF13136 (hemp/CBD delay-bill context)</li>
  </ul>
  <h3>Methodology Notes</h3>
  <ul>
    <li>OCP sales and MRS taxable sales are never merged, averaged, or used as undocumented corrections to each other. Source identity is preserved.</li>
    <li>The CY2025 anchor uses the live OCP dashboard edition (~$246.817M) as the headline. The frozen statutory annual-report edition ($246.423,512) is presented as a separate labeled line.</li>
    <li>Medical caregiver counts: June 2026 roster has 1,414 active rows; dashboard card shows 1,412. Both values are preserved with source-timing labels.</li>
    <li>Printed patient certificates are not unique patient counts and may include reprints. Maine does not maintain a central patient registry.</li>
    <li>Dashboard category counts are receipt line items, not customer transactions. Category counts are not summed as headline transactions.</li>
    <li>There is no verified OCP county sales series. License, caregiver, and certification maps show footprint/access, not county revenue or demand.</li>
    <li>All chart footers include source, observation period, retrieval date (2026-07-22), and status label.</li>
  </ul>
  <p class="footer">Maine Cannabis Industry Report — Q3 2026 In-Quarter Edition<br>
  Published by Maine Dispensary Guide — mainedispensaryguide.com<br>
  Data cutoff: 2026-07-22 — CC BY 4.0</p>
</div>

</body>
</html>`;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: process.env.CHROME_PATH || '/home/steve/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    const html = buildHtml();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: OUT_PDF,
      format: 'Letter',
      printBackground: true,
      margin: { top: '0.75in', right: '0.75in', bottom: '0.75in', left: '0.75in' },
      displayHeaderFooter: false,
    });
  } finally {
    await browser.close();
  }

  process.stderr.write(`mdg-q3-2026-render.cjs: wrote PDF to ${OUT_PDF}\n`);
  return { path: OUT_PDF };
}

if (require.main === module) {
  main().catch((err) => {
    process.stderr.write(`FATAL: ${err.message}\n`);
    process.exit(1);
  });
}

module.exports = { main, buildHtml };
