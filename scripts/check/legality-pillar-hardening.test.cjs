/**
 * legality-pillar-hardening.test.cjs
 * Focused test for MDG-SEO-LEGALITY-001: Maine Legality Pillar Hardening.
 * Asserts the contract on the source .astro file (not built HTML).
 * Run: node scripts/check/legality-pillar-hardening.test.cjs
 */
'use strict';
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const PAGE = join(__dirname, '..', '..', 'apps', 'maine-cannabis', 'src', 'pages', 'blog', 'is-weed-legal-in-maine.astro');
const src = readFileSync(PAGE, 'utf8');

// --- PROTECTED ELEMENTS ---
test('title tag is preserved', () => {
  assert.ok(src.includes('title="Is Weed Legal in Maine? Yes — 2026 Laws & Key Rules"'),
    'title tag must remain unchanged');
});

test('H1 is preserved', () => {
  assert.ok(src.includes('<h1>Is Weed Legal in Maine?</h1>'),
    'H1 must remain unchanged');
});

test('canonical URL path is preserved', () => {
  assert.ok(src.includes('currentPath="/blog/is-weed-legal-in-maine"'),
    'canonical path must remain unchanged');
});

// --- TIMELINE CORRECTION ---
test('misleading "Since 2020" heading is removed', () => {
  assert.ok(!src.includes('Since 2020'),
    'heading must not imply legalization began in 2020');
});

test('timeline distinguishes 2016 voter legalization from 2020 retail launch', () => {
  assert.ok(src.includes('2016'), 'must reference 2016 voter legalization');
  assert.ok(src.includes('2020'), 'must reference 2020 retail launch');
  // The timeline section should use clear language
  assert.ok(/legaliz\w*\s+.*2016/i.test(src) || /2016.*legaliz/i.test(src),
    'must connect 2016 to legalization');
});

// --- FEDERAL STATUS ---
test('federal status does not use blanket "Schedule I" without qualification', () => {
  // A blanket statement says "cannabis is/remains Schedule I" with no qualifier.
  // Qualified statements ("adult-use cannabis remains Schedule I") are accurate.
  const lines = src.split('\n');
  for (const line of lines) {
    // Match "cannabis is/remains ... Schedule I controlled substance" NOT preceded by "adult-use" or "Adult-use"
    const blanket = /(?<!adult-use\s)(?<!Adult-use\s)cannabis\s+(?:is|remains)\s+(?:a\s+|still\s+)?Schedule I controlled substance/i;
    if (blanket.test(line)) {
      // Check if the line itself contains a qualifier
      assert.ok(/adult.use|adult use/i.test(line),
        `unqualified Schedule I statement found: ${line.trim().slice(0, 100)}`);
    }
  }
});

test('federal status references the April 2026 Schedule III action', () => {
  assert.ok(src.includes('Schedule III'), 'must mention Schedule III');
  assert.ok(src.includes('91 FR 22714') || src.includes('April 2026') || src.includes('April 28, 2026'),
    'must reference the April 2026 final rule');
});

test('federal status notes broader rescheduling is still pending', () => {
  assert.ok(/broader rescheduling|final rule.*pending|hearing.*concluded|rulemaking.*ongoing/i.test(src),
    'must note the broader rescheduling process is not yet complete');
});

// --- QUICK REFERENCE ---
test('quick-reference section exists above the fold', () => {
  // The quick-reference must appear before the first major content section
  const qrIdx = src.search(/2026 (?:Quick Reference|Snapshot|At a Glance)/i);
  assert.ok(qrIdx > -1, 'must have a 2026 quick-reference section');
  // It should appear within the first 60% of the file (above the fold)
  assert.ok(qrIdx < src.length * 0.6, 'quick-reference must appear early in the page');
});

test('quick-reference covers required facts', () => {
  const required = [
    [/21/, 'minimum age'],
    [/2\.5\s*(?:oz|ounces)/, 'possession limit'],
    [/10\s*(?:g|grams)/, 'concentrate sublimit'],
    [/6\s*mature/, 'home grow limit'],
    [/public/i, 'public consumption'],
    [/federal land/i, 'federal land'],
    [/14%/, 'adult-use sales tax'],
  ];
  for (const [pattern, label] of required) {
    assert.ok(pattern.test(src), `quick-reference must cover: ${label}`);
  }
});

