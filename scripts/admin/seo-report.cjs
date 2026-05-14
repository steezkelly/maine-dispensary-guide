#!/usr/bin/env node
/**
 * SEO Intelligence Report
 * Generates a GEO/SEO audit snapshot: citation targets, competitor analysis,
 * and technical SEO checklist status.
 *
 * Usage: node scripts/admin/seo-report.cjs [--json|--summary]
 */

const fs = require('fs');
const path = require('path');

// ─── Audit Targets ────────────────────────────────────────────────────────────

const targetPrompts = [
  "How to open a dispensary in Maine 2026",
  "Maine cannabis license cost",
  "Portland Maine dispensary zoning rules",
  "Dispensary ROI calculator Maine",
  "Maine cannabis excise tax 2026"
];

// ─── Directory listings & citation sources ─────────────────────────────────────

const citationSources = [
  // Free Directories
  { name: 'Google Business Profile', url: '#', status: 'Pending', notes: 'Primary GEO signal. Must claim first.', category: 'Free Directories' },
  { name: 'Bing Places', url: '#', status: 'Pending', notes: 'Secondary search presence.', category: 'Free Directories' },
  { name: 'Apple Maps', url: '#', status: 'Pending', notes: "iOS users 'near me' queries.", category: 'Free Directories' },
  { name: 'Yelp Business', url: '#', status: 'Claimed', notes: 'High authority for local SEO.', category: 'Free Directories', lastVerified: 'Apr 2026' },
  // Cannabis Directories
  { name: 'Leafly', url: '#', status: 'Claim', notes: 'Consumer discovery platform. High traffic.', category: 'Cannabis Directories' },
  { name: 'Weedmaps', url: '#', status: 'Claim', notes: 'Patient/user discovery. Priority.', category: 'Cannabis Directories' },
  { name: 'Ganjapreneur', url: '#', status: 'Submit', notes: 'Industry trade publication.', category: 'Cannabis Directories' },
  { name: 'Marijuana Business Daily', url: '#', status: 'Submit', notes: 'B2B focus. National circulation.', category: 'Cannabis Directories' },
  // Media & Editorial
  { name: 'Mainebiz', url: 'https://mainebiz.biz', status: 'Contact', notes: 'Business news. Editorial contact approach.', category: 'Media & Editorial' },
  { name: 'Maine Public', url: 'https://mainepublic.org', status: 'Contact', notes: 'NPR affiliate. Feature/story opportunity.', category: 'Media & Editorial' },
  // Municipal
  { name: 'City of Portland', url: '#', status: 'Pending', notes: 'Portland cultivator/retailer listings.', category: 'Municipal Government Sites' },
  { name: 'City of Bangor', url: '#', status: 'Pending', notes: 'Economic development business directory.', category: 'Municipal Government Sites' },
  { name: 'City of Lewiston', url: '#', status: 'Pending', notes: 'Second largest city. Local biz hub.', category: 'Municipal Government Sites' },
  { name: 'City of Auburn', url: '#', status: 'Pending', notes: 'Neighboring Lewiston. Combined reach.', category: 'Municipal Government Sites' },
  { name: 'Androscoggin Valley Chamber', url: '#', status: 'Pending', notes: 'Regional business network.', category: 'Municipal Government Sites' },
];

const competitors = [
  { name: 'Maine Can Save', strength: 'Discount pricing content', frequency: 'High for retail queries', advantage: 'Compliance depth, municipal zoning' },
  { name: 'Leafly / Weedmaps', strength: 'Brand listings, strain data', frequency: 'High for discovery', advantage: 'B2B focus, business formation guides' },
  { name: 'MCA (Maine Cannabis Assoc.)', strength: 'Industry advocacy voice', frequency: 'Medium for policy queries', advantage: 'Actionable 280E and licensing guides' },
  { name: 'Municipal Government Sites', strength: 'Zoning authority, permits', frequency: 'High for regulatory queries', advantage: 'Plain-language interpretation, checklists' },
];

const technicalSEO = [
  { item: 'Google Search Console Verified', status: 'done' },
  { item: 'Bing Webmaster Tools', status: 'pending' },
  { item: 'Sitemap.xml Auto-Generated', status: 'done' },
  { item: 'JSON-LD Structured Data (Article/WebSite)', status: 'done' },
  { item: 'Robots.txt Optimized', status: 'done' },
];

const weeklyMetrics = [
  'Citation Rate: % of 50 target prompts where Maine Dispensary Guide is cited',
  'Position Zero Appearances: Does any Maine Dispensary Guide content appear as an AI summary source?',
  'Organic Traffic: Sessions from Google/Bing, filtered by Maine cannabis keywords',
  'Guide Engagement: Avg. time on page for technical guides (target: 3+ min)',
  'City Guide Depth: Are 15-municipality guides capturing "near me" queries?',
];

const report = {
  generated: new Date().toISOString(),
  targetPrompts,
  citationSources,
  competitors,
  technicalSEO,
  weeklyMetrics,
};

// ─── Output ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const format = args.includes('--json') ? 'json' : 'summary';

if (format === 'json') {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('\n◆ SEO INTELLIGENCE REPORT');
  console.log(`  Generated: ${report.generated}\n`);

  console.log('  ── Technical SEO Checklist ──');
  for (const item of technicalSEO) {
    const icon = item.status === 'done' ? '✓' : '○';
    const color = item.status === 'done' ? '' : '';
    console.log(`    ${icon} ${item.item}`);
  }
  console.log('');

  console.log('  ── Weekly Prompt Audit Targets ──');
  for (const prompt of targetPrompts) {
    console.log(`    "${prompt}"`);
  }
  console.log('');

  console.log('  ── Citation Sources ──');
  const byCategory = {};
  for (const src of citationSources) {
    if (!byCategory[src.category]) byCategory[src.category] = [];
    byCategory[src.category].push(src);
  }
  for (const [cat, sources] of Object.entries(byCategory)) {
    console.log(`    ${cat}:`);
    for (const s of sources) {
      console.log(`      ${s.name} [${s.status}]`);
    }
  }
  console.log('');

  console.log('  ── GEO Competitive Analysis ──');
  for (const c of competitors) {
    console.log(`    ${c.name}`);
    console.log(`      Strength: ${c.strength}`);
    console.log(`      Frequency: ${c.frequency}`);
    console.log(`      Our Edge: ${c.advantage}`);
  }
  console.log('');

  console.log('  ── Weekly Metrics ──');
  for (const m of weeklyMetrics) {
    console.log(`    • ${m}`);
  }
  console.log('');

  console.log('  Run: node scripts/admin/seo-report.cjs --json  for full JSON output.\n');
}