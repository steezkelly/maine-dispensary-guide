const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
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

test('rejects a private-root symlink that resolves into the repository', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-gsc-root-'));
  const linkedRoot = path.join(fixture, 'linked-root');
  fs.symlinkSync(REPO_ROOT, linkedRoot, 'dir');

  assert.throws(() => privateDataRoot(linkedRoot), /outside the repository/);
});

test('rejects a dangling private-root symlink whose missing target is inside the repository', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-gsc-dangling-root-'));
  const linkedRoot = path.join(fixture, 'linked-root');
  const missingRepoTarget = path.join(REPO_ROOT, '.never-create-private-gsc-fixture');
  fs.symlinkSync(missingRepoTarget, linkedRoot, 'dir');

  assert.equal(fs.existsSync(linkedRoot), false);
  assert.throws(() => privateDataRoot(linkedRoot), /outside the repository/);
});

test('rejects any symlink already present below the private data root', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-gsc-root-tree-'));
  fs.symlinkSync(REPO_ROOT, path.join(root, 'repo-escape'), 'dir');
  assert.throws(() => privateDataRoot(root), /symlink/i);
});

test('fails closed when neither an explicit root nor HOME is available', () => {
  const modulePath = path.join(__dirname, 'gsc-private-data-root.cjs');
  const result = spawnSync(process.execPath, ['-e', `delete process.env.HOME; delete process.env.MDG_GSC_DATA_ROOT; require(${JSON.stringify(modulePath)}).privateDataRoot()`], {
    encoding: 'utf8',
    env: Object.fromEntries(Object.entries(process.env).filter(([key]) => !['HOME', 'MDG_GSC_DATA_ROOT'].includes(key))),
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /HOME|MDG_GSC_DATA_ROOT/);
});

test('rejects an output whose existing symlink ancestor escapes the private root', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-gsc-output-'));
  const escape = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-gsc-escape-'));
  fs.symlinkSync(escape, path.join(root, 'reports'), 'dir');

  assert.throws(() => privateOutputPath(path.join(root, 'reports', 'audit.md'), root), /private GSC data root/);
});

function containsQueryMetricTable(source) {
  const metricHeaders = new Set(['imp', 'impressions', 'position', 'pos', 'avg pos', 'click', 'click?', 'clicks', 'ctr', 'share']);
  const lines = source.split('\n');
  for (let index = 0; index < lines.length - 1; index += 1) {
    if (!lines[index].trimStart().startsWith('|') || !/^\s*\|?\s*:?-{3,}/.test(lines[index + 1])) continue;
    const headers = lines[index].trim().replace(/^\||\|$/g, '').split('|').map(value => value.trim().toLowerCase());
    if (headers.some(value => value === 'query' || value === 'queries')
      && headers.some(value => metricHeaders.has(value))) return true;
  }
  return false;
}

test('tracked repository state contains no serialized or tabular GSC query rows or unsafe generated reports', () => {
  const sanitizedLegacyReports = new Set([
    'apps/maine-cannabis/data/audit-2026-07-06-28d.md',
    'apps/maine-cannabis/data/audit-2026-07-06.md',
  ]);
  const tracked = execFileSync('git', ['ls-files'], { cwd: REPO_ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .filter(file => /\.(?:csv|json|jsonl|md)$/.test(file))
    .filter(file => !/\.test\.[^.]+$/.test(file));
  const serializedQueryRow = /^\s*\{[^\n]*"query"\s*:[^\n]*(?:"clicks"|"impressions")/m;
  const generatedMisrouteReport = /^# GSC Misroute Audit\b/m;
  const offenders = new Set();

  for (const file of tracked) {
    const absolute = path.join(REPO_ROOT, file);
    const source = fs.readFileSync(absolute, 'utf8');
    const generatedReportIsUnsafe = generatedMisrouteReport.test(source)
      && (!sanitizedLegacyReports.has(file) || !source.includes('## Privacy disposition'));
    if (serializedQueryRow.test(source) || containsQueryMetricTable(source) || generatedReportIsUnsafe) offenders.add(file);
  }

  assert.deepEqual([...offenders], []);
});