// --- RECREATIONAL LEGALITY SECTION ---
test('recreational legality H2 exists', () => {
  assert.ok(/<h2>.*[Rr]ecreational.*[Ll]egal.*Maine.*<\/h2>/.test(src),
    'must have an H2 about recreational weed legality in Maine');
});

test('recreational section answers directly before expanding', () => {
  // Find the recreational H2 and check the next paragraph is a direct answer
  const h2Match = src.match(/<h2>[^<]*[Rr]ecreational[^<]*[Ll]egal[^<]*Maine[^<]*<\/h2>/);
  assert.ok(h2Match, 'recreational H2 must exist');
  const afterH2 = src.slice(h2Match.index + h2Match[0].length, h2Match.index + h2Match[0].length + 500);
  assert.ok(/yes/i.test(afterH2), 'must answer "yes" directly after the recreational H2');
});

// --- NEXT USER DECISIONS ---
test('answers tourist/visitor purchasing question', () => {
  assert.ok(/tourist|visitor|out.of.state|non.resident/i.test(src),
    'must address whether visitors can purchase');
});

test('answers local opt-in / municipal availability question', () => {
  assert.ok(/opt.in|local control|municipalit.*retail|not every town/i.test(src),
    'must address that not every town permits dispensaries');
});

// --- INTERNAL LINKS ---
test('links to edibles legality page', () => {
  assert.ok(src.includes('/blog/are-edibles-legal-in-maine'),
    'must link to the edibles legality page');
});

test('links to travel guide', () => {
  assert.ok(src.includes('/blog/cannabis-friendly-maine-travel'),
    'must link to the travel guide');
});

test('links to purchase-limit guide', () => {
  assert.ok(src.includes('/blog/how-much-weed-can-you-buy-in-maine'),
    'must link to the purchase-limit guide');
});

test('links to home-grow guide', () => {
  assert.ok(src.includes('/blog/maine-home-grow-cannabis-guide-2026'),
    'must link to the home-grow guide');
});

test('links to dispensary finder', () => {
  assert.ok(src.includes('/find-a-dispensary'),
    'must link to the dispensary finder');
});

test('links to Portland guide', () => {
  assert.ok(src.includes('/blog/portland-maine-cannabis-rules-2026') || src.includes('/guides/portland-dispensary-guide'),
    'must link to a Portland guide');
});

// --- CTA ---
test('has a clear dispensary-finder CTA', () => {
  assert.ok(/find a licensed.*dispensary|find.*adult.use.*dispensary/i.test(src),
    'must have a clear CTA to find a dispensary');
});

// --- META DESCRIPTION ---
test('meta description answers the legality question', () => {
  const descMatch = src.match(/description="([^"]+)"/);
  assert.ok(descMatch, 'must have a meta description');
  const desc = descMatch[1];
  assert.ok(/legal/i.test(desc), 'meta description must mention legality');
  assert.ok(/21\+|21 and older|adults 21/i.test(desc), 'meta description must identify 21+ audience');
});

// --- STRUCTURED DATA PRESERVATION ---
test('existing FAQ schema is preserved', () => {
  assert.ok(src.includes('Faq'), 'must still use the Faq component');
  assert.ok(src.includes('faqItems'), 'must still pass faqItems to Faq');
});

// --- NO RAW GSC DATA ---
test('no raw GSC query rows in source', () => {
  assert.ok(!src.includes('impressions') || !src.includes('clicks') || !src.includes('position'),
    'must not contain raw GSC data fields together');
  // More specific: no query strings that look like GSC exports
  assert.ok(!/query.*impressions.*clicks.*position/i.test(src),
    'must not contain GSC query table data');
});

// --- MARKET COUNTS QUALIFIED ---
test('store/municipality counts are qualified with source and date', () => {
  // If counts appear, they must have source attribution
  const countLines = src.split('\n').filter(l => /\b180\b|\b78\b|\b485\b|\b407\b/.test(l));
  for (const line of countLines) {
    assert.ok(/OCP|annual report|opt.in|roster|as of|refreshed|2025|2026/i.test(line),
      `count line must be qualified with source/date: ${line.trim().slice(0, 80)}`);
  }
});
