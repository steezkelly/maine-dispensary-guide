#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { privateDataRoot, privateOutputPath } = require('./gsc-private-data-root.cjs');

const LEDGER_NAME = 'gsc-search-analytics.jsonl';
const SNAPSHOT_DIR_NAME = 'gsc-search-analytics-snapshots';
const SNAPSHOT_KINDS = ['query', 'page', 'query-by-page'];
const SNAPSHOT_DIMENSIONS = {
  query: ['query'],
  page: ['page'],
  'query-by-page': ['query', 'page'],
};
const SOURCE_TIMEZONE = 'America/Los_Angeles';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isFiniteNonNegative(value) {
  return Number.isFinite(value) && value >= 0;
}

function isValidDate(value) {
  if (!DATE_RE.test(value || '')) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function dailyRecordReason(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return 'invalid_shape';
  if (!isValidDate(record.snapshotDate)) return 'invalid_snapshot_date';
  if (!isValidDate(record.sourceStartDate) || !isValidDate(record.sourceEndDate)) return 'missing_source_provenance';
  if (record.sourceStartDate !== record.sourceEndDate) return 'non_daily_source_window';
  if (record.sourceTimezone !== SOURCE_TIMEZONE || record.sourceDataState !== 'final') return 'non_final_source_data';
  if (typeof record.query !== 'string' || !record.query.trim()) return 'invalid_query';
  if (typeof record.page !== 'string' || !record.page.trim()) return 'invalid_page';
  if (!isFiniteNonNegative(record.clicks) || !isFiniteNonNegative(record.impressions)) return 'invalid_counts';
  if (!Number.isFinite(record.ctr) || record.ctr < 0 || record.ctr > 1) return 'invalid_ctr';
  if (!isFiniteNonNegative(record.position)) return 'invalid_position';
  return null;
}

function dailyKey(record) {
  return JSON.stringify([record.sourceEndDate, record.query, record.page]);
}

function inspectLedger(text) {
  const recordsByKey = new Map();
  const rawByKey = new Map();
  const rejected = [];
  let duplicateRows = 0;
  const lines = String(text || '').split('\n').filter(line => line.trim());

  for (const [index, raw] of lines.entries()) {
    let record;
    try {
      record = JSON.parse(raw);
    } catch {
      rejected.push({ line: index + 1, reason: 'invalid_json', raw });
      continue;
    }
    const reason = dailyRecordReason(record);
    if (reason) {
      rejected.push({ line: index + 1, reason, raw });
      continue;
    }
    const key = dailyKey(record);
    if (recordsByKey.has(key)) duplicateRows += 1;
    recordsByKey.set(key, record);
    rawByKey.set(key, raw);
  }

  const records = Array.from(recordsByKey.values()).sort((a, b) =>
    a.sourceEndDate.localeCompare(b.sourceEndDate)
      || a.query.localeCompare(b.query)
      || a.page.localeCompare(b.page));
  const sourceDays = new Set(records.map(record => record.sourceEndDate));
  return {
    records,
    rejected,
    summary: {
      totalRows: lines.length,
      acceptedRows: records.length,
      duplicateRows,
      quarantinedRows: rejected.length,
      uniqueSourceDays: sourceDays.size,
      earliestFinalizedSourceDay: records[0]?.sourceEndDate || null,
      latestFinalizedSourceDay: records.at(-1)?.sourceEndDate || null,
    },
  };
}

function snapshotReason(snapshot, expectedKind) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return 'invalid_shape';
  if (snapshot.snapshotKind !== expectedKind) return 'unexpected_snapshot_kind';
  if (!SNAPSHOT_KINDS.includes(expectedKind)) return 'unexpected_snapshot_kind';
  if (!isValidDate(snapshot.snapshotDate)) return 'invalid_snapshot_date';
  const window = snapshot.sourceWindow;
  if (!window || !isValidDate(window.sourceStartDate) || !isValidDate(window.sourceEndDate)) return 'missing_source_provenance';
  if (window.sourceStartDate !== window.sourceEndDate) return 'non_daily_source_window';
  if (window.sourceTimezone !== SOURCE_TIMEZONE || window.sourceDataState !== 'final') return 'non_final_source_data';
  if (!Array.isArray(snapshot.rows)) return 'invalid_rows';
  if (!Array.isArray(snapshot.dimensions)) return 'invalid_dimensions';
  if (snapshot.dimensions.length !== SNAPSHOT_DIMENSIONS[expectedKind].length
    || snapshot.dimensions.some((dimension, index) => dimension !== SNAPSHOT_DIMENSIONS[expectedKind][index])) {
    return 'unexpected_dimensions';
  }
  if (snapshot.rows.some(row => !row
    || !Array.isArray(row.keys)
    || row.keys.length !== snapshot.dimensions.length
    || row.keys.some(key => typeof key !== 'string' || !key.trim())
    || !isFiniteNonNegative(row.clicks)
    || !isFiniteNonNegative(row.impressions)
    || !Number.isFinite(row.ctr) || row.ctr < 0 || row.ctr > 1
    || !isFiniteNonNegative(row.position))) return 'invalid_rows';
  return null;
}

