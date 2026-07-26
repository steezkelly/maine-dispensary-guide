'use strict';

/**
 * mdg-ops-ledger.cjs — private, immutable, idempotent MDG operations event store.
 *
 * Authority doctrine (ADR 2026-07-25): Hermes Kanban is the sole live task
 * authority. This ledger is DERIVED, APPEND-ONLY, and NON-AUTHORITATIVE. It
 * never writes to Hermes, Git, the Hub, or any public report.
 *
 * Storage layout under the validated private root:
 *   <root>/INITIALIZED                         marker (exclusive first creation)
 *   <root>/events/<YYYY>/<MM>/<DD>/<seq>.json  one immutable event per file (0600)
 *   <root>/quarantine/<ts>-<rand>.json         rejected invalid events (private)
 *
 * Events are partitioned by observed_at UTC date ("UTC partitioning"). Each
 * stored record is a wrapper: {seq, event_id, event_sha256, appended_at, event}.
 *
 * Node built-ins only. No external dependency.
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const SCHEMA_ID = 'mdg-operations-event-v1';
const DIR_MODE = 0o700;
const FILE_MODE = 0o600;

// ---------------------------------------------------------------------------
// Root resolution and validation
// ---------------------------------------------------------------------------

function defaultRoot() {
  return path.join(os.homedir(), '.hermes', 'data', 'mdg-ops');
}

/**
 * Resolve and validate the operations root. Rejects:
 *  - a root inside the given repository (repo-local),
 *  - a symlink alias whose real path resolves into the repository.
 * Returns the resolved absolute root. Throws on violation (fail closed).
 */
function resolveRoot({ repoRoot, env } = {}) {
  const environment = env || process.env;
  const requested = environment.MDG_OPS_ROOT || defaultRoot();
  const resolved = path.resolve(requested);

  if (repoRoot) {
    const repoResolved = path.resolve(repoRoot);
    const rel = path.relative(repoResolved, resolved);
    const insideRepo = rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
    if (insideRepo) {
      throw new Error(`OPS_ROOT_INSIDE_REPO: operations root ${resolved} is inside repository ${repoResolved}`);
    }
    let realResolved;
    try {
      realResolved = fs.realpathSync(resolved);
    } catch {
      realResolved = realpathOfExistingAncestor(resolved);
    }
    const realRepo = fs.realpathSync(repoResolved);
    const realRel = path.relative(realRepo, realResolved);
    const realInside = realRel === '' || (!realRel.startsWith('..') && !path.isAbsolute(realRel));
    if (realInside) {
      throw new Error(`OPS_ROOT_SYMLINK_ESCAPE: operations root ${resolved} resolves into repository ${realRepo}`);
    }
  }

  return resolved;
}

function realpathOfExistingAncestor(p) {
  let current = p;
  while (current !== path.dirname(current)) {
    if (fs.existsSync(current)) {
      const real = fs.realpathSync(current);
      const tail = path.relative(current, p);
      return path.join(real, tail);
    }
    current = path.dirname(current);
  }
  return p;
}

// ---------------------------------------------------------------------------
// Minimal draft-07-subset validator (mirrors OPS-01; no dependency)
// ---------------------------------------------------------------------------

const DATE_TIME_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function resolveRef(root, ref) {
  if (!ref.startsWith('#/')) throw new Error(`only local $ref supported: ${ref}`);
  let node = root;
  for (const part of ref.slice(2).split('/')) {
    node = node[part];
    if (node === undefined) throw new Error(`unresolved $ref: ${ref}`);
  }
  return node;
}

function typeMatches(value, type) {
  const types = Array.isArray(type) ? type : [type];
  return types.some((t) => {
    switch (t) {
      case 'string': return typeof value === 'string';
      case 'number': return typeof value === 'number';
      case 'integer': return Number.isInteger(value);
      case 'boolean': return typeof value === 'boolean';
      case 'array': return Array.isArray(value);
      case 'object': return value !== null && typeof value === 'object' && !Array.isArray(value);
      case 'null': return value === null;
      default: return false;
    }
  });
}

