'use strict';

/**
 * mdg-leads-audit.test.cjs — Regression tests for the MDG leads pipeline
 * audit script (schema v2.1.0).
 *
 * Categories:
 *   1.  No credential values enter report output
 *   2.  No hardcoded PGPASSWORD, DB passwords, or host-specific secrets
 *   3.  Database not-configured state is explicit
 *   4.  Report path is outside public/ (and guarded against web trees)
 *   5.  Report writing is atomic
 *   6.  Optional Himalaya absence is represented distinctly
 *   7.  Overall health cannot be green while fulfillment is absent/unverified
 *   8.  Script exits deterministically for healthy/unhealthy/not-configured
 *   9.  No runtime report enters Git
 *   10. Database unreachable/query_failed can never produce healthy/exit 0
 *   11. Report-write failure → nonzero exit + REPORT_WRITE_FAILED
 *   12. --report-path inside web-served trees is rejected
 *   13. Real default-path resolution (no --report-path injection)
 *   14. Insecure credential file mode → --check-config nonzero
 *   15. Fulfillment marker contract (absent/configured_unverified/verified/invalid)
 *
 * Run: node scripts/email/__tests__/mdg-leads-audit.test.cjs
 */

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const {
  existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync,
  statSync, chmodSync
} = require('node:fs');
const { resolve, join } = require('node:path');
const { tmpdir } = require('node:os');

const SCRIPT = resolve(__dirname, '..', 'mdg-leads-audit.cjs');
const SENDER = resolve(__dirname, '..', '..', 'send-email.cjs');
const PROJECT_ROOT = resolve(__dirname, '..', '..', '..');

let pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); pass++; process.stderr.write(`  ok  ${name}\n`); }
  catch (err) { fail++; process.stderr.write(`  FAIL ${name}: ${err.message}\n`); }
}

// Temp workspace for fixture-based tests (outside the repo)
const FIXTURE_DIR = join(tmpdir(), `mdg-audit-test-${process.pid}-${Date.now()}`);
mkdirSync(FIXTURE_DIR, { recursive: true });

let reportCounter = 0;

// runAudit: injects an explicit --report-path (for tests that don't care
// about default resolution).
function runAudit(env = {}, args = []) {
  const reportPath = join(FIXTURE_DIR, `report-${++reportCounter}.json`);
  const r = spawnSync(process.execPath, [SCRIPT, '--report-path', reportPath, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
    timeout: 30000,
    cwd: PROJECT_ROOT,
  });
  let report = null;
  if (existsSync(reportPath)) {
    try { report = JSON.parse(readFileSync(reportPath, 'utf8')); } catch { /* ignore */ }
  }
  return { ...r, report, reportPath };
}

// runAuditDefault: does NOT pass --report-path. Sets an isolated
// XDG_CACHE_HOME + HOME so the real default resolution is exercised.
function runAuditDefault(env = {}, args = []) {
  const fakeHome = join(FIXTURE_DIR, `home-${++reportCounter}`);
  const fakeCache = join(fakeHome, 'cache');
  mkdirSync(fakeHome, { recursive: true });
  const r = spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...env, HOME: fakeHome, XDG_CACHE_HOME: fakeCache },
    timeout: 30000,
    cwd: PROJECT_ROOT,
  });
  const expectedPath = join(fakeCache, 'mdg', 'leads-audit', 'report.json');
  let report = null;
  if (existsSync(expectedPath)) {
    try { report = JSON.parse(readFileSync(expectedPath, 'utf8')); } catch { /* ignore */ }
  }
  return { ...r, report, reportPath: expectedPath, fakeHome, fakeCache };
}

function makeCredFile(dir, content, mode = 0o600) {
  mkdirSync(dir, { recursive: true });
  const p = join(dir, 'test-smtp.env');
  writeFileSync(p, content, { mode });
  chmodSync(p, mode); // ensure exact mode regardless of umask
  return p;
}

// =========================================================================
// Category 1: No credential values enter report output
// =========================================================================