function snapshotKey(snapshot) {
  const window = snapshot.sourceWindow;
  return JSON.stringify([
    snapshot.snapshotKind,
    window.sourceStartDate,
    window.sourceEndDate,
    snapshot.searchType || null,
    snapshot.filters || null,
  ]);
}

function inspectSnapshots(text, expectedKind) {
  const snapshotsByKey = new Map();
  const rejected = [];
  let duplicateRows = 0;
  const lines = String(text || '').split('\n').filter(line => line.trim());

  for (const [index, raw] of lines.entries()) {
    let snapshot;
    try {
      snapshot = JSON.parse(raw);
    } catch {
      rejected.push({ line: index + 1, reason: 'invalid_json', raw });
      continue;
    }
    const reason = snapshotReason(snapshot, expectedKind);
    if (reason) {
      rejected.push({ line: index + 1, reason, raw });
      continue;
    }
    const key = snapshotKey(snapshot);
    if (snapshotsByKey.has(key)) duplicateRows += 1;
    snapshotsByKey.set(key, snapshot);
  }

  const snapshots = Array.from(snapshotsByKey.values()).sort((a, b) =>
    a.sourceWindow.sourceEndDate.localeCompare(b.sourceWindow.sourceEndDate));
  return {
    snapshots,
    rejected,
    summary: {
      totalRows: lines.length,
      acceptedRows: snapshots.length,
      duplicateRows,
      quarantinedRows: rejected.length,
    },
  };
}

