'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const PAGE = path.join(
  ROOT,
  'apps',
  'maine-cannabis',
  'src',
  'pages',
  'blog',
  'illegal-chinese-grow-operations-in-maine.astro',
);
const SOURCE_PACK = path.join(
  ROOT,
  'docs',
  'research',
  '2026-07-30-illegal-chinese-grow-operations-maine.md',
);

function readPage() {
  return fs.readFileSync(PAGE, 'utf8');
}

function readSourcePack() {
  return fs.readFileSync(SOURCE_PACK, 'utf8');
}

test('page and durable source pack exist', () => {
  assert.equal(fs.existsSync(PAGE), true, `missing ${PAGE}`);
  assert.equal(fs.existsSync(SOURCE_PACK), true, `missing ${SOURCE_PACK}`);
});

test('page has the scoped route identity and current research cutoff', () => {
  const page = readPage();
  assert.match(page, /Chinese-Linked Grow Operations in Maine: Cases & Evidence/);
  assert.match(page, /Reporting cutoff:\s*2026-07-30/);
  assert.match(page, /<h1>Chinese-Linked Grow Operations in Maine: What the Public Record Shows in 2026<\/h1>/);
  assert.doesNotMatch(page, /<h1>Illegal Chinese Grow Operations in Maine/);
  assert.match(page, /currentPath="\/blog\/illegal-chinese-grow-operations-in-maine"/);
  assert.match(page, /currentTopics=\{\['enforcement', 'regulation', 'public-record', 'maine'\]\}/);
});

test('page includes the primary source and current reporting URLs', () => {
  const page = readPage();
  const sourcePack = readSourcePack();
  const requiredUrls = [
    'https://legislature.maine.gov/statutes/17-A/title17-Asec1117.html',
    'https://legislature.maine.gov/statutes/22/title22sec2423-A.html',
    'https://legislature.maine.gov/statutes/28-B/title28-Bsec1502.html',
    'https://legislature.maine.gov/legis/bills/getTestimonyDoc.asp?id=181527',
    'https://www.justice.gov/usao-me/pr/us-attorney-darcie-n-mcelwee-provides-statement-illicit-marijuana-grow-operations-maine',
    'https://www.justice.gov/usao-me/pr/new-york-men-plead-guilty-mortgage-fraud-conspiracy-buy-illegal-marijuana-grow-houses',
    'https://www.justice.gov/usao-me/pr/brooklyn-new-york-man-sentenced-maintaining-drug-involved-premises',
    'https://www.justice.gov/usao-ma/pr/seven-chinese-nationals-charged-alleged-roles-multi-million-dollar-money-laundering',
    'https://www.maine.gov/dps/msp/media-center/public-releases/msp-investigates-illegal-marijuana-grow-parsonsfield',
    'https://www.maine.gov/dafs/ocp/open-data/medical-use/registrant-search',
    'https://www.pressherald.com/2026/03/11/why-has-enforcement-slowed-against-maines-chinese-marijuana-grows/',
    'https://www.pressherald.com/2024/08/12/layers-of-invisibility-workers-at-maines-illegal-cannabis-grow-sites-show-signs-of-human-trafficking/',
    'https://www.pressherald.com/2025/06/04/how-a-former-lawmaker-grew-weed-with-alleged-chinese-crime-groups-in-rural-maine/',
    'https://homeland.house.gov/wp-content/uploads/2025/09/2025-09-18-OIA-HRG-Testimony.pdf',
  ];
  for (const url of requiredUrls) {
    assert.ok(page.includes(url), `page missing source URL: ${url}`);
    assert.ok(sourcePack.includes(url), `source pack missing source URL: ${url}`);
  }
});

