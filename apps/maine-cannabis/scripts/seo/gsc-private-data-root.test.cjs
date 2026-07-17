const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { REPO_ROOT, privateDataRoot, privateOutputPath } = require('./gsc-private-data-root.cjs');

test('uses a private default GSC data root outside the repository', () => {
  assert.doesNotMatch(privateDataRoot(), new RegExp(`^${REPO_ROOT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
});

test('rejects a repository-local GSC data-root override', () => {
  assert.throws(() => privateDataRoot(path.join(REPO_ROOT, 'apps', 'maine-cannabis', 'data', 'gsc-private')), /outside the repository/);
});

test('allows outputs only below a validated private root', () => {
  const root = privateDataRoot('/tmp/mdg-gsc-private');
  assert.equal(privateOutputPath('/tmp/mdg-gsc-private/reports/a.md', root), '/tmp/mdg-gsc-private/reports/a.md');
  assert.throws(() => privateOutputPath(path.join(REPO_ROOT, 'docs', 'a.md'), root), /private GSC data root/);
});