function validate(value, schema, root, at = '$') {
  const errors = [];
  if (schema.$ref) return validate(value, resolveRef(root, schema.$ref), root, at);

  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${at}: expected const ${JSON.stringify(schema.const)}`);
  }
  if (schema.enum !== undefined && !schema.enum.some((e) => e === value)) {
    errors.push(`${at}: value not in enum`);
  }
  if (schema.type !== undefined && !typeMatches(value, schema.type)) {
    errors.push(`${at}: expected type ${JSON.stringify(schema.type)}`);
    return errors;
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${at}: shorter than minLength ${schema.minLength}`);
    }
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${at}: pattern mismatch ${schema.pattern}`);
    }
    if (schema.format === 'date-time' && !DATE_TIME_RE.test(value)) {
      errors.push(`${at}: invalid date-time`);
    }
  }
  if (Array.isArray(value) && schema.items) {
    value.forEach((item, i) => errors.push(...validate(item, schema.items, root, `${at}[${i}]`)));
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    if (Array.isArray(schema.required)) {
      for (const key of schema.required) {
        if (!(key in value)) errors.push(`${at}: missing required "${key}"`);
      }
    }
    const props = schema.properties || {};
    for (const [key, child] of Object.entries(value)) {
      if (key in props) errors.push(...validate(child, props[key], root, `${at}.${key}`));
      else if (schema.additionalProperties === false) errors.push(`${at}: unexpected property "${key}"`);
    }
  }
  if (Array.isArray(schema.allOf)) {
    for (const sub of schema.allOf) errors.push(...validate(value, sub, root, at));
  }
  if (schema.if) {
    if (validate(value, schema.if, root, at).length === 0 && schema.then) {
      errors.push(...validate(value, schema.then, root, at));
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Hashing and canonicalization
// ---------------------------------------------------------------------------

function canonicalize(value) {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = sortKeys(value[key]);
    return out;
  }
  return value;
}

function sha256OfString(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

function eventSha(event) {
  return sha256OfString(canonicalize(event));
}

// ---------------------------------------------------------------------------
// Filesystem helpers
// ---------------------------------------------------------------------------

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true, mode: DIR_MODE });
  fs.chmodSync(dir, DIR_MODE);
}

function atomicWriteJson(filePath, obj) {
  const dir = path.dirname(filePath);
  ensureDir(dir);
  const tmp = path.join(dir, `.tmp.${process.pid}.${crypto.randomBytes(6).toString('hex')}`);
  try {
    fs.writeFileSync(tmp, `${JSON.stringify(obj, null, 2)}\n`, { mode: FILE_MODE });
    fs.chmodSync(tmp, FILE_MODE);
    fs.renameSync(tmp, filePath);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch { /* tmp may not exist */ }
    throw err;
  }
}

function markerPath(root) {
  return path.join(root, 'INITIALIZED');
}

function eventsDir(root) {
  return path.join(root, 'events');
}

function quarantineDir(root) {
  return path.join(root, 'quarantine');
}

function utcParts(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error(`invalid datetime: ${iso}`);
  const yyyy = d.getUTCFullYear().toString().padStart(4, '0');
  const mm = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const dd = d.getUTCDate().toString().padStart(2, '0');
  return { yyyy, mm, dd };
}

// ---------------------------------------------------------------------------
// Ledger operations
// ---------------------------------------------------------------------------

function init(root, { force = false } = {}) {
  const marker = markerPath(root);
  if (fs.existsSync(marker) && !force) {
    throw new Error(`ALREADY_INITIALIZED: ${root} (use force to re-assert)`);
  }
  ensureDir(root);
  ensureDir(eventsDir(root));
  ensureDir(quarantineDir(root));
  const payload = { schema: SCHEMA_ID, created_at: new Date().toISOString(), root };
  const tmp = `${marker}.tmp.${process.pid}`;
  try {
    fs.writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`, { flag: 'wx', mode: FILE_MODE });
    fs.renameSync(tmp, marker);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
    if (err.code === 'EEXIST') throw new Error(`ALREADY_INITIALIZED: ${root}`);
    throw err;
  }
  fs.chmodSync(marker, FILE_MODE);
  return { ok: true, root, marker };
}