test('page preserves allegation, conviction, testimony, and unknown distinctions', () => {
  const page = readPage();
  assert.match(page, /pleaded guilty|guilty plea/i);
  assert.match(page, /charging release|charging document/i);
  assert.match(page, /alleged|allegations/i);
  assert.match(page, /testified|testimony/i);
  assert.match(page, /not established|remains unknown|cannot (?:currently )?answer/i);
  assert.match(page, /presumed innocent/i);
  assert.match(page, /not a current 2026 count/i);
  assert.match(page, /June 7, 2024 Parsonsfield search/i);
  assert.match(page, /testimony is not a congressional finding/i);
  assert.match(page, /reported worker account/i);
  assert.doesNotMatch(page, /worker testimony/i);
  assert.match(page, /What that source establishes/i);
  assert.doesNotMatch(page, /What that source proves/i);
  assert.match(page, /I did not identify a reliable public 2026 count/i);
  assert.match(page, /Date \/ status/);
});

test('page rejects overbroad ethnicity, geopolitical, and trafficking claims', () => {
  const page = readPage();
  assert.doesNotMatch(page, /<h1>[^<]*(?:all|every)\s+(?:illegal\s+)?(?:grow|operation)s?[^<]*(?:Chinese|trafficked)/i);
  assert.doesNotMatch(page, /\bAll (?:of )?the illegal grows in Maine are Chinese/i);
  const governmentClaimSentences = [...page.matchAll(/[^.!?]*(?:Chinese government directed Maine(?:'s)? operations)[^.!?]*/gi)];
  assert.ok(governmentClaimSentences.length > 0, 'page should address the government-direction claim');
  for (const match of governmentClaimSentences) {
    assert.match(match[0], /\bnot\b|\bdo not\b|\bcannot\b|\bdoes not\b|\bunproven\b|\bwithout\b/i,
      `unqualified government-direction claim: ${match[0]}`);
  }
  const traffickingClaims = [...page.matchAll(/[^.!?]*all workers were trafficked[^.!?]*/gi)];
  assert.ok(traffickingClaims.length > 0, 'page should explicitly qualify the all-workers trafficking claim');
  for (const match of traffickingClaims) {
    assert.match(match[0], /not|does not|cannot|unproven/i, `unqualified trafficking claim: ${match[0]}`);
  }
  assert.doesNotMatch(page, /\bChinese people are criminals\b/i);
});

test('page uses disclosed editorial posture and safety disclaimer', () => {
  const page = readPage();
  assert.match(page, /Calvin Waters/);
  assert.match(page, /publisher-managed editorial pseudonym/i);
  assert.match(page, /Last reviewed\s*<strong>2026-07-30<\/strong>/);
  assert.match(page, /not legal advice|does not constitute legal advice/i);
  assert.match(page, /do not confront|do not enter/i);
  assert.match(page, /\/about\/corrections/);
  assert.match(page, /\/about\/authors/);
  assert.match(page, /\/guides\/maine-cannabis-regulations/);
  assert.match(page, /\/blog\/maine-cannabis-gray-market-ocp-enforcement-2026/);
  assert.doesNotMatch(page, /authorId:\s*['"]calvin-waters['"]/);
  assert.doesNotMatch(page, /<meta\s+name=["']description["']/i);
});

test('page preserves the six FAQ source path and qualified schema inputs', () => {
  const page = readPage();
  assert.equal((page.match(/question:\s*['"]/g) || []).length, 6);
  assert.equal((page.match(/<Faq\b/g) || []).length, 1);
  assert.match(page, /<Faq\b/);
});

test('source pack records current-count limitations and excluded evidence', () => {
  const sourcePack = readSourcePack();
  assert.match(sourcePack, /current public count.*unavailable/i);
  assert.match(sourcePack, /Search-result snippets.*discovery only/i);
  assert.match(sourcePack, /Social posts and anonymous allegations.*excluded/i);
  assert.match(sourcePack, /(?:Chinese government direction.*(?:not|do not).*(?:prove|establish)|(?:not|do not).*(?:prove|establish).*Chinese government direction)/i);
});