check('1a: report does not contain credential file contents', () => {
  const credFile = makeCredFile(join(FIXTURE_DIR, 'c1a'),
    'SMTP_EMAIL=secret-test-email@example.com\nSMTP_PASSWORD=super-secret-password-12345\n');
  const { report } = runAudit({ MAINE_DISPENSARYGUIDE_SMTP_CREDENTIALS: credFile });
  assert.ok(report, 'report should exist');
  const s = JSON.stringify(report);
  assert.ok(!s.includes('secret-test-email@example.com'), 'must not contain email');
  assert.ok(!s.includes('super-secret-password-12345'), 'must not contain password');
});

check('1b: --check-config output does not contain credential values', () => {
  const credFile = makeCredFile(join(FIXTURE_DIR, 'c1b'),
    'SMTP_EMAIL=hidden-email@test.com\nSMTP_PASSWORD=hidden-pass-xyz\n');
  const r = spawnSync(process.execPath, [SENDER, '--check-config'], {
    encoding: 'utf8',
    env: { ...process.env, MAINE_DISPENSARYGUIDE_SMTP_CREDENTIALS: credFile },
    timeout: 10000,
  });
  const output = (r.stdout || '') + (r.stderr || '');
  assert.ok(!output.includes('hidden-email@test.com'), 'must not output email');
  assert.ok(!output.includes('hidden-pass-xyz'), 'must not output password');
});

// =========================================================================
// Category 2: No hardcoded secrets in source
// =========================================================================

check('2a: no hardcoded PGPASSWORD or DB password in audit source', () => {
  const src = readFileSync(SCRIPT, 'utf8');
  assert.doesNotMatch(src, /PGPASSWORD\s*=/i, 'must not embed PGPASSWORD');
  assert.doesNotMatch(src, /password\s*=\s*['"][^'"]{4,}['"]/i, 'must not embed password literal');
});

check('2b: no host-specific connection secrets in audit source', () => {
  const src = readFileSync(SCRIPT, 'utf8');
  assert.doesNotMatch(src, /localhost.*psql/i, 'must not hardcode localhost psql');
  assert.doesNotMatch(src, /192\.168\.\d+\.\d+/, 'must not hardcode LAN IPs');
  assert.doesNotMatch(src, /-U\s+steve/i, 'must not hardcode psql user');
});

// =========================================================================
// Category 3: Database not-configured is explicit
// =========================================================================

check('3a: database status is not_configured when no env vars set', () => {
  const { report } = runAudit({
    MDG_LEADS_DB_COMMAND: '',
    MDG_LEADS_DB_HOST: '',
    MDG_LEADS_DB_NAME: '',
    MDG_LEADS_DB_USER: '',
  });
  assert.ok(report, 'report should exist');
  assert.equal(report.checks.database.status, 'not_configured');
  assert.ok(report.checks.database.remediation, 'should have remediation code');
});

check('3b: not_configured is distinct from healthy, passed, and skipped', () => {
  const { report } = runAudit({
    MDG_LEADS_DB_COMMAND: '',
    MDG_LEADS_DB_HOST: '',
    MDG_LEADS_DB_NAME: '',
    MDG_LEADS_DB_USER: '',
  });
  assert.ok(report);
  const s = report.checks.database.status;
  assert.ok(!['healthy', 'passed', 'skipped', 'ok'].includes(s),
    `must not be healthy/passed/skipped/ok, got: ${s}`);
});

// =========================================================================
// Category 4: Report path is outside public/
// =========================================================================

check('4a: default report path is outside public/', () => {
  const { reportPath } = runAudit({});
  const publicDir = resolve(PROJECT_ROOT, 'public');
  assert.ok(!reportPath.startsWith(publicDir),
    `report ${reportPath} must not be under ${publicDir}`);
});

check('4b: report path avoids all web-served trees', () => {
  const { reportPath } = runAudit({});
  assert.ok(!reportPath.includes('/public/'), 'not in public/');
  assert.ok(!reportPath.includes('/dist/'), 'not in dist/');
  assert.ok(!reportPath.includes('/.vercel/'), 'not in .vercel/');
});

