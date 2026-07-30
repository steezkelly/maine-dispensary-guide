const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const repo = path.resolve(__dirname, '..', '..');
const memoPath = path.join(repo, 'docs/research/2026-07-30-mdg-market-intelligence-source-inventory.md');

test('market-intelligence memo exists as a bounded canonical-pipeline plan', () => {
  assert.ok(fs.existsSync(memoPath), `missing ${memoPath}`);
  const memo = fs.readFileSync(memoPath, 'utf8');

  for (const heading of [
    '## Evidence boundary',
    '## Existing canonical release inventory',
    '## Primary-source inventory and source contracts',
    '## Ranked implementation backlog',
    '## First implementation cards',
  ]) {
    assert.match(memo, new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'));
  }

  assert.match(memo, /`adult-use-retail-sales`/);
  assert.match(memo, /`retail-licenses-by-municipality`/);
  assert.match(memo, /`dispensary-menu-prices`/);
  assert.match(memo, /OCP and MRS are separate source families/i);
  assert.match(memo, /opt-in.*does not.*active/i);
  assert.match(memo, /No autonomous Firecrawl/i);
  assert.match(memo, /first-party.*snapshot/i);
  assert.match(memo, /source URL.*source type.*retrieval date.*reporting period.*definition.*status.*limitations/i);
  assert.match(memo, /all current sentinel provenance defects/i);
  assert.match(memo, /retail-sales products/i);
  assert.match(memo, /retail-optin-gap/);
  assert.match(memo, /dispensary-directory/);
  assert.match(memo, /firecrawl_ingest/);
  assert.match(memo, /ocp_csv_enumeration\+findall/);
  assert.match(memo, /ocp_licenses_normalized/);
  assert.match(memo, /ocp_licenses_normalized.*retail-optin-gap.*dispensary-directory/i);
});

test('memo names bounded first implementation work and keeps unsupported inferences out', () => {
  const memo = fs.readFileSync(memoPath, 'utf8');
  assert.match(memo, /license provenance and lifecycle snapshots/i);
  assert.match(memo, /OCP compliance and testing record/i);
  assert.doesNotMatch(memo, /municipal opportunity score/i);
  assert.doesNotMatch(memo, /white[ -]space opportunity/i);
  assert.doesNotMatch(memo, /profitab(?:le|ility)/i);
});