function atomicWriteJsonl(filePath, records) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  const tmp = `${filePath}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  const body = records.length ? `${records.map(record => JSON.stringify(record)).join('\n')}\n` : '';
  fs.writeFileSync(tmp, body, { mode: 0o600 });
  fs.chmodSync(tmp, 0o600);
  fs.renameSync(tmp, filePath);
  fs.chmodSync(filePath, 0o600);
}

function timestampNow() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function filesToProtect(root) {
  const files = [path.join(root, LEDGER_NAME)];
  for (const kind of SNAPSHOT_KINDS) files.push(path.join(root, SNAPSHOT_DIR_NAME, `${kind}.jsonl`));
  return files.filter(file => fs.existsSync(file));
}

function backupPrivateState(root = privateDataRoot(), timestamp = timestampNow()) {
  const backupDir = path.join(root, 'backups', `pre-normalize-${timestamp}`);
  if (fs.existsSync(backupDir)) throw new Error(`Backup already exists: ${backupDir}`);
  fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });
  const manifest = [];
  for (const source of filesToProtect(root)) {
    const relative = path.relative(root, source);
    const target = path.join(backupDir, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
    fs.writeFileSync(target, '', { flag: 'wx', mode: 0o600 });
    try {
      fs.copyFileSync(source, target);
    } catch (error) {
      fs.rmSync(target, { force: true });
      throw error;
    }
    fs.chmodSync(target, 0o600);
    const digest = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
    manifest.push(`${digest}  ${relative}`);
  }
  fs.writeFileSync(path.join(backupDir, 'SHA256SUMS'), manifest.sort().join('\n') + (manifest.length ? '\n' : ''), { mode: 0o600 });
  return backupDir;
}

function writeQuarantine(root, timestamp, entries) {
  if (!entries.length) return null;
  const quarantineDir = path.join(root, 'quarantine');
  fs.mkdirSync(quarantineDir, { recursive: true, mode: 0o700 });
  const quarantinePath = path.join(quarantineDir, `gsc-private-rows-${timestamp}.jsonl`);
  const lines = entries.map(entry => JSON.stringify(entry));
  fs.writeFileSync(quarantinePath, `${lines.join('\n')}\n`, { mode: 0o600 });
  fs.chmodSync(quarantinePath, 0o600);
  return quarantinePath;
}

function securePrivateTree(target) {
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink()) throw new Error(`Symlinks are not allowed in private GSC storage: ${target}`);
  if (stat.isDirectory()) {
    fs.chmodSync(target, 0o700);
    for (const entry of fs.readdirSync(target)) securePrivateTree(path.join(target, entry));
    return;
  }
  if (stat.isFile()) fs.chmodSync(target, 0o600);
}

function assertNoSymlinks(target) {
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink()) throw new Error(`Symlinks are not allowed in private GSC storage: ${target}`);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(target)) assertNoSymlinks(path.join(target, entry));
  }
}

function normalizePrivateState(root = privateDataRoot(), { timestamp = timestampNow() } = {}) {
  root = privateDataRoot(root);
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  assertNoSymlinks(root);
  privateOutputPath(path.join(root, LEDGER_NAME), root);
  for (const kind of SNAPSHOT_KINDS) privateOutputPath(path.join(root, SNAPSHOT_DIR_NAME, `${kind}.jsonl`), root);
  const backupDir = backupPrivateState(root, timestamp);
  const quarantine = [];
  const ledgerPath = path.join(root, LEDGER_NAME);
  const ledgerInspection = inspectLedger(fs.existsSync(ledgerPath) ? fs.readFileSync(ledgerPath, 'utf8') : '');
  quarantine.push(...ledgerInspection.rejected.map(entry => ({ source: LEDGER_NAME, reason: entry.reason, raw: entry.raw })));
  atomicWriteJsonl(ledgerPath, ledgerInspection.records);

  const snapshots = {};
  for (const kind of SNAPSHOT_KINDS) {
    const relative = path.join(SNAPSHOT_DIR_NAME, `${kind}.jsonl`);
    const snapshotPath = path.join(root, relative);
    const inspection = inspectSnapshots(fs.existsSync(snapshotPath) ? fs.readFileSync(snapshotPath, 'utf8') : '', kind);
    quarantine.push(...inspection.rejected.map(entry => ({ source: relative, reason: entry.reason, raw: entry.raw })));
    atomicWriteJsonl(snapshotPath, inspection.snapshots);
    snapshots[kind] = inspection.summary;
  }

  const quarantinePath = writeQuarantine(root, timestamp, quarantine);
  securePrivateTree(root);
  return { backupDir, quarantinePath, ledger: ledgerInspection.summary, snapshots };
}

function prepareDailyUpsert(ledgerPath, newRecords, root) {
  ledgerPath = privateOutputPath(ledgerPath, root);
  const existingText = fs.existsSync(ledgerPath) ? fs.readFileSync(ledgerPath, 'utf8') : '';
  const existing = inspectLedger(existingText);
  if (existing.summary.quarantinedRows || existing.summary.duplicateRows) {
    throw new Error('Private GSC ledger is dirty; run gsc-ledger.cjs --normalize before collection.');
  }

  const incoming = inspectLedger(newRecords.map(record => JSON.stringify(record)).join('\n'));
  if (incoming.summary.quarantinedRows || incoming.summary.duplicateRows || incoming.summary.acceptedRows !== newRecords.length) {
    throw new Error('Collector produced invalid or duplicate daily GSC records; refusing to write.');
  }

  const records = new Map(existing.records.map(record => [dailyKey(record), record]));
  let replacedRows = 0;
  for (const record of incoming.records) {
    const key = dailyKey(record);
    if (records.has(key)) replacedRows += 1;
    records.set(key, record);
  }
  const normalized = Array.from(records.values()).sort((a, b) =>
    a.sourceEndDate.localeCompare(b.sourceEndDate)
      || a.query.localeCompare(b.query)
      || a.page.localeCompare(b.page));
  return {
    path: ledgerPath,
    records: normalized,
    summary: { totalRows: normalized.length, insertedRows: incoming.records.length - replacedRows, replacedRows },
  };
}

function upsertDailyRecords(ledgerPath, newRecords, { root = privateDataRoot() } = {}) {
  const prepared = prepareDailyUpsert(ledgerPath, newRecords, root);
  atomicWriteJsonl(prepared.path, prepared.records);
  return prepared.summary;
}

function prepareSnapshotUpsert(snapshotPath, snapshot, root) {
  snapshotPath = privateOutputPath(snapshotPath, root);
  const kind = snapshot.snapshotKind;
  const existing = inspectSnapshots(fs.existsSync(snapshotPath) ? fs.readFileSync(snapshotPath, 'utf8') : '', kind);
  if (existing.summary.quarantinedRows || existing.summary.duplicateRows) {
    throw new Error(`Private GSC ${kind} snapshots are dirty; run gsc-ledger.cjs --normalize before collection.`);
  }
  const incomingReason = snapshotReason(snapshot, kind);
  if (incomingReason) throw new Error(`Collector produced an invalid ${kind} snapshot (${incomingReason}); refusing to write.`);
  const snapshots = new Map(existing.snapshots.map(item => [snapshotKey(item), item]));
  const key = snapshotKey(snapshot);
  const replaced = snapshots.has(key);
  snapshots.set(key, snapshot);
  return {
    path: snapshotPath,
    records: Array.from(snapshots.values()).sort((a, b) =>
      a.sourceWindow.sourceEndDate.localeCompare(b.sourceWindow.sourceEndDate)),
    summary: { totalRows: snapshots.size, replaced },
  };
}

function upsertAggregateSnapshot(snapshotPath, snapshot, { root = privateDataRoot() } = {}) {
  const prepared = prepareSnapshotUpsert(snapshotPath, snapshot, root);
  atomicWriteJsonl(prepared.path, prepared.records);
  return prepared.summary;
}

function storePrivateCollection({ ledgerPath, records, snapshotDir, snapshots, root = privateDataRoot() }) {
  root = privateDataRoot(root);
  if (fs.existsSync(root)) assertNoSymlinks(root);
  const incomingKinds = snapshots.map(snapshot => snapshot.snapshotKind).sort();
  const expectedKinds = [...SNAPSHOT_KINDS].sort();
  if (JSON.stringify(incomingKinds) !== JSON.stringify(expectedKinds)) {
    throw new Error(`Collector must provide exactly one snapshot for each kind: ${SNAPSHOT_KINDS.join(', ')}.`);
  }

  const preparedLedger = prepareDailyUpsert(ledgerPath, records, root);
  const preparedSnapshots = snapshots.map(snapshot => prepareSnapshotUpsert(
    path.join(snapshotDir, `${snapshot.snapshotKind}.jsonl`),
    snapshot,
    root,
  ));

  atomicWriteJsonl(preparedLedger.path, preparedLedger.records);
  for (const prepared of preparedSnapshots) atomicWriteJsonl(prepared.path, prepared.records);
  return {
    ledger: preparedLedger.summary,
    snapshots: preparedSnapshots.map(prepared => prepared.summary),
  };
}

function safeSummary(result) {
  return JSON.stringify(result, null, 2);
}

function main() {
  const args = new Set(process.argv.slice(2));
  const root = privateDataRoot();
  if (args.has('--normalize')) {
    console.log(safeSummary(normalizePrivateState(root)));
    return;
  }
  const ledgerPath = path.join(root, LEDGER_NAME);
  const inspection = inspectLedger(fs.existsSync(ledgerPath) ? fs.readFileSync(ledgerPath, 'utf8') : '');
  console.log(safeSummary(inspection.summary));
  if (inspection.summary.quarantinedRows || inspection.summary.duplicateRows) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = {
  LEDGER_NAME,
  SNAPSHOT_DIR_NAME,
  SNAPSHOT_KINDS,
  SOURCE_TIMEZONE,
  atomicWriteJsonl,
  assertNoSymlinks,
  backupPrivateState,
  dailyRecordReason,
  inspectLedger,
  inspectSnapshots,
  normalizePrivateState,
  snapshotReason,
  storePrivateCollection,
  securePrivateTree,
  upsertAggregateSnapshot,
  upsertDailyRecords,
};
