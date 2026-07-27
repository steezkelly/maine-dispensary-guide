#!/usr/bin/env node
/**
 * mdg-leads-audit.cjs — Monitoring baseline for the MDG lead pipeline.
 *
 * Schema version 2.1.0. Replaces the PR #200 v1 audit script.
 *
 * Checks:
 *   1. capture                — Vercel /api/lead rewrite present
 *   2. fulfillment_capability — W14 autoresponder workflow marker (structured)
 *   3. credential_readiness   — delegates to send-email.cjs --check-config
 *   4. database               — configurable adapter; never embeds secrets
 *   5. sender_script          — scripts/send-email.cjs present + nodemailer
 *   6. manual_fallback        — himalaya config presence (optional signal)
 *
 * Report location:
 *   $XDG_CACHE_HOME/mdg/leads-audit/report.json
 *   Fallback: $HOME/.cache/mdg/leads-audit/report.json
 *   Override: --report-path <path> (rejected if inside web-served trees)
 *   NEVER written to public/ or any web-served tree.
 *
 * Atomic write: temp file + fsync + rename.
 * Report-write failure → nonzero exit + REPORT_WRITE_FAILED.
 *
 * Exit codes:
 *   0 = healthy
 *   1 = unhealthy (one or more checks failed, or report write failed)
 *   2 = not_configured (no failures, but critical checks not configured)
 *
 * Usage:
 *   node scripts/email/mdg-leads-audit.cjs [--verbose] [--report-path <path>]
 *
 * Security:
 *   - Credential validation is delegated to send-email.cjs --check-config
 *     (sender-owned redacted self-check). This script NEVER reads credential
 *     file contents directly.
 *   - Database access uses environment-supplied identity or a command adapter.
 *     No passwords, connection strings, or host-specific secrets are embedded.
 *   - The report contains only status flags, counts, and remediation codes.
 *     No PII, no credential values, no connection secrets.
 */

'use strict';

const { execFileSync, execSync } = require('node:child_process');
const {
  existsSync, mkdirSync, writeFileSync, renameSync,
  openSync, closeSync, readFileSync, statSync,
  readdirSync, unlinkSync, fsyncSync
} = require('node:fs');
const { resolve, join, dirname, basename, relative, sep } = require('node:path');
const { tmpdir } = require('node:os');

const VERBOSE = process.argv.includes('--verbose');
const PROJECT_ROOT = resolve(__dirname, '..', '..');
const SENDER_SCRIPT = resolve(PROJECT_ROOT, 'scripts', 'send-email.cjs');
const SCHEMA_VERSION = '2.1.0';

function log(msg) {
  if (VERBOSE) process.stderr.write(msg + '\n');
}

// ---------------------------------------------------------------------------
// Report path resolution + enforcement
// ---------------------------------------------------------------------------

// Directories that must never contain the runtime report.
const FORBIDDEN_REPORT_SEGMENTS = [
  `${sep}public${sep}`,
  `${sep}dist${sep}`,
  `${sep}.vercel${sep}`,
];

function isForbiddenReportPath(absPath) {
  const normalized = resolve(absPath) + sep;
  return FORBIDDEN_REPORT_SEGMENTS.some(seg => normalized.includes(seg));
}

function resolveReportPath() {
  const idx = process.argv.indexOf('--report-path');
  if (idx !== -1 && process.argv[idx + 1]) {
    const requested = resolve(process.argv[idx + 1]);
    if (isForbiddenReportPath(requested)) {
      process.stderr.write(
        `Error: --report-path "${process.argv[idx + 1]}" is inside a ` +
        `web-served or generated tree (public/, dist/, .vercel/). ` +
        `Choose a path outside those directories.\n`);
      process.exit(1);
    }
    return requested;
  }
  const cacheBase = process.env.XDG_CACHE_HOME ||
    join(process.env.HOME || tmpdir(), '.cache');
  return join(cacheBase, 'mdg', 'leads-audit', 'report.json');
}

// ---------------------------------------------------------------------------
// Atomic JSON write
// ---------------------------------------------------------------------------