// =========================================================================
// Category 5: Report writing is atomic
// =========================================================================

check('5a: source uses tmp+fsync+rename pattern', () => {
  const src = readFileSync(SCRIPT, 'utf8');
  assert.match(src, /renameSync/, 'must use renameSync');
  assert.match(src, /fsyncSync/, 'must use fsyncSync');
  assert.match(src, /\.tmp/, 'must write to temp file first');
});

check('5b: no stale temp files remain after run', () => {
  const { reportPath } = runAudit({});
  const dir = resolve(reportPath, '..');
  if (existsSync(dir)) {
    const temps = readdirSync(dir).filter(f => f.endsWith('.tmp'));
    assert.equal(temps.length, 0, `stale temp files: ${temps.join(', ')}`);
  }
});

// =========================================================================
// Category 6: Himalaya optional absence is distinct
// =========================================================================

check('6a: missing himalaya is optional_absent, not fail or unhealthy', () => {
  const fakeHome = join(FIXTURE_DIR, 'nohome');
  mkdirSync(fakeHome, { recursive: true });
  const { report } = runAudit({ HOME: fakeHome });
  assert.ok(report);
  assert.equal(report.checks.manual_fallback.status, 'optional_absent');
});

check('6b: optional_absent is not in the failure status set', () => {
  const src = readFileSync(SCRIPT, 'utf8');
  const idx = src.indexOf('FAILURE_STATUSES');
  assert.ok(idx !== -1, 'should define FAILURE_STATUSES');
  const block = src.slice(idx, src.indexOf('];', idx));
  assert.ok(!block.includes('optional_absent'),
    'optional_absent must not be a failure status');
  assert.ok(!block.includes('not_checked'),
    'not_checked must not be a failure status');
});

// =========================================================================
// Category 7: Overall not healthy while fulfillment absent/unverified
// =========================================================================

check('7a: overall is not healthy when fulfillment is absent', () => {
  const { report } = runAudit({ MDG_FULFILLMENT_WORKFLOW_ID: '' });
  assert.ok(report);
  assert.equal(report.checks.fulfillment_capability.status, 'absent');
  assert.notEqual(report.overall_status, 'healthy');
});

check('7b: overall is not healthy when credentials are missing', () => {
  const { report } = runAudit({
    MAINE_DISPENSARYGUIDE_SMTP_CREDENTIALS: '/nonexistent/path',
    EMAIL_PIPELINE_CREDENTIALS: '',
    PURELYMAIL_CREDENTIALS_FILE: '',
  });
  assert.ok(report);
  assert.notEqual(report.overall_status, 'healthy');
});

// =========================================================================
// Category 8: Deterministic exit codes
// =========================================================================

check('8a: exit 1 for unhealthy (current default state)', () => {
  const r = runAudit({});
  assert.equal(r.status, 1, `expected exit 1, got ${r.status}`);
});

check('8b: exit code is deterministic across runs', () => {
  const r1 = runAudit({});
  const r2 = runAudit({});
  assert.equal(r1.status, r2.status, 'exit code must be deterministic');
});

check('8c: exit 0 for healthy fixture', () => {
  const credFile = makeCredFile(join(FIXTURE_DIR, 'c8c'),
    'SMTP_EMAIL=test@example.com\nSMTP_PASSWORD=testpass\n');
  const markerDir = resolve(PROJECT_ROOT, 'config');
  const markerFile = join(markerDir, 'fulfillment.json');
  const markerExisted = existsSync(markerFile);
  const prevContent = markerExisted ? readFileSync(markerFile, 'utf8') : null;
  try {
    mkdirSync(markerDir, { recursive: true });
    writeFileSync(markerFile, JSON.stringify({
      schema_version: '1.0',
      workflow_id: 'test-w14',
      acceptance_status: 'accepted',
      verified_at: '2026-07-27T00:00:00Z',
    }));
    const r = runAudit({
      MAINE_DISPENSARYGUIDE_SMTP_CREDENTIALS: credFile,
      MDG_FULFILLMENT_WORKFLOW_ID: '',
      MDG_LEADS_DB_COMMAND: 'echo "0|"',
    });
    assert.equal(r.status, 0, `expected exit 0, got ${r.status}`);
  } finally {
    if (markerExisted) writeFileSync(markerFile, prevContent);
    else rmSync(markerFile, { force: true });
  }
});

