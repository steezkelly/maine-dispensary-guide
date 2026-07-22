const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const SCRIPT_DIR = __dirname;

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-gsc-wrapper-'));
  const repo = path.join(root, 'repo');
  const data = path.join(root, 'private');
  const bin = path.join(root, 'bin');
  fs.mkdirSync(path.join(repo, 'apps', 'maine-cannabis'), { recursive: true });
  const seoDir = path.join(repo, 'apps', 'maine-cannabis', 'scripts', 'seo');
  fs.mkdirSync(seoDir, { recursive: true });
  fs.copyFileSync(path.join(__dirname, '..', '..', 'apps', 'maine-cannabis', 'scripts', 'seo', 'gsc-private-data-root.cjs'), path.join(seoDir, 'gsc-private-data-root.cjs'));
  fs.mkdirSync(data, { recursive: true });
  fs.mkdirSync(bin, { recursive: true });
  return { root, repo, data, bin };
}

function runWrapper(name, fixture, nodeSource, dataRoot = fixture.data) {
  const nodeBin = path.join(fixture.bin, 'node');
  fs.writeFileSync(nodeBin, `#!/bin/sh\nif [ "$1" = "-e" ]; then exec "${process.execPath}" "$@"; fi\n${nodeSource}\n`, { mode: 0o700 });
  return spawnSync('bash', [path.join(SCRIPT_DIR, name)], {
    encoding: 'utf8',
    env: {
      ...process.env,
      MDG_REPO_ROOT: fixture.repo,
      MDG_GSC_DATA_ROOT: dataRoot,
      NODE_BIN: nodeBin,
    },
  });
}

test('daily wrapper propagates collector failure instead of reporting cron success', () => {
  const f = fixture();
  const result = runWrapper('mdg-gsc-daily.sh', f, 'exit 9');
  const log = fs.readFileSync(path.join(f.data, 'cron.log'), 'utf8');

  assert.equal(result.status, 9);
  assert.match(log, /mdg-gsc-daily end \(exit 9\)/);
});

test('daily wrapper fails closed when its configured checkout is missing', () => {
  const f = fixture();
  fs.rmSync(f.repo, { recursive: true });
  const result = runWrapper('mdg-gsc-daily.sh', f, 'exit 0');
  assert.notEqual(result.status, 0);
});

test('daily wrapper rejects a repository-local private-data root before creating it', () => {
  const f = fixture();
  const localData = path.join(f.repo, 'private-data');
  const result = runWrapper('mdg-gsc-daily.sh', f, 'exit 0', localData);
  assert.notEqual(result.status, 0);
  assert.equal(fs.existsSync(localData), false);
});

test('weekly wrapper writes query-bearing audit output below the private root instead of cron.log', () => {
  const f = fixture();
  const argsLog = path.join(f.root, 'args.log');
  const result = runWrapper('mdg-gsc-weekly.sh', f, `printf '%s\\n' "$*" >> "${argsLog}"; exit 0`);
  const calls = fs.readFileSync(argsLog, 'utf8');
  const cronLog = fs.readFileSync(path.join(f.data, 'cron.log'), 'utf8');

  assert.equal(result.status, 0);
  assert.match(calls, new RegExp(`gsc-misroute-audit\\.cjs --days=28 --output=${f.data.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/reports/audit-\\d{4}-\\d{2}-\\d{2}\\.md`));
  assert.doesNotMatch(cronLog, /\| Query \||private query/i);
});

test('weekly wrapper keeps indexing URLs out of the shared cron log', () => {
  const f = fixture();
  const result = runWrapper('mdg-gsc-weekly.sh', f, 'case "$*" in *gsc-indexing-check*) echo "https://mainedispensaryguide.com/private-fixture";; esac; exit 0');
  const date = new Date().toISOString().slice(0, 10);
  const indexingPath = path.join(f.data, 'reports', `indexing-${date}.log`);
  const cronLog = fs.readFileSync(path.join(f.data, 'cron.log'), 'utf8');
  const indexingLog = fs.readFileSync(indexingPath, 'utf8');
  assert.equal(result.status, 0);
  assert.doesNotMatch(cronLog, /private-fixture/);
  assert.match(indexingLog, /private-fixture/);
  assert.equal(fs.statSync(indexingPath).mode & 0o777, 0o600);
});

test('health wrapper propagates unhealthy status', () => {
  const f = fixture();
  const result = runWrapper('mdg-gsc-health-check.sh', f, 'exit 4');
  assert.equal(result.status, 4);
});

test('health wrapper fails closed when its configured checkout is missing', () => {
  const f = fixture();
  fs.rmSync(f.repo, { recursive: true });
  const result = runWrapper('mdg-gsc-health-check.sh', f, 'exit 0');
  assert.notEqual(result.status, 0);
});

test('installer fails closed when neither cron nor crond is active', () => {
  const f = fixture();
  const home = path.join(f.root, 'home');
  const fakeBin = path.join(f.root, 'fake-bin');
  const credential = path.join(f.root, 'credential.json');
  fs.mkdirSync(home);
  fs.mkdirSync(fakeBin);
  fs.writeFileSync(credential, '{}\n', { mode: 0o600 });
  fs.writeFileSync(path.join(fakeBin, 'systemctl'), '#!/bin/sh\nexit 1\n', { mode: 0o700 });
  fs.writeFileSync(path.join(fakeBin, 'crontab'), '#!/bin/sh\nexit 0\n', { mode: 0o700 });
  const result = spawnSync('bash', [path.join(SCRIPT_DIR, 'install-gsc-cron.sh')], {
    encoding: 'utf8',
    env: {
      ...process.env,
      HOME: home,
      GOOGLE_APPLICATION_CREDENTIALS: credential,
      PATH: `${fakeBin}:/usr/bin:/bin`,
    },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /cron service is not active/i);
  assert.doesNotMatch(result.stdout + result.stderr, /Installed fail-closed wrappers/);
});

test('installer persists an explicit durable checkout instead of its transient worktree', () => {
  const f = fixture();
  const home = path.join(f.root, 'home');
  const fakeBin = path.join(f.root, 'fake-bin');
  const credential = path.join(f.root, 'credential.json');
  const crontabState = path.join(f.root, 'crontab');
  fs.mkdirSync(home);
  fs.mkdirSync(fakeBin);
  fs.writeFileSync(credential, '{}\n', { mode: 0o600 });
  fs.writeFileSync(path.join(fakeBin, 'systemctl'), '#!/bin/sh\nexit 0\n', { mode: 0o700 });
  fs.writeFileSync(path.join(fakeBin, 'crontab'), `#!/bin/sh\nif [ "$1" = "-l" ]; then [ ! -f "${crontabState}" ] || /bin/cat "${crontabState}"; else /bin/cp "$1" "${crontabState}"; fi\n`, { mode: 0o700 });
  const result = spawnSync('bash', [path.join(SCRIPT_DIR, 'install-gsc-cron.sh')], {
    encoding: 'utf8',
    env: {
      ...process.env,
      HOME: home,
      MDG_REPO_ROOT: f.repo,
      GOOGLE_APPLICATION_CREDENTIALS: credential,
      PATH: `${fakeBin}:/usr/bin:/bin`,
    },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(path.join(home, '.config', 'mdg-gsc', 'repo-root'), 'utf8'), `${f.repo}\n`);
});