function atomicWriteJSON(filePath, data) {
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true, mode: 0o700 });

  // Clean stale temp files older than 1 hour
  try {
    const now = Date.now();
    for (const entry of readdirSync(dir)) {
      if (!entry.startsWith('.report-') || !entry.endsWith('.tmp')) continue;
      const tmpPath = join(dir, entry);
      try {
        const st = statSync(tmpPath);
        if (now - st.mtimeMs > 3600000) unlinkSync(tmpPath);
      } catch { /* best effort */ }
    }
  } catch { /* directory may not exist yet */ }

  const tmpPath = join(dir, `.report-${process.pid}-${Date.now()}.tmp`);
  const fd = openSync(tmpPath, 'w', 0o600);
  try {
    writeFileSync(fd, JSON.stringify(data, null, 2) + '\n');
    fsyncSync(fd);
    closeSync(fd);
    renameSync(tmpPath, filePath);
  } catch (err) {
    try { closeSync(fd); } catch { /* already closed */ }
    try { unlinkSync(tmpPath); } catch { /* best effort */ }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Check result helper
// ---------------------------------------------------------------------------

function checkResult(status, detail, remediation) {
  const r = { status, detail };
  if (remediation) r.remediation = remediation;
  return r;
}

// ---------------------------------------------------------------------------
// 1. Capture check
// ---------------------------------------------------------------------------

function checkCapture() {
  try {
    const vercelJson = resolve(PROJECT_ROOT, 'vercel.json');
    if (!existsSync(vercelJson)) {
      return checkResult('not_configured', 'vercel.json not found');
    }
    const content = readFileSync(vercelJson, 'utf8');
    if (content.includes('/api/lead')) {
      return checkResult('healthy',
        'Vercel rewrite /api/lead present in vercel.json');
    }
    return checkResult('unhealthy',
      'Vercel rewrite /api/lead NOT found in vercel.json',
      'CAPTURE_REWRITE_MISSING');
  } catch (err) {
    return checkResult('unhealthy',
      `Capture check error: ${err.message}`, 'CAPTURE_CHECK_ERROR');
  }
}

// ---------------------------------------------------------------------------
// 2. Fulfillment capability check (structured marker contract)
//
// Marker states:
//   absent                — no marker found
//   configured_unverified — marker exists but acceptance_status != 'accepted'
//   verified              — marker exists, valid JSON, acceptance_status='accepted'
//   invalid               — marker exists but is empty, malformed, or missing
//                           required fields
//
// Only 'verified' may contribute to overall healthy.
// ---------------------------------------------------------------------------

const FULFILLMENT_MARKER_SCHEMA = '1.0';

function checkFulfillment() {
  const fileMarker = resolve(PROJECT_ROOT, 'config', 'fulfillment.json');
  const envMarker = process.env.MDG_FULFILLMENT_WORKFLOW_ID;

  // Env-var marker: treated as configured_unverified (cannot carry
  // structured acceptance evidence).
  if (envMarker && !existsSync(fileMarker)) {
    return checkResult('configured_unverified',
      'Fulfillment workflow ID set via env MDG_FULFILLMENT_WORKFLOW_ID, ' +
      'but no structured acceptance marker found at config/fulfillment.json. ' +
      'Set acceptance_status="accepted" in the marker file after W14 ' +
      'end-to-end acceptance.',
      'FULFILLMENT_UNVERIFIED');
  }

  if (!existsSync(fileMarker)) {
    return checkResult('absent',
      'No automated fulfillment workflow (W14) is configured. ' +
      'Leads with promised_asset will remain pending indefinitely.',
      'FULFILLMENT_NOT_BUILT');
  }

  // File exists — validate structured marker
  let raw;
  try {
    raw = readFileSync(fileMarker, 'utf8');
  } catch {
    return checkResult('invalid',
      'config/fulfillment.json exists but cannot be read', 'FULFILLMENT_MARKER_INVALID');
  }

  if (!raw.trim()) {
    return checkResult('invalid',
      'config/fulfillment.json is empty', 'FULFILLMENT_MARKER_INVALID');
  }

  let marker;
  try {
    marker = JSON.parse(raw);
  } catch {
    return checkResult('invalid',
      'config/fulfillment.json is not valid JSON', 'FULFILLMENT_MARKER_INVALID');
  }

  // Required non-secret fields
  const requiredFields = ['schema_version', 'workflow_id', 'acceptance_status'];
  const missingFields = requiredFields.filter(f => !(f in marker));
  if (missingFields.length > 0) {
    return checkResult('invalid',
      `config/fulfillment.json missing required fields: ${missingFields.join(', ')}`,
      'FULFILLMENT_MARKER_INVALID');
  }

  if (marker.acceptance_status === 'accepted') {
    return checkResult('verified',
      `Fulfillment workflow ${marker.workflow_id} verified ` +
      `(accepted${marker.verified_at ? ' at ' + marker.verified_at : ''})`);
  }

  return checkResult('configured_unverified',
    `Fulfillment workflow ${marker.workflow_id} configured but ` +
    `acceptance_status="${marker.acceptance_status}" (not "accepted"). ` +
    `Complete W14 end-to-end acceptance to verify.`,
    'FULFILLMENT_UNVERIFIED');
}

// ---------------------------------------------------------------------------
// 3. Credential readiness check (delegates to sender)
// ---------------------------------------------------------------------------

function checkCredentials() {
  if (!existsSync(SENDER_SCRIPT)) {
    return checkResult('missing',
      `${relative(PROJECT_ROOT, SENDER_SCRIPT)} not found; cannot validate credentials`,
      'SENDER_MISSING');
  }

  try {
    const stdout = execFileSync(process.execPath, [SENDER_SCRIPT, '--check-config'], {
      encoding: 'utf8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return interpretCheckConfig(stdout);
  } catch (err) {
    // execFileSync throws on non-zero exit — expected when creds are missing/invalid
    if (err.stdout) {
      try {
        return interpretCheckConfig(err.stdout);
      } catch { /* fall through to generic message */ }
    }
    // Sanitize: never include stderr (may contain credential content in stack traces)
    return checkResult('missing',
      'Credential check failed (sender exited non-zero)', 'CRED_MISSING');
  }
}

function interpretCheckConfig(stdout) {
  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return checkResult('invalid',
      'send-email.cjs --check-config returned non-JSON output',
      'CRED_CHECK_PARSE_ERROR');
  }

  const id = parsed.source_class && parsed.source_path_id
    ? ` (${parsed.source_class}:${parsed.source_path_id})`
    : '';

  if (!parsed.credential_source_found) {
    return checkResult('missing',
      'No SMTP credential file found in any expected location', 'CRED_MISSING');
  }
  if (!parsed.format_recognized) {
    return checkResult('invalid',
      `Credential file found${id} but format not recognized`, 'CRED_FORMAT_INVALID');
  }
  if (!parsed.required_fields_present) {
    return checkResult('invalid',
      `Credential file found${id} but required fields missing`, 'CRED_FIELDS_MISSING');
  }
  if (!parsed.file_mode_acceptable) {
    return checkResult('invalid',
      `Credential file found${id} but permissions too permissive (expected 600 or 400)`,
      'CRED_MODE_INSECURE');
  }

  return checkResult('ready', `Credential source verified${id}`);
}

// ---------------------------------------------------------------------------
// 4. Database check
// ---------------------------------------------------------------------------

const DB_QUERY =
  "SELECT COUNT(*) FILTER (WHERE fulfillment_status='pending'), " +
  "EXTRACT(EPOCH FROM (NOW() - MIN(received_at) FILTER (WHERE fulfillment_status='pending')))/3600 " +
  "FROM mdg_leads";

function checkDatabase() {
  // Strategy 1: explicit command adapter (operator-provided shell command)
  const dbCommand = process.env.MDG_LEADS_DB_COMMAND;
  if (dbCommand) {
    return runDbShellCommand(dbCommand);
  }

  // Strategy 2: environment-supplied connection identity (no embedded secrets)
  const dbHost = process.env.MDG_LEADS_DB_HOST;
  const dbName = process.env.MDG_LEADS_DB_NAME;
  const dbUser = process.env.MDG_LEADS_DB_USER;

  if (dbHost && dbName && dbUser) {
    return runDbPsql(dbHost, dbUser, dbName);
  }

  return checkResult('not_configured',
    'No database inspection configured. Set MDG_LEADS_DB_COMMAND or ' +
    'MDG_LEADS_DB_HOST + MDG_LEADS_DB_NAME + MDG_LEADS_DB_USER ' +
    '(password via PGPASSWORD env or ~/.pgpass).',
    'DB_NOT_CONFIGURED');
}

function runDbShellCommand(cmd) {
  try {
    const stdout = execSync(cmd, {
      encoding: 'utf8',
      timeout: 15000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return parseDbOutput(stdout);
  } catch (err) {
    return classifyDbError(err);
  }
}

function runDbPsql(host, user, db) {
  try {
    // execFileSync with args array — no shell injection risk.
    // Password comes from PGPASSWORD env or ~/.pgpass; NEVER embedded here.
    const stdout = execFileSync('psql', [
      '-h', host, '-U', user, '-d', db,
      '-t', '-A', '-c', DB_QUERY,
    ], {
      encoding: 'utf8',
      timeout: 15000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return parseDbOutput(stdout);
  } catch (err) {
    return classifyDbError(err);
  }
}

function parseDbOutput(stdout) {
  const line = (stdout || '').trim().split('\n')[0];
  if (!line) {
    return checkResult('query_failed', 'Database query returned empty result', 'DB_QUERY_FAILED');
  }
  const parts = line.split('|');
  const pendingCount = parseInt(parts[0], 10);
  const oldestHours = parts[1] && parts[1].trim() !== ''
    ? parseFloat(parts[1])
    : null;

  if (Number.isNaN(pendingCount)) {
    return checkResult('query_failed', 'Could not parse database output', 'DB_QUERY_FAILED');
  }

  const result = checkResult(
    pendingCount > 0 ? 'unhealthy' : 'healthy',
    `${pendingCount} pending lead(s)` +
    (oldestHours !== null && !Number.isNaN(oldestHours)
      ? `, oldest ${oldestHours.toFixed(1)}h`
      : '')
  );
  result.pending_count = pendingCount;
  result.oldest_pending_age_hours =
    oldestHours !== null && !Number.isNaN(oldestHours) ? oldestHours : null;
  if (pendingCount > 0) result.remediation = 'LEADS_PENDING';
  return result;
}

function classifyDbError(err) {
  const msg = ((err.stderr || '') + ' ' + (err.message || '')).toLowerCase();
  if (msg.includes('econnrefused') || msg.includes('could not connect') ||
      msg.includes('no such host') || msg.includes('connection refused')) {
    return checkResult('unreachable', 'Database server unreachable', 'DB_UNREACHABLE');
  }
  if (msg.includes('command not found') || msg.includes('enoent')) {
    return checkResult('not_configured', 'psql not available on this host', 'DB_PSQL_MISSING');
  }
  // Sanitize: do not include full error (may contain connection strings)
  return checkResult('query_failed', 'Database query failed', 'DB_QUERY_FAILED');
}

// ---------------------------------------------------------------------------
// 5. Sender script check
// ---------------------------------------------------------------------------

function checkSenderScript() {
  if (!existsSync(SENDER_SCRIPT)) {
    return checkResult('missing',
      `${relative(PROJECT_ROOT, SENDER_SCRIPT)} not found`, 'SENDER_MISSING');
  }
  try {
    const src = readFileSync(SENDER_SCRIPT, 'utf8');
    if (!src.includes('nodemailer')) {
      return checkResult('invalid',
        'send-email.cjs does not import nodemailer', 'SENDER_INVALID');
    }
    return checkResult('present',
      'scripts/send-email.cjs present with nodemailer import');
  } catch (err) {
    return checkResult('invalid',
      `Cannot read send-email.cjs: ${err.message}`, 'SENDER_INVALID');
  }
}

// ---------------------------------------------------------------------------
// 6. Manual fallback (Himalaya) check
// ---------------------------------------------------------------------------

function checkManualFallback() {
  const home = process.env.HOME || '';
  if (!home) {
    return checkResult('not_checked', 'HOME not set; cannot locate himalaya configs');
  }

  const configs = [
    join(home, '.config', 'himalaya', 'leads-mdg.toml'),
    join(home, '.config', 'himalaya', 'steve-mdg.toml'),
  ];

  const found = configs.filter(p => existsSync(p));

  if (found.length > 0) {
    for (const p of found) {
      try {
        const st = statSync(p);
        if (st.size === 0) {
          return checkResult('invalid',
            `Himalaya config ${basename(p)} is empty`, 'HIMALAYA_INVALID');
        }
      } catch {
        return checkResult('invalid',
          `Cannot stat ${basename(p)}`, 'HIMALAYA_INVALID');
      }
    }
    return checkResult('present',
      `Himalaya config(s) found: ${found.map(p => basename(p)).join(', ')}`);
  }

  return checkResult('optional_absent',
    'No himalaya configs found (manual reader fallback absent; ' +
    'does not affect automated fulfillment health)');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const checks = {
    capture: checkCapture(),
    fulfillment_capability: checkFulfillment(),
    credential_readiness: checkCredentials(),
    database: checkDatabase(),
    sender_script: checkSenderScript(),
    manual_fallback: checkManualFallback(),
  };

  // Collect remediation codes
  const remediationCodes = [];
  for (const result of Object.values(checks)) {
    if (result.remediation) remediationCodes.push(result.remediation);
  }

  // Determine overall status.
  // Failure statuses: any state that means the pipeline is broken or
  // cannot be confirmed working. This includes database unreachable
  // and query_failed — a database that cannot be inspected must not
  // produce a healthy overall result.
  //
  // Non-failing statuses (explicitly optional checks only):
  //   optional_absent — himalaya manual fallback is optional
  //   not_checked     — himalaya check could not run (HOME unset)
  //
  // not_configured is NOT a failure but prevents healthy (exit 2).
  const FAILURE_STATUSES = [
    'unhealthy', 'absent', 'missing', 'invalid',
    'unreachable', 'query_failed',
    'configured_unverified',
  ];
  const statuses = Object.values(checks).map(c => c.status);
  const hasFailure = statuses.some(s => FAILURE_STATUSES.includes(s));
  const hasNotConfigured = statuses.some(s => s === 'not_configured');

  let overallStatus;
  if (hasFailure) {
    overallStatus = 'unhealthy';
  } else if (hasNotConfigured) {
    overallStatus = 'not_configured';
  } else {
    overallStatus = 'healthy';
  }

  const report = {
    schema_version: SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    overall_status: overallStatus,
    checks,
    pending_count: checks.database.pending_count ?? null,
    oldest_pending_age_hours: checks.database.oldest_pending_age_hours ?? null,
    remediation_codes: remediationCodes,
  };

  // Write report atomically (never to public/ or any web-served tree).
  // Report-write failure is a hard error: nonzero exit, cannot report healthy.
  const reportPath = resolveReportPath();
  let reportWriteFailed = false;
  try {
    atomicWriteJSON(reportPath, report);
    log(`Report written to ${reportPath}`);
  } catch (err) {
    reportWriteFailed = true;
    // Sanitized: only the path identifier, never directory contents or secrets
    process.stderr.write(
      `Error: could not write report to ${reportPath}: ${err.code || 'write_failed'}\n`);
    if (!remediationCodes.includes('REPORT_WRITE_FAILED')) {
      remediationCodes.push('REPORT_WRITE_FAILED');
    }
    report.remediation_codes = remediationCodes;
  }

  if (VERBOSE) {
    process.stderr.write(`Overall: ${overallStatus} ` +
      `(${remediationCodes.length} remediation code(s))\n`);
    for (const [name, result] of Object.entries(checks)) {
      process.stderr.write(`  ${name}: ${result.status}\n`);
    }
  }

  // Exit codes: 0=healthy, 1=unhealthy, 2=not_configured
  // Report-write failure forces nonzero regardless of check results.
  if (reportWriteFailed) process.exit(1);
  if (overallStatus === 'healthy') process.exit(0);
  if (overallStatus === 'not_configured') process.exit(2);
  process.exit(1);
}

main();