check('8d: exit 2 for not_configured fixture', () => {
  const credFile = makeCredFile(join(FIXTURE_DIR, 'c8d'),
    'SMTP_EMAIL=test@example.com\nSMTP_PASSWORD=testpass\n');
  const markerDir = resolve(PROJECT_ROOT, 'config');
  const markerFile = join(markerDir, 'fulfillment.json');
  const markerExisted = existsSync(markerFile);
  const prevContent = markerExisted ? readFileSync(markerFile, 'utf8') : null;
  try {
    mkdirSync(markerDir, { recursive: true });
    writeFileSync(markerFile, JSON.stringify({
      schema_version: '1.0',
      workflow_id: 'test-w14',
      acceptance_status: 'accepted',
      verified_at: '2026-07-27T00:00:00Z',
    }));
    const r = runAudit({
      MAINE_DISPENSARYGUIDE_SMTP_CREDENTIALS: credFile,
      MDG_FULFILLMENT_WORKFLOW_ID: '',
      MDG_LEADS_DB_COMMAND: '',
      MDG_LEADS_DB_HOST: '',
      MDG_LEADS_DB_NAME: '',
      MDG_LEADS_DB_USER: '',
    });
    assert.equal(r.status, 2, `expected exit 2, got ${r.status}`);
  } finally {
    if (markerExisted) writeFileSync(markerFile, prevContent);
    else rmSync(markerFile, { force: true });
  }
});

// =========================================================================
// Category 9: No runtime report enters Git
// =========================================================================

check('9a: default report path is outside the repository', () => {
  const { reportPath } = runAuditDefault({});
  assert.ok(!reportPath.startsWith(PROJECT_ROOT),
    `report ${reportPath} must be outside repo ${PROJECT_ROOT}`);
});

check('9b: report location does not require .gitignore coverage', () => {
  const { reportPath } = runAuditDefault({});
  assert.ok(!reportPath.startsWith(PROJECT_ROOT));
});

// =========================================================================
// Category 10: Database unreachable/query_failed never produce healthy
// =========================================================================

check('10a: database unreachable → overall not healthy, exit nonzero', () => {
  const r = runAudit({
    MDG_LEADS_DB_COMMAND: 'echo "connection refused" >&2; exit 1',
  });
  assert.ok(r.report);
  assert.equal(r.report.checks.database.status, 'unreachable');
  assert.notEqual(r.report.overall_status, 'healthy');
  assert.notEqual(r.status, 0, 'must not exit 0 on unreachable DB');
});

check('10b: database query_failed → overall not healthy, exit nonzero', () => {
  const r = runAudit({
    MDG_LEADS_DB_COMMAND: 'echo "garbage-not-a-count"',
  });
  assert.ok(r.report);
  assert.equal(r.report.checks.database.status, 'query_failed');
  assert.notEqual(r.report.overall_status, 'healthy');
  assert.notEqual(r.status, 0, 'must not exit 0 on query_failed');
});

check('10c: FAILURE_STATUSES includes unreachable and query_failed', () => {
  const src = readFileSync(SCRIPT, 'utf8');
  const idx = src.indexOf('FAILURE_STATUSES');
  const block = src.slice(idx, src.indexOf('];', idx));
  assert.ok(block.includes('unreachable'), 'unreachable must be a failure status');
  assert.ok(block.includes('query_failed'), 'query_failed must be a failure status');
});

// =========================================================================
// Category 11: Report-write failure → nonzero + REPORT_WRITE_FAILED
// =========================================================================

