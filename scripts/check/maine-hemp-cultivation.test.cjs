#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repo = path.resolve(__dirname, '..', '..');
const pagePath = path.join(repo, 'apps/maine-cannabis/src/pages/guides/maine-hemp-cultivation-guide.astro');
const sourcePackPath = path.join(repo, 'docs/research/2026-08-06-maine-hemp-source-pack.md');
const builtPagePath = path.join(repo, 'dist', 'guides', 'maine-hemp-cultivation-guide', 'index.html');

for (const file of [pagePath, sourcePackPath]) {
  assert.ok(fs.existsSync(file), `expected artifact: ${file}`);
}

const page = fs.readFileSync(pagePath, 'utf8');
const sourcePack = fs.readFileSync(sourcePackPath, 'utf8');

// Identity / metadata
assert.match(page, /title="Maine Hemp Cultivation: Regulations & Licensing Guide"/);
assert.match(page, /<h1>Maine Hemp Cultivation: Regulations &amp; Guidelines<\/h1>/);
assert.match(page, /currentPath="\/guides\/maine-hemp-cultivation-guide"/);
assert.match(page, /const hempFaqs = \[/);
assert.match(page, /<Faq faqs=\{hempFaqs\}/);
assert.match(page, /authorId: "calvin-waters"/);
assert.match(page, /Margaret Finch/);
assert.match(page, /Last reviewed <strong>2026-08-06<\/strong>/);
assert.match(page, /DACF is the licensing authority for growing hemp in Maine|Department of Agriculture, Conservation and Forestry \(DACF\) is the licensing authority for growing hemp in Maine/is);

// The core legal line: hemp (≤0.3%) is DACF; high-THC is OCP. Do not conflate.
assert.match(page, /does not license or regulate high-THC cannabis/i);
assert.match(page, /Office of Cannabis Policy|OCP/i);

// Operative vs failed law vocabulary this page must preserve.
assert.match(page, /PL 2025, c\. 416/);
assert.match(page, /effective June 24, 2025|effective June 24\/25, 2025/);
assert.match(page, /LD 1983/);
assert.match(page, /withdrawn|Leave to Withdraw|dead/i);
// LD 1983 must be framed as dead and explicitly NOT law / not pending-in-effect.
assert.match(page, /LD 1983[^.]*is dead|LD 1983[^.]*dead/i);
assert.doesNotMatch(page, /LD 1983 became law|LD 1983 took effect/i);

// Key facts
assert.match(page, /0\.3% total THC|0\.3% Total THC/i);
assert.match(page, /\$100 non-refundable|\$100 nonrefundable|\\$100.00 application fee/i);
assert.match(page, /child-resistant and tamper-evident packaging/i);
assert.match(page, /may not be sold to anyone under 21|may not be sold to a person who has not attained 21/i);

// Topic taxonomy guard: only canonical AGENTS.md topics.
const SUPPORTED_TOPICS = ['city', 'market', 'licensing', 'finance', 'real-estate', 'operations', 'compliance', 'marketing', 'business'];
const topicsMatch = page.match(/const topics = \[([^\]]+)\];/);
assert.ok(topicsMatch, 'page must declare a topics array literal');
const pageTopics = topicsMatch[1].split(',').map(s => s.trim().replace(/^['\"]|['\"]$/g, ''));
for (const t of pageTopics) {
  assert.ok(SUPPORTED_TOPICS.includes(t), `unsupported topic "${t}" — only ${SUPPORTED_TOPICS.join(', ')} are canonical`);
}

// Primary source URLs must be cited on page AND recorded in source pack.
for (const url of [
  'https://www.maine.gov/dacf/php/hemp',
  'https://legislature.maine.gov/legis/statutes/7/title7sec2231.html',
  'https://legislature.maine.gov/legis/bills/display_ps.asp?LD=1920&snum=132',
  'https://legislature.maine.gov/legis/bills/display_ps.asp?LD=1983&snum=132',
  'https://www.ams.usda.gov/rules-regulations/hemp/state-and-tribal-plan-review',
  'https://www.maine.gov/dacf/php/hemp/documents/2025-criminal-history-guidance.pdf',
  'https://www.maine.gov/dacf/php/hemp/documents/FSA_Reporting_2024.pdf',
  'https://legislature.maine.gov/doc/12503',
]) {
  assert.ok(page.includes(url), `page must cite ${url}`);
  assert.ok(sourcePack.includes(url), `source pack must record ${url}`);
}

// Expansion-specific source-boundary checks (comprehensive version).
assert.match(page, /FBI Identity History Summary Check/i);
assert.match(page, /10 years from the date of the conviction/);
assert.match(page, /\$18/);
assert.match(page, /key participant/i);
assert.match(page, /chief executive officer, chief operating officer, and chief financial officer/i);
assert.match(page, /Form FSA-578 Report of Acreage/i);
assert.match(page, /'?23_'?|23_1550/i);
assert.match(page, /keep that copy of Form FSA-578|records for at least 3 years/i);
assert.match(page, /Annual Report FY2024|FY2024 annual report/i);
assert.match(page, /150-200 growers|150–200 growers/i);
// The FY2024 grower count is dated context, never presented as a live current count.
assert.match(page, /FY2024 annual report.*12 final license agreements|12 final license agreements for the 2024 season/i);
assert.match(page, /key participant is a person with a direct or indirect financial interest in an entity producing hemp/i);
assert.match(page, /Chapter 274/);
assert.doesNotMatch(page, /exactly 12 growers are licensed|only 12 growers/i);

// Intentional outbound internal links.
for (const href of [
  '/guides/maine-cannabis-cultivation-guide',
  '/guides/maine-cannabis-regulations',
  '/resources/buy-cannabis-seeds-maine',
  '/learn',
]) {
  assert.ok(page.includes(`href="/guides/maine-hemp-cultivation-guide"`) || page.includes(`currentPath="/guides/maine-hemp-cultivation-guide"`), 'page must self-reference currentPath');
  assert.ok(page.includes(`href="${href}"`) || page.includes(`href='${href}'`), `expected internal link: ${href}`);
}

// No overclaim / no legal-advice framing.
for (const forbidden of [
  /this (?:is|constitutes) legal advice/i,
  /guarantee(?:d|s)?\s+(?:license|approval|compliance|pass)/i,
  /verified\s+by\s+(?:us|the publisher)/i,
  /independently verified/i,
]) {
  assert.doesNotMatch(page, forbidden, `forbidden claim pattern: ${forbidden}`);
}

// Built-page smoke if the build has run.
if (fs.existsSync(builtPagePath)) {
  const built = fs.readFileSync(builtPagePath, 'utf8');
  assert.match(built, /Maine Hemp Cultivation: Regulations &amp; Guidelines/);
  assert.match(built, /FAQPage/);
}

console.log('PASS: maine-hemp-cultivation-guide content contract');
