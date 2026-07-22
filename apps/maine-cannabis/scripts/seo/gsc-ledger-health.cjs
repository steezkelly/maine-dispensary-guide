#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { privateDataRoot } = require('./gsc-private-data-root.cjs');
const {
  assertNoSymlinks,
  inspectLedger,
  inspectSnapshots,
  LEDGER_NAME,
  SNAPSHOT_DIR_NAME,
  SNAPSHOT_KINDS,
  SOURCE_TIMEZONE,
} = require('./gsc-ledger.cjs');

const DEFAULT_DAILY_WRAPPER = path.join(process.env.HOME || '', '.local', 'bin', 'mdg-gsc-daily.sh');
const DEFAULT_WEEKLY_WRAPPER = path.join(process.env.HOME || '', '.local', 'bin', 'mdg-gsc-weekly.sh');

function laYmd(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SOURCE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = type => parts.find(part => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function shiftYmd(date, calendarDays) {
  const [year, month, day] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day));
  shifted.setUTCDate(shifted.getUTCDate() + calendarDays);
  return shifted.toISOString().slice(0, 10);
}

function executable(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function ageHours(filePath, now) {
  try {
    return Math.max(0, (now.getTime() - fs.statSync(filePath).mtimeMs) / 3_600_000);
  } catch {
    return null;
  }
}

function activeCronIncludes(crontab, command) {
  return String(crontab).split('\n').some(line => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith('#') && trimmed.includes(command);
  });
}

function privateTreeHasSecureModes(target) {
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink()) return false;
  if (stat.isDirectory()) {
    if ((stat.mode & 0o777) !== 0o700) return false;
    return fs.readdirSync(target).every(entry => privateTreeHasSecureModes(path.join(target, entry)));
  }
  return stat.isFile() && (stat.mode & 0o777) === 0o600;
}