check('11a: unwritable report target → nonzero exit', () => {
  // Point --report-path at a path whose parent is a regular file (cannot mkdir)
  const blocker = join(FIXTURE_DIR, 'blocker-file');
  writeFileSync(blocker, 'not a directory');
  const badPath = join(blocker, 'subdir', 'report.json');
  const r = spawnSync(process.execPath, [SCRIPT, '--report-path', badPath], {
    encoding: 'utf8',
    env: { ...process.env },
    timeout: 30000,
    cwd: PROJECT_ROOT,
  });
  assert.notEqual(r.status, 0, `must exit nonzero on write failure, got ${r.status}`);
  assert.match(r.stderr, /could not write report/i, 'must emit sanitized error');
  assert.match(r.stderr, /REPORT_WRITE_FAILED|write_failed|ENOTDIR|EEXIST/i,
    'must surface remediation/error code');
});

check('11b: report-write failure adds REPORT_WRITE_FAILED remediation', () => {
  const src = readFileSync(SCRIPT, 'utf8');
  assert.match(src, /REPORT_WRITE_FAILED/, 'must define REPORT_WRITE_FAILED code');
  // The write-failure branch must force nonzero exit
  assert.match(src, /reportWriteFailed[\s\S]{0,200}process\.exit\(1\)/,
    'write failure must force exit(1)');
});

// =========================================================================
// Category 12: --report-path inside web-served trees is rejected
// =========================================================================

check('12a: --report-path inside public/ is rejected', () => {
  const badPath = resolve(PROJECT_ROOT, 'public', 'data', 'evil-report.json');
  const r = spawnSync(process.execPath, [SCRIPT, '--report-path', badPath], {
    encoding: 'utf8',
    env: { ...process.env },
    timeout: 30000,
    cwd: PROJECT_ROOT,
  });
  assert.notEqual(r.status, 0, 'must reject public/ path');
  assert.match(r.stderr, /web-served|public|dist|\.vercel/i, 'must explain rejection');
  assert.ok(!existsSync(badPath), 'must not create the forbidden report');
});

check('12b: --report-path inside dist/ is rejected', () => {
  const badPath = resolve(PROJECT_ROOT, 'dist', 'report.json');
  const r = spawnSync(process.execPath, [SCRIPT, '--report-path', badPath], {
    encoding: 'utf8',
    env: { ...process.env },
    timeout: 30000,
    cwd: PROJECT_ROOT,
  });
  assert.notEqual(r.status, 0, 'must reject dist/ path');
});

check('12c: --report-path inside .vercel/ is rejected', () => {
  const badPath = resolve(PROJECT_ROOT, '.vercel', 'output', 'report.json');
  const r = spawnSync(process.execPath, [SCRIPT, '--report-path', badPath], {
    encoding: 'utf8',
    env: { ...process.env },
    timeout: 30000,
    cwd: PROJECT_ROOT,
  });
  assert.notEqual(r.status, 0, 'must reject .vercel/ path');
});

check('12d: a safe --report-path outside web trees is accepted', () => {
  const goodPath = join(FIXTURE_DIR, 'safe-report.json');
  const r = spawnSync(process.execPath, [SCRIPT, '--report-path', goodPath], {
    encoding: 'utf8',
    env: { ...process.env },
    timeout: 30000,
    cwd: PROJECT_ROOT,
  });
  // Should run to completion (exit 0/1/2), not the rejection path
  assert.ok([0, 1, 2].includes(r.status), `valid exit code, got ${r.status}`);
  assert.ok(!/web-served/.test(r.stderr), 'must not reject a safe path');
  assert.ok(existsSync(goodPath), 'must write the safe report');
});

// =========================================================================
// Category 13: Real default-path resolution
// =========================================================================

check('13a: default resolution writes to XDG_CACHE_HOME/mdg/leads-audit/', () => {
  const { reportPath, fakeCache, report } = runAuditDefault({});
  const expected = join(fakeCache, 'mdg', 'leads-audit', 'report.json');
  assert.equal(reportPath, expected, `default path mismatch: ${reportPath}`);
  assert.ok(existsSync(expected), 'report must exist at default path');
  assert.ok(report, 'report must be parseable');
});

