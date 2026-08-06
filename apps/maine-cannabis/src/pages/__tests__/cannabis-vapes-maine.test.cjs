const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pagePath = path.resolve(__dirname, '..', 'guides', 'cannabis-vapes-maine.astro');

function readPage() {
  assert.ok(fs.existsSync(pagePath), `expected new cannabis-vapes guide at ${pagePath}`);
  return fs.readFileSync(pagePath, 'utf8');
}

function bodyWordCount(page) {
  const match = page.match(/<!-- GUIDE_BODY_START -->([\s\S]*?)<!-- GUIDE_BODY_END -->/);
  assert.ok(match, 'guide needs explicit body-word boundary markers');
  const text = match[1]
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/[^\p{L}\p{N}'’-]+/gu, ' ')
    .trim();
  return text ? text.split(/\s+/).length : 0;
}

test('cannabis-vapes guide exists with the approved reader-first H1', () => {
  const page = readPage();
  assert.match(page, /title="Maine Cannabis Vapes: Labels, Batches & Recalls"/);
  assert.match(page, /<h1>\s*Cannabis Vapes in Maine: How to Read a Label and Choose a Traceable Product\s*<\/h1>/);
});

test('cannabis-vapes guide contains 2,400–2,700 actual body-prose words', () => {
  const page = readPage();
  const count = bodyWordCount(page);
  assert.ok(count >= 2400 && count <= 2700, `expected 2,400–2,700 body-prose words; got ${count}`);
});

test('cannabis-vapes guide makes the required adult-use label and testing sources inspectable', () => {
  const page = readPage();
  for (const source of [
    'https://legislature.maine.gov/statutes/28-B/title28-Bsec701.html',
    'https://legislature.maine.gov/statutes/28-B/title28-Bsec602.html',
    'https://www.maine.gov/dafs/ocp/news-events/news/maine-office-cannabis-policy-expands-recall-adult-use-vape-cartridges-produced',
    'https://www.epa.gov/recycle/used-lithium-ion-batteries',
    'https://www.maine.gov/dep/waste/recycle/battery.html',
  ]) assert.match(page, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  for (const heading of [
    'Reading a Maine Adult-Use Vape Label',
    'What Traceability Can and Cannot Tell You',
    'Testing: Useful Evidence, Not a Safety Guarantee',
    'Vape Safety, Recalls, and Disposal in Maine',
    'A Short Note for Operators: Make the Record Easy to Find',
  ]) assert.match(page, new RegExp(`<h2>\\s*${heading}\\s*<\\/h2>`));
});

test('cannabis-vapes guide uses one shared five-item FAQ structure', () => {
  const page = readPage();
  const match = page.match(/const vapeFaqs = \[([\s\S]*?)\];/);
  assert.ok(match, 'FAQ data must be declared once as vapeFaqs');
  assert.strictEqual((match[1].match(/question:/g) || []).length, 5, 'vapeFaqs must have exactly five entries');
  assert.match(page, /<Faq faqs=\{vapeFaqs\} \/>/, 'visible FAQ must render the shared FAQ data');
});

test('cannabis-vapes guide keeps consumer safety boundaries and editorial accountability truthful', () => {
  const page = readPage();
  for (const prohibited of [
    /recommended dose/i,
    /start with \d/i,
    /titrate/i,
    /treats? (?:anxiety|pain|insomnia|a condition)/i,
    /safer than smoking/i,
    /safe to vape/i,
    /medical advice/i,
  ]) assert.doesNotMatch(page, prohibited);
  assert.match(page, /Last reviewed/i);
  assert.doesNotMatch(page, /Last verified/i);
  assert.match(page, /\/about\/corrections/);
  assert.match(page, /\/about\/authors/);
  assert.match(page, /publisher-managed editorial byline/i);
  assert.match(page, /continuationMode="pilot"/, 'guide must delegate its one AutoRelated rail to Layout’s pilot continuation path');
  assert.doesNotMatch(page, /import AutoRelated/);
  assert.doesNotMatch(page, /<AutoRelated\b/);
});