function assertInitialized(root) {
  if (!fs.existsSync(markerPath(root))) {
    throw new Error(`NOT_INITIALIZED: run init first (root ${root})`);
  }
}

function readAllEvents(root) {
  const base = eventsDir(root);
  if (!fs.existsSync(base)) return [];
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.json') && !entry.name.startsWith('.tmp.')) {
        const wrapper = JSON.parse(fs.readFileSync(full, 'utf8'));
        wrapper.__path = full;
        found.push(wrapper);
      }
    }
  };
  walk(base);
  found.sort((a, b) => a.seq - b.seq);
  return found;
}

function nextSeq(existing) {
  return existing.length ? existing[existing.length - 1].seq + 1 : 1;
}

/**
 * Append a validated event. Returns one of:
 *   { outcome: 'appended', seq }
 *   { outcome: 'duplicate-noop', seq }   (identical event_id + content)
 * Throws on conflict (same id, different content) or invalid event.
 */
function appendEvent(root, event, { schema } = {}) {
  assertInitialized(root);

  if (schema) {
    const errors = validate(event, schema, schema);
    if (errors.length) {
      quarantine(root, event, errors);
      throw new Error(`INVALID_EVENT: ${errors.join('; ')}`);
    }
  }
  if (event.schema !== SCHEMA_ID) {
    quarantine(root, event, [`unsupported schema ${event.schema}`]);
    throw new Error(`UNSUPPORTED_SCHEMA: ${event.schema}`);
  }
  if (typeof event.event_id !== 'string' || !event.event_id.length) {
    throw new Error('INVALID_EVENT: missing event_id');
  }

  const sha = eventSha(event);
  const existing = readAllEvents(root);
  const prior = existing.find((w) => w.event_id === event.event_id);

  if (prior) {
    if (prior.event_sha256 === sha) {
      return { outcome: 'duplicate-noop', seq: prior.seq };
    }
    throw new Error(`CONFLICTING_EVENT_ID: ${event.event_id} already stored with different content`);
  }

  const seq = nextSeq(existing);
  const { yyyy, mm, dd } = utcParts(event.observed_at);
  const dir = path.join(eventsDir(root), yyyy, mm, dd);
  const file = path.join(dir, `${seq.toString().padStart(10, '0')}.json`);
  const wrapper = {
    seq,
    event_id: event.event_id,
    event_sha256: sha,
    appended_at: new Date().toISOString(),
    observed_at: event.observed_at,
    event,
  };
  atomicWriteJson(file, wrapper);
  return { outcome: 'appended', seq };
}

