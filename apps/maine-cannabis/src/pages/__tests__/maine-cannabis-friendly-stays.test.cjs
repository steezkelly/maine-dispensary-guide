const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pagePath = path.resolve(__dirname, '..', 'blog', 'maine-cannabis-friendly-stays.astro');
const page = fs.existsSync(pagePath) ? fs.readFileSync(pagePath, 'utf8') : '';

test('cannabis-friendly stays directory names the three verified first-release properties', () => {
  for (const name of ['Camp Laughing Grass', 'The Lodge at Puffers Place', "Schlafman's Hollow"]) {
    assert.match(page, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${name} must be present`);
  }
});

test('directory anchors every listing to its direct property source', () => {
  for (const url of ['https://camplaughinggrass.com/', 'https://puffersplace.com/The-Lodge', 'https://www.schlafmanshollow.com/']) {
    assert.match(page, new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${url} must be cited`);
  }
});

test('directory preserves the legal condition, review date, and visitor confirmation action', () => {
  assert.match(page, /title28-Bsec1501\.html/, 'must cite 28-B M.R.S. §1501');
  assert.match(page, /last reviewed.*2026-08-06/i, 'must show a visible review date');
  assert.match(page, /confirm[^.]{0,80}(?:policy|permission)[^.]{0,80}(?:in writing|written)/i, 'must tell visitors to confirm current policy in writing');
});

test('directory keeps private residences separate from owner-permitted private property', () => {
  assert.match(page, /private residence, including its curtilage, or on private property that is not generally accessible to the public and where the owner explicitly permits consumption/i);
  assert.doesNotMatch(page, /private residence[^.]{0,160}only when the owner explicitly permits/i);
  assert.doesNotMatch(page, /statute requires explicit owner permission and a setting not generally accessible to the public/i);
});

test('directory uses an honest selective-directory contract', () => {
  assert.match(page, /selective first-release directory/i);
  assert.match(page, /not paid placement/i);
  assert.doesNotMatch(page, /\b(best|all|guaranteed|legal consumption)\b/i);
});

test('directory has collection schema, a route-specific related block, and canonical travel link', () => {
  assert.match(page, /'@type': 'CollectionPage'/);
  assert.match(page, /currentPath="\/blog\/maine-cannabis-friendly-stays"/);
  assert.match(page, /href="\/blog\/cannabis-friendly-maine-travel"/);
});