function inspectPrivateFile(filePath, label, inspect, failures) {
  let stat;
  try {
    stat = fs.lstatSync(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    failures.push(`${label} is missing`);
    return { inspection: inspect(''), mode: null };
  }
  if (stat.isSymbolicLink()) {
    failures.push(`${label} must not be a symlink`);
    return { inspection: inspect(''), mode: null };
  }
  if (!stat.isFile()) {
    failures.push(`${label} must be a regular file`);
    return { inspection: inspect(''), mode: null };
  }
  const mode = stat.mode & 0o777;
  if (mode !== 0o600) failures.push(`${label} mode must be 0600`);
  return { inspection: inspect(fs.readFileSync(filePath, 'utf8')), mode };
}

function inspectGscHealth({
  dataRoot = privateDataRoot(),
  now = new Date(),
  cronActive = false,
  crontab = '',
  dailyWrapper = DEFAULT_DAILY_WRAPPER,
  weeklyWrapper = DEFAULT_WEEKLY_WRAPPER,
  maxLogAgeHours = 26,
} = {}) {
  const failures = [];
  const ledgerPath = path.join(dataRoot, LEDGER_NAME);
  const logPath = path.join(dataRoot, 'cron.log');
  let rootMode = null;
  try {
    const rootStat = fs.lstatSync(dataRoot);
    rootMode = rootStat.mode & 0o777;
    if (rootStat.isSymbolicLink()) failures.push('private data root must not be a symlink');
    else if (!rootStat.isDirectory()) failures.push('private data root must be a directory');
    else {
      if (rootMode !== 0o700) failures.push('private data root mode must be 0700');
      try {
        assertNoSymlinks(dataRoot);
      } catch {
        failures.push('private data root contains a symlink');
      }
      if (!privateTreeHasSecureModes(dataRoot)) failures.push('private tree permissions must be owner-only (files 0600; directories 0700)');
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    failures.push('private data root is missing');
  }

  const ledgerState = inspectPrivateFile(ledgerPath, 'private ledger', inspectLedger, failures);
  const inspection = ledgerState.inspection;
  const ledgerMode = ledgerState.mode;
  const snapshots = {};
  for (const kind of SNAPSHOT_KINDS) {
    const snapshotPath = path.join(dataRoot, SNAPSHOT_DIR_NAME, `${kind}.jsonl`);
    const state = inspectPrivateFile(snapshotPath, `${kind} snapshot`, text => inspectSnapshots(text, kind), failures);
    snapshots[kind] = {
      ...state.inspection.summary,
      mode: state.mode === null ? null : state.mode.toString(8).padStart(3, '0'),
    };
    if (state.inspection.summary.quarantinedRows) failures.push(`${kind} snapshot has ${state.inspection.summary.quarantinedRows} quarantinable row(s)`);
    if (state.inspection.summary.duplicateRows) failures.push(`${kind} snapshot has ${state.inspection.summary.duplicateRows} duplicate fact(s)`);
  }
  const today = laYmd(now);
  const expectedFinalizedSourceDay = shiftYmd(today, -3);
  const latestFinalizedSourceDay = inspection.summary.latestFinalizedSourceDay;
  const logAgeHours = ageHours(logPath, now);
  let logMode = null;
  try {
    const logStat = fs.lstatSync(logPath);
    if (logStat.isSymbolicLink()) failures.push('cron log must not be a symlink');
    else if (!logStat.isFile()) failures.push('cron log must be a regular file');
    else {
      logMode = logStat.mode & 0o777;
      if (logMode !== 0o600) failures.push('cron log mode must be 0600');
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const dailyWrapperExecutable = executable(dailyWrapper);
  const weeklyWrapperExecutable = executable(weeklyWrapper);
  const dailyCronRegistered = activeCronIncludes(crontab, dailyWrapper);
  const weeklyCronRegistered = activeCronIncludes(crontab, weeklyWrapper);

  if (inspection.summary.quarantinedRows) failures.push(`ledger has ${inspection.summary.quarantinedRows} quarantinable row(s)`);
  if (inspection.summary.duplicateRows) failures.push(`ledger has ${inspection.summary.duplicateRows} duplicate daily fact(s)`);
  if (!latestFinalizedSourceDay || latestFinalizedSourceDay < expectedFinalizedSourceDay) failures.push('finalized source day is stale');
  if (!cronActive) failures.push('cron service is inactive');
  if (!dailyCronRegistered) failures.push('daily cron is not registered');
  if (!weeklyCronRegistered) failures.push('weekly cron is not registered');
  if (!dailyWrapperExecutable) failures.push('daily wrapper is missing or not executable');
  if (!weeklyWrapperExecutable) failures.push('weekly wrapper is missing or not executable');
  if (logAgeHours === null) failures.push('cron log is missing');
  else if (logAgeHours > maxLogAgeHours) failures.push('cron log is stale');

  return {
    ok: failures.length === 0,
    failures,
    checkedAt: now.toISOString(),
    dataRoot,
    rootMode: rootMode === null ? null : rootMode.toString(8).padStart(3, '0'),
    ledger: {
      totalRows: inspection.summary.totalRows,
      finalizedDailyRows: inspection.summary.acceptedRows,
      duplicateRows: inspection.summary.duplicateRows,
      quarantinableRows: inspection.summary.quarantinedRows,
      uniqueSourceDays: inspection.summary.uniqueSourceDays,
      earliestFinalizedSourceDay: inspection.summary.earliestFinalizedSourceDay,
      latestFinalizedSourceDay,
      expectedFinalizedSourceDay,
      mode: ledgerMode === null ? null : ledgerMode.toString(8).padStart(3, '0'),
    },
    snapshots,
    scheduler: {
      cronActive,
      dailyCronRegistered,
      weeklyCronRegistered,
      dailyWrapperExecutable,
      weeklyWrapperExecutable,
      logAgeHours: logAgeHours === null ? null : Number(logAgeHours.toFixed(1)),
      logMode: logMode === null ? null : logMode.toString(8).padStart(3, '0'),
    },
  };
}

function renderHealth(health) {
  const lines = [
    `GSC ledger health: ${health.ok ? 'PASS' : 'FAIL'}`,
    `Checked: ${health.checkedAt}`,
    `Finalized source coverage: ${health.ledger.earliestFinalizedSourceDay || 'none'} to ${health.ledger.latestFinalizedSourceDay || 'none'} (${health.ledger.uniqueSourceDays} day(s))`,
    `Expected latest finalized source day: ${health.ledger.expectedFinalizedSourceDay}`,
    `Ledger rows: ${health.ledger.finalizedDailyRows} finalized daily; ${health.ledger.duplicateRows} duplicate; ${health.ledger.quarantinableRows} quarantinable; mode ${health.ledger.mode || 'missing'}`,
    `Snapshot rows: query=${health.snapshots.query.acceptedRows} page=${health.snapshots.page.acceptedRows} query-by-page=${health.snapshots['query-by-page'].acceptedRows}`,
    `Scheduler: cron=${health.scheduler.cronActive ? 'active' : 'inactive'} daily=${health.scheduler.dailyCronRegistered ? 'registered' : 'missing'} weekly=${health.scheduler.weeklyCronRegistered ? 'registered' : 'missing'} log_age_hours=${health.scheduler.logAgeHours ?? 'missing'}`,
  ];
  for (const failure of health.failures) lines.push(`FAIL: ${failure}`);
  return `${lines.join('\n')}\n`;
}

function commandOutput(command, args) {
  try {
    return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

function runtimeHealth() {
  const cronState = commandOutput('systemctl', ['is-active', 'cron']).trim()
    || commandOutput('systemctl', ['is-active', 'crond']).trim();
  return inspectGscHealth({
    dataRoot: privateDataRoot(),
    cronActive: cronState === 'active',
    crontab: commandOutput('crontab', ['-l']),
  });
}

if (require.main === module) {
  const health = runtimeHealth();
  process.stdout.write(renderHealth(health));
  if (!health.ok) process.exitCode = 1;
}

module.exports = { activeCronIncludes, inspectGscHealth, laYmd, renderHealth, runtimeHealth, shiftYmd };