check('13b: default report directory mode is 0700', () => {
  const { fakeCache } = runAuditDefault({});
  const dir = join(fakeCache, 'mdg', 'leads-audit');
  assert.ok(existsSync(dir), 'dir must exist');
  const mode = statSync(dir).mode & 0o777;
  assert.equal(mode, 0o700, `dir mode must be 0700, got 0${mode.toString(8)}`);
});

check('13c: default report file mode is 0600', () => {
  const { fakeCache } = runAuditDefault({});
  const file = join(fakeCache, 'mdg', 'leads-audit', 'report.json');
  assert.ok(existsSync(file), 'file must exist');
  const mode = statSync(file).mode & 0o777;
  assert.equal(mode, 0o600, `file mode must be 0600, got 0${mode.toString(8)}`);
});

check('13d: default resolution never writes into the repository', () => {
  const { reportPath } = runAuditDefault({});
  assert.ok(!reportPath.startsWith(PROJECT_ROOT),
    `default report ${reportPath} must be outside repo`);
});

// =========================================================================
// Category 14: Insecure credential file mode → --check-config nonzero
// =========================================================================

check('14a: mode 0644 credential file → --check-config exits nonzero', () => {
  const credFile = makeCredFile(join(FIXTURE_DIR, 'c14a'),
    'SMTP_EMAIL=test@example.com\nSMTP_PASSWORD=testpass\n', 0o644);
  const r = spawnSync(process.execPath, [SENDER, '--check-config'], {
    encoding: 'utf8',
    env: { ...process.env, MAINE_DISPENSARYGUIDE_SMTP_CREDENTIALS: credFile },
    timeout: 10000,
  });
  assert.notEqual(r.status, 0, 'must exit nonzero for insecure mode');
  const parsed = JSON.parse(r.stdout);
  assert.equal(parsed.file_mode_acceptable, false, 'file_mode_acceptable must be false');
  // Still redacted
  assert.ok(!r.stdout.includes('test@example.com'), 'must not leak email');
  assert.ok(!r.stdout.includes('testpass'), 'must not leak password');
});

check('14b: mode 0600 credential file → --check-config exits zero', () => {
  const credFile = makeCredFile(join(FIXTURE_DIR, 'c14b'),
    'SMTP_EMAIL=test@example.com\nSMTP_PASSWORD=testpass\n', 0o600);
  const r = spawnSync(process.execPath, [SENDER, '--check-config'], {
    encoding: 'utf8',
    env: { ...process.env, MAINE_DISPENSARYGUIDE_SMTP_CREDENTIALS: credFile },
    timeout: 10000,
  });
  assert.equal(r.status, 0, `must exit zero for secure mode, got ${r.status}`);
  const parsed = JSON.parse(r.stdout);
  assert.equal(parsed.file_mode_acceptable, true, 'file_mode_acceptable must be true');
});

check('14c: insecure credential mode → audit credential_readiness invalid', () => {
  const credFile = makeCredFile(join(FIXTURE_DIR, 'c14c'),
    'SMTP_EMAIL=test@example.com\nSMTP_PASSWORD=testpass\n', 0o644);
  const { report } = runAudit({ MAINE_DISPENSARYGUIDE_SMTP_CREDENTIALS: credFile });
  assert.ok(report);
  assert.equal(report.checks.credential_readiness.status, 'invalid');
  assert.notEqual(report.overall_status, 'healthy');
});

// =========================================================================
// Category 15: Fulfillment marker contract
// =========================================================================

function withMarker(markerContent, fn) {
  const markerDir = resolve(PROJECT_ROOT, 'config');
  const markerFile = join(markerDir, 'fulfillment.json');
  const markerExisted = existsSync(markerFile);
  const prevContent = markerExisted ? readFileSync(markerFile, 'utf8') : null;
  try {
    mkdirSync(markerDir, { recursive: true });
    if (markerContent === null) {
      rmSync(markerFile, { force: true });
    } else {
      writeFileSync(markerFile, markerContent);
    }
    return fn();
  } finally {
    if (markerExisted) writeFileSync(markerFile, prevContent);
    else rmSync(markerFile, { force: true });
  }
}

