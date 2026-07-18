const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const specPath = path.join(
  root,
  'docs/superpowers/specs/2026-07-17-mdg-refined-editorial-ica-completion.md',
);
const readmePath = path.join(root, 'docs/README.md');
const workingOrdersPath = path.join(root, 'docs/governance/AGENT_WORKING_ORDERS.md');

function readAuthority() {
  assert.ok(fs.existsSync(specPath), 'current design authority must exist');
  return fs.readFileSync(specPath, 'utf8');
}

test('current refined-editorial authority is present and truthful', () => {
  const spec = readAuthority();
  assert.match(spec, /Refined Editorial Foundation/);
  assert.match(spec, /Intent Continuity Architecture/);
  assert.match(spec, /EditorialNextStep.*ContextualAction.*AutoRelated/s);
  assert.match(spec, /Newsreader.*Source Sans 3/s);
  assert.match(spec, /current `main`/);
  assert.doesNotMatch(spec, /fully integrated/i);
  assert.doesNotMatch(spec, /release\/2026-07-17-design-composition.*(?:exists|pushed|published)/i);
});

test('authority has no trailing whitespace', () => {
  const spec = readAuthority();
  const trailingWhitespaceLines = spec
    .split('\n')
    .map((line, index) => (/\s$/.test(line) ? index + 1 : null))
    .filter(Boolean);

  assert.deepEqual(
    trailingWhitespaceLines,
    [],
    `trailing whitespace on lines: ${trailingWhitespaceLines.join(', ')}`,
  );
});

test('PR #88 account does not claim homepage implementation landed', () => {
  const spec = readAuthority();
  const pr88Section = spec.match(/### PR #88[\s\S]*?(?=\nTherefore )/)?.[0] ?? '';

  assert.match(pr88Section, /no homepage implementation/i);
  assert.doesNotMatch(pr88Section, /landed[\s\S]*homepage/i);
});

test('current-record routing excludes contradictory PROJECT_STATE design claims', () => {
  const spec = readAuthority();
  const currentRecords = spec.match(/Use these current records instead:[\s\S]*?(?=\nIf this document conflicts)/)?.[0] ?? '';

  assert.doesNotMatch(currentRecords, /PROJECT_STATE\.md/);
});

test('README explicitly supersedes conflicting current-record routes for this workstream', () => {
  const readme = fs.readFileSync(readmePath, 'utf8');
  const workingOrders = fs.readFileSync(workingOrdersPath, 'utf8');
  const workingOrdersLine32 = workingOrders.split('\n')[31] ?? '';

  assert.match(
    workingOrdersLine32,
    /Refined Editorial Foundation.*Active design\/integration composition.*design\/refined-editorial-foundation-20260713/,
    'the routing override must remain tied to the conflicting working-orders line',
  );
  assert.match(
    readme,
    /For the Refined Editorial\/ICA completion workstream, this dated authority supersedes `docs\/governance\/AGENT_WORKING_ORDERS\.md` line 32 and conflicting design\/typography\/branch passages in `PROJECT_STATE\.md` until those records are separately reconciled\./,
  );
});

test('absent-at-base Phase 1 paths are explicitly labeled as creates', () => {
  const spec = readAuthority();

  assert.match(
    spec,
    /`apps\/maine-cannabis\/src\/lib\/homepage-editorial-data\.ts` \(create; absent at implementation base\)/,
  );
  assert.match(
    spec,
    /`apps\/maine-cannabis\/src\/components\/homepage\/\*\.astro` \(create; absent at implementation base\)/,
  );
});
