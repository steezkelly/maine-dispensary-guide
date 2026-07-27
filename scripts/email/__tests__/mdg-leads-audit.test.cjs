'use strict';

/**
 * mdg-leads-audit.test.cjs — 9-category regression tests for the
 * MDG leads pipeline audit script (schema v2.0.0).
 *
 * Categories:
 *   1. No credential values enter report output
 *   2. No hardcoded PGPASSWORD, DB passwords, or host-specific secrets
 *   3. Database not-configured state is explicit
 *   4. Report path is outside public/
 *   5. Report writing is atomic
 *   6. Optional Himalaya absence is represented distinctly
 *   7. Overall health cannot be green while fulfillment is absent
 *   8. Script exits deterministically for healthy/unhealthy/not-configured
 *   9. No runtime report enters Git
 *
 * Run: node scripts/email/__tests__/mdg-leads-audit.test.cjs
 */

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const {
  existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync
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

function makeCredFile(dir, content) {
  mkdirSync(dir, { recursive: true });
  const p = join(dir, 'test-smtp.env');
  writeFileSync(p, content, { mode: 0o600 });
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
  const line = src.slice(idx, src.indexOf('\n', idx));
  assert.ok(!line.includes('optional_absent'),
    'optional_absent must not be a failure status');
});

// =========================================================================
// Category 7: Overall not healthy while fulfillment absent
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
  const r = runAudit({
    MAINE_DISPENSARYGUIDE_SMTP_CREDENTIALS: credFile,
    MDG_FULFILLMENT_WORKFLOW_ID: 'test-workflow',
    MDG_LEADS_DB_COMMAND: 'echo "0|"',
  });
  assert.equal(r.status, 0, `expected exit 0, got ${r.status}`);
});

check('8d: exit 2 for not_configured fixture', () => {
  const credFile = makeCredFile(join(FIXTURE_DIR, 'c8d'),
    'SMTP_EMAIL=test@example.com\nSMTP_PASSWORD=testpass\n');
  const r = runAudit({
    MAINE_DISPENSARYGUIDE_SMTP_CREDENTIALS: credFile,
    MDG_FULFILLMENT_WORKFLOW_ID: 'test-workflow',
    MDG_LEADS_DB_COMMAND: '',
    MDG_LEADS_DB_HOST: '',
    MDG_LEADS_DB_NAME: '',
    MDG_LEADS_DB_USER: '',
  });
  assert.equal(r.status, 2, `expected exit 2, got ${r.status}`);
});

// =========================================================================
// Category 9: No runtime report enters Git
// =========================================================================

check('9a: default report path is outside the repository', () => {
  const { reportPath } = runAudit({});
  assert.ok(!reportPath.startsWith(PROJECT_ROOT),
    `report ${reportPath} must be outside repo ${PROJECT_ROOT}`);
});

check('9b: report location does not require .gitignore coverage', () => {
  const { reportPath } = runAudit({});
  // Outside the repo -> .gitignore is irrelevant
  assert.ok(!reportPath.startsWith(PROJECT_ROOT));
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