function quarantine(root, event, errors) {
  try {
    ensureDir(quarantineDir(root));
    const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.json`;
    atomicWriteJson(path.join(quarantineDir(root), name), {
      quarantined_at: new Date().toISOString(),
      errors,
      event,
    });
  } catch {
    // Quarantine is best-effort; never let it mask the primary error.
  }
}

function check(root, { schema } = {}) {
  const problems = [];
  assertInitialized(root);

  const rootStat = fs.statSync(root);
  if ((rootStat.mode & 0o777) !== DIR_MODE) {
    problems.push(`ROOT_PERMS: expected 0700, got 0${(rootStat.mode & 0o777).toString(8)}`);
  }

  const events = readAllEvents(root);
  const seenIds = new Map();
  let lastObserved = null;

  for (const w of events) {
    const stat = fs.statSync(w.__path);
    if ((stat.mode & 0o777) !== FILE_MODE) {
      problems.push(`FILE_PERMS: ${path.basename(w.__path)} expected 0600, got 0${(stat.mode & 0o777).toString(8)}`);
    }
    if (seenIds.has(w.event_id)) {
      problems.push(`DUPLICATE_ID: ${w.event_id} at seq ${seenIds.get(w.event_id)} and ${w.seq}`);
    }
    seenIds.set(w.event_id, w.seq);

    if (w.event_sha256 !== eventSha(w.event)) {
      problems.push(`HASH_MISMATCH: seq ${w.seq} (${w.event_id})`);
    }
    if (schema) {
      const errors = validate(w.event, schema, schema);
      if (errors.length) problems.push(`SCHEMA_INVALID: seq ${w.seq}: ${errors.join('; ')}`);
    }
    const observed = Date.parse(w.observed_at);
    if (lastObserved !== null && observed < lastObserved) {
      problems.push(`CHRONOLOGY: seq ${w.seq} observed_at precedes an earlier append`);
    }
    lastObserved = observed;
  }

  return { ok: problems.length === 0, problems, eventCount: events.length };
}

function health(root) {
  assertInitialized(root);
  const events = readAllEvents(root);
  const observedTimes = events.map((w) => Date.parse(w.observed_at)).filter((n) => !Number.isNaN(n));
  const schemas = Array.from(new Set(events.map((w) => w.event && w.event.schema))).sort();
  const eventTypes = {};
  for (const w of events) {
    const t = (w.event && w.event.event_type) || 'unknown';
    eventTypes[t] = (eventTypes[t] || 0) + 1;
  }
  let quarantineCount = 0;
  if (fs.existsSync(quarantineDir(root))) {
    quarantineCount = fs.readdirSync(quarantineDir(root)).filter((f) => f.endsWith('.json')).length;
  }
  return {
    status: 'ok',
    root,
    eventCount: events.length,
    quarantineCount,
    firstObservedAt: observedTimes.length ? new Date(Math.min(...observedTimes)).toISOString() : null,
    lastObservedAt: observedTimes.length ? new Date(Math.max(...observedTimes)).toISOString() : null,
    schemas,
    eventTypeCounts: eventTypes,
    // NOTE: no event bodies, prompts, or private record content are emitted.
  };
}

function list(root, { from, to } = {}) {
  assertInitialized(root);
  const fromMs = from ? Date.parse(from) : -Infinity;
  const toMs = to ? Date.parse(to) : Infinity;
  return readAllEvents(root)
    .filter((w) => {
      const t = Date.parse(w.observed_at);
      return t >= fromMs && t <= toMs;
    })
    .map((w) => ({
      seq: w.seq,
      event_id: w.event_id,
      observed_at: w.observed_at,
      appended_at: w.appended_at,
      event_sha256: w.event_sha256,
      event: w.event,
    }));
}

/**
 * Return the COMPLETE validated event history (no observed_at filtering),
 * optionally bounded by an observation-collection window on observed_at.
 *
 * OPS-06A-R2 finding A: calculations that require task lifecycle history
 * (instrumentation state, trustworthy ready-entry time, opening WIP, carry-in
 * tasks, historical-import events whose occurred_at and observed_at differ)
 * MUST use the full history, not an observed_at-filtered subset. The caller
 * applies the operational occurrence window (on occurred_at) itself; this
 * function never silently discards pre-window lifecycle history.
 *
 * `observedFrom`/`observedTo` (optional) bound the COLLECTION window on
 * observed_at only — used to reason about observation coverage, never to
 * truncate lifecycle history for occurrence metrics.
 */
function listAll(root, { observedFrom, observedTo } = {}) {
  assertInitialized(root);
  const fromMs = observedFrom ? Date.parse(observedFrom) : -Infinity;
  const toMs = observedTo ? Date.parse(observedTo) : Infinity;
  return readAllEvents(root)
    .filter((w) => {
      const t = Date.parse(w.observed_at);
      return t >= fromMs && t <= toMs;
    })
    .map((w) => ({
      seq: w.seq,
      event_id: w.event_id,
      observed_at: w.observed_at,
      appended_at: w.appended_at,
      event_sha256: w.event_sha256,
      event: w.event,
    }));
}

module.exports = {
  SCHEMA_ID,
  defaultRoot,
  resolveRoot,
  validate,
  eventSha,
  init,
  appendEvent,
  check,
  health,
  list,
  listAll,
  _internal: { atomicWriteJson, readAllEvents, utcParts, canonicalize },
};