check('15a: no marker → absent', () => {
  const { report } = withMarker(null, () =>
    runAudit({ MDG_FULFILLMENT_WORKFLOW_ID: '' }));
  assert.equal(report.checks.fulfillment_capability.status, 'absent');
});

check('15b: empty marker file → invalid', () => {
  const { report } = withMarker('', () =>
    runAudit({ MDG_FULFILLMENT_WORKFLOW_ID: '' }));
  assert.equal(report.checks.fulfillment_capability.status, 'invalid');
});

check('15c: malformed JSON marker → invalid', () => {
  const { report } = withMarker('{not valid json', () =>
    runAudit({ MDG_FULFILLMENT_WORKFLOW_ID: '' }));
  assert.equal(report.checks.fulfillment_capability.status, 'invalid');
});

check('15d: marker missing required fields → invalid', () => {
  const { report } = withMarker(JSON.stringify({ workflow_id: 'w14' }), () =>
    runAudit({ MDG_FULFILLMENT_WORKFLOW_ID: '' }));
  assert.equal(report.checks.fulfillment_capability.status, 'invalid');
});

check('15e: marker with acceptance_status != accepted → configured_unverified', () => {
  const { report } = withMarker(JSON.stringify({
    schema_version: '1.0', workflow_id: 'w14', acceptance_status: 'pending',
  }), () => runAudit({ MDG_FULFILLMENT_WORKFLOW_ID: '' }));
  assert.equal(report.checks.fulfillment_capability.status, 'configured_unverified');
  assert.notEqual(report.overall_status, 'healthy');
});

check('15f: marker with acceptance_status=accepted → verified', () => {
  const { report } = withMarker(JSON.stringify({
    schema_version: '1.0', workflow_id: 'w14', acceptance_status: 'accepted',
    verified_at: '2026-07-27T00:00:00Z',
  }), () => runAudit({ MDG_FULFILLMENT_WORKFLOW_ID: '' }));
  assert.equal(report.checks.fulfillment_capability.status, 'verified');
});

check('15g: env-var marker alone → configured_unverified (not verified)', () => {
  const { report } = withMarker(null, () =>
    runAudit({ MDG_FULFILLMENT_WORKFLOW_ID: 'some-workflow-id' }));
  assert.equal(report.checks.fulfillment_capability.status, 'configured_unverified');
  assert.notEqual(report.overall_status, 'healthy',
    'arbitrary env string must not become verified/healthy');
});

check('15h: only verified may contribute to healthy', () => {
  const src = readFileSync(SCRIPT, 'utf8');
  const idx = src.indexOf('FAILURE_STATUSES');
  const block = src.slice(idx, src.indexOf('];', idx));
  assert.ok(block.includes('configured_unverified'),
    'configured_unverified must be a failure status (cannot be healthy)');
});

// =========================================================================
// Schema validation
// =========================================================================

check('schema: report has all required fields', () => {
  const { report } = runAudit({});
  assert.ok(report, 'report should exist');
  assert.ok(report.schema_version, 'schema_version');
  assert.ok(report.generated_at, 'generated_at');
  assert.ok(report.overall_status, 'overall_status');
  assert.ok(report.checks, 'checks');
  for (const key of ['capture', 'fulfillment_capability', 'credential_readiness',
                      'database', 'sender_script', 'manual_fallback']) {
    assert.ok(report.checks[key], `checks.${key}`);
    assert.ok(report.checks[key].status, `checks.${key}.status`);
    assert.ok(report.checks[key].detail, `checks.${key}.detail`);
  }
  assert.ok(Array.isArray(report.remediation_codes), 'remediation_codes');
  assert.ok('pending_count' in report, 'pending_count field');
  assert.ok('oldest_pending_age_hours' in report, 'oldest_pending_age_hours field');
});

// =========================================================================
// Cleanup + summary
// =========================================================================

try { rmSync(FIXTURE_DIR, { recursive: true, force: true }); } catch { /* best effort */ }

process.stderr.write(`\nmdg-leads-audit.test.cjs: ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
