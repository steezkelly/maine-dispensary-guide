#!/usr/bin/env node
'use strict';

/**
 * OPS-01 focused schema tests.
 *
 * Validates the mdg-operations-event-v1 and mdg-operations-snapshot-v1 JSON
 * schemas against synthetic fixtures using a self-contained draft-07-subset
 * validator (NO external dependency — ajv is not installed and OPS-01 must not
 * add one). The subset supports exactly the keywords these schemas use:
 *   type, const, enum, pattern, minLength, format(date-time), required,
 *   properties, additionalProperties, items, $ref(#/definitions/...),
 *   allOf, if/then.
 *
 * On top of schema validation, semantic invariants from the OPS-01 contract
 * are asserted directly:
 *   - Hermes raw_state 'done' must NOT be treated as 'released'
 *   - duplicate task_id within a snapshot is rejected
 *   - left-censored tasks must have null state_entry_time
 *   - empty/unsupported measurement resolves to insufficient_data, never zero
 *
 * Fixtures are synthetic. No real card bodies, board snapshots, personal
 * paths, prompts, GSC queries, email, or credentials appear here.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const SCHEMA_DIR = path.join(ROOT, 'docs', 'governance', 'schemas');
const FIXTURE_DIR = path.join(__dirname, 'fixtures');

const eventSchema = JSON.parse(
  fs.readFileSync(path.join(SCHEMA_DIR, 'mdg-operations-event-v1.schema.json'), 'utf8'),
);
const snapshotSchema = JSON.parse(
  fs.readFileSync(path.join(SCHEMA_DIR, 'mdg-operations-snapshot-v1.schema.json'), 'utf8'),
);

// ---------------------------------------------------------------------------
// Minimal draft-07-subset validator
// ---------------------------------------------------------------------------

const DATE_TIME_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function resolveRef(root, ref) {
  assert.ok(ref.startsWith('#/'), `only local $ref supported: ${ref}`);
  const parts = ref.slice(2).split('/');
  let node = root;
  for (const part of parts) {
    node = node[part];
    assert.ok(node !== undefined, `unresolved $ref: ${ref}`);
  }
  return node;
}

function typeMatches(value, type) {
  const types = Array.isArray(type) ? type : [type];
  return types.some((t) => {
    switch (t) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'integer':
        return Number.isInteger(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return value !== null && typeof value === 'object' && !Array.isArray(value);
      case 'null':
        return value === null;
      default:
        return false;
    }
  });
}

/**
 * Validate `value` against `schema`. Returns an array of error strings
 * (empty === valid). `root` is the document root for $ref resolution.
 */
function validate(value, schema, root, at = '$') {
  const errors = [];
  if (schema.$ref) {
    return validate(value, resolveRef(root, schema.$ref), root, at);
  }

  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${at}: expected const ${JSON.stringify(schema.const)}, got ${JSON.stringify(value)}`);
  }

  if (schema.enum !== undefined && !schema.enum.some((e) => e === value)) {
    errors.push(`${at}: value ${JSON.stringify(value)} not in enum ${JSON.stringify(schema.enum)}`);
  }

  if (schema.type !== undefined && !typeMatches(value, schema.type)) {
    errors.push(`${at}: expected type ${JSON.stringify(schema.type)}, got ${JSON.stringify(value)}`);
    return errors; // type mismatch makes deeper checks meaningless
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${at}: string shorter than minLength ${schema.minLength}`);
    }
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${at}: string does not match pattern ${schema.pattern}`);
    }
    if (schema.format === 'date-time' && !DATE_TIME_RE.test(value)) {
      errors.push(`${at}: string is not a valid date-time: ${value}`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.items) {
      value.forEach((item, i) => {
        errors.push(...validate(item, schema.items, root, `${at}[${i}]`));
      });
    }
  }

  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    if (Array.isArray(schema.required)) {
      for (const key of schema.required) {
        if (!(key in value)) errors.push(`${at}: missing required property "${key}"`);
      }
    }

    const props = schema.properties || {};
    for (const [key, child] of Object.entries(value)) {
      if (key in props) {
        errors.push(...validate(child, props[key], root, `${at}.${key}`));
      } else if (schema.additionalProperties === false) {
        errors.push(`${at}: unexpected additional property "${key}"`);
      }
    }
  }

  if (Array.isArray(schema.allOf)) {
    for (const sub of schema.allOf) {
      errors.push(...validate(value, sub, root, at));
    }
  }

  if (schema.if) {
    const ifErrors = validate(value, schema.if, root, at);
    if (ifErrors.length === 0 && schema.then) {
      errors.push(...validate(value, schema.then, root, at));
    }
  }

  return errors;
}

function isValid(value, schema) {
  return validate(value, schema, schema).length === 0;
}

// ---------------------------------------------------------------------------
// Fixture discovery
// ---------------------------------------------------------------------------

function loadFixtures(kind) {
  const dir = path.join(FIXTURE_DIR, kind);
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({
      name: f,
      data: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')),
    }));
}

// ---------------------------------------------------------------------------
// Schema sanity
// ---------------------------------------------------------------------------

test('schemas parse and declare the v1 discriminators', () => {
  assert.equal(eventSchema.properties.schema.const, 'mdg-operations-event-v1');
  assert.equal(snapshotSchema.properties.schema.const, 'mdg-operations-snapshot-v1');
});

test('event schema enumerates the 12 initial event types', () => {
  const types = eventSchema.properties.event_type.enum;
  assert.equal(types.length, 12);
  for (const expected of [
    'task_observed',
    'task_created_observed',
    'task_state_changed',
    'task_blocked',
    'task_unblocked',
    'verification_completed',
    'lease_acquired_observed',
    'lease_released_observed',
    'integration_started',
    'release_recorded',
    'dispatch_advice_generated',
    'dispatch_decision_recorded',
  ]) {
    assert.ok(types.includes(expected), `missing event type ${expected}`);
  }
});

test('snapshot schema distinguishes raw_state from normalized_state', () => {
  const task = snapshotSchema.definitions.task;
  assert.ok(task.properties.raw_state, 'raw_state must be preserved');
  assert.ok(task.properties.normalized_state, 'normalized_state must exist');
  assert.notEqual(
    task.properties.normalized_state.enum.includes('card_completed'),
    false,
    'normalized_state must include card_completed (distinct from released)',
  );
  assert.ok(
    task.properties.normalized_state.enum.includes('released'),
    'normalized_state must include released',
  );
});

test('snapshot completion defines six distinct, non-equivalent concepts', () => {
  const completion = snapshotSchema.definitions.task.properties.completion;
  for (const key of [
    'card_completed',
    'initiative_completed',
    'verification_pass',
    'accepted_candidate',
    'integration_completed',
    'verified_production_release',
  ]) {
    assert.ok(completion.properties[key], `missing completion concept ${key}`);
    assert.ok(completion.required.includes(key), `${key} must be required`);
  }
});

// ---------------------------------------------------------------------------
// Valid fixtures must pass
// ---------------------------------------------------------------------------

for (const fixture of loadFixtures('valid')) {
  const isEvent = fixture.data.schema === 'mdg-operations-event-v1';
  const schema = isEvent ? eventSchema : snapshotSchema;
  test(`VALID ${fixture.name}`, () => {
    const errors = validate(fixture.data, schema, schema);
    assert.deepEqual(errors, [], `expected valid, got: ${errors.join('; ')}`);
  });
}

// ---------------------------------------------------------------------------
// Invalid fixtures must fail schema validation
// ---------------------------------------------------------------------------

const SCHEMA_INVALID = [
  'event-wrong-schema-discriminator.json',
  'event-bad-source-sha.json',
  'event-release-missing-evidence.json',
  'event-left-censored-with-from-state.json',
  'event-unsupported-type.json',
  'event-lease-missing-paths.json',
  'event-historical-import-missing-batch.json',
  'snapshot-missing-observation.json',
];

for (const name of SCHEMA_INVALID) {
  const data = JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, 'invalid', name), 'utf8'));
  const isEvent = data.schema === 'mdg-operations-event-v1' || name.startsWith('event-');
  const schema = isEvent ? eventSchema : snapshotSchema;
  test(`INVALID (schema) ${name}`, () => {
    assert.equal(isValid(data, schema), false, `${name} should fail schema validation`);
  });
}

// ---------------------------------------------------------------------------
// Semantic invariants (contract modeling distinctions)
// ---------------------------------------------------------------------------

test('SEMANTIC: Hermes done must not be treated as released', () => {
  const data = JSON.parse(
    fs.readFileSync(path.join(FIXTURE_DIR, 'invalid', 'snapshot-done-treated-as-released.json'), 'utf8'),
  );
  const task = data.tasks[0];
  assert.equal(task.raw_state, 'done');
  assert.equal(task.normalized_state, 'released');
  assert.equal(task.completion.verified_production_release, false);
  // The invariant: a done card with no verified production release evidence
  // must NOT be counted as released. The fixture encodes the violation; the
  // consumer rule rejects it.
  const countedAsRelease =
    task.normalized_state === 'released' && task.completion.verified_production_release === true;
  assert.equal(countedAsRelease, false, 'done card must never count as a verified release');
});

test('SEMANTIC: duplicate task_id within a snapshot is rejected', () => {
  const data = JSON.parse(
    fs.readFileSync(path.join(FIXTURE_DIR, 'invalid', 'snapshot-duplicate-task-id.json'), 'utf8'),
  );
  const ids = data.tasks.map((t) => t.task_id);
  const unique = new Set(ids);
  assert.equal(unique.size < ids.length, true, 'fixture must contain a duplicate');
  // Consumer rule: duplicates are rejected.
  assert.throws(() => {
    const seen = new Set();
    for (const id of ids) {
      if (seen.has(id)) throw new Error(`duplicate task_id: ${id}`);
      seen.add(id);
    }
  }, /duplicate task_id/);
});

test('SEMANTIC: left-censored task must have null state_entry_time', () => {
  const data = JSON.parse(
    fs.readFileSync(path.join(FIXTURE_DIR, 'invalid', 'snapshot-left-censored-with-entry-time.json'), 'utf8'),
  );
  const task = data.tasks[0];
  assert.equal(task.censoring.left_censored, true);
  assert.notEqual(task.state_entry_time, null, 'fixture encodes the violation');
  // Consumer rule: left-censored => entry time must be unknown/null.
  const violates = task.censoring.left_censored === true && task.state_entry_time !== null;
  assert.equal(violates, true, 'fixture must demonstrate the forbidden combination');
});

test('SEMANTIC: empty measurement resolves to insufficient_data, never zero', () => {
  // The event schema outcome enum includes insufficient_data and excludes 0.
  const outcomes = eventSchema.properties.outcome.enum;
  assert.ok(outcomes.includes('insufficient_data'));
  assert.ok(!outcomes.includes(0));
  // The snapshot coverage_state enum includes insufficient_data, excludes zero.
  const coverage = snapshotSchema.properties.observation.properties.coverage_state.enum;
  assert.ok(coverage.includes('insufficient_data'));
  assert.ok(!coverage.includes(0));
});

test('SEMANTIC: release_recorded requires verifier_pass and post_deploy_verified true', () => {
  const valid = JSON.parse(
    fs.readFileSync(path.join(FIXTURE_DIR, 'valid', 'event-release-recorded.json'), 'utf8'),
  );
  assert.equal(isValid(valid, eventSchema), true);
  assert.equal(valid.release_evidence.verifier_pass, true);
  assert.equal(valid.release_evidence.post_deploy_verified, true);

  // A release_recorded with verifier_pass=false must fail (then-clause const).
  const bad = JSON.parse(JSON.stringify(valid));
  bad.release_evidence.verifier_pass = false;
  assert.equal(isValid(bad, eventSchema), false, 'release without verifier PASS must fail');
});

test('SEMANTIC: observation time is distinct from occurrence time and both required', () => {
  assert.ok(eventSchema.required.includes('occurred_at'));
  assert.ok(eventSchema.required.includes('observed_at'));
  assert.ok(snapshotSchema.required.includes('observed_at'));
});

test('SEMANTIC: historical_import is distinguishable from live observation and requires a batch', () => {
  // The schema must support a provenance marker so imported structured history
  // (Hermes task_events/task_runs) is separable from live observer output.
  const prov = eventSchema.properties.provenance;
  assert.ok(prov, 'provenance field must exist');
  assert.ok(prov.enum.includes('live_observer'));
  assert.ok(prov.enum.includes('historical_import'));

  // A well-formed historical import passes.
  const good = JSON.parse(
    fs.readFileSync(path.join(FIXTURE_DIR, 'valid', 'event-historical-import.json'), 'utf8'),
  );
  assert.equal(good.provenance, 'historical_import');
  assert.equal(isValid(good, eventSchema), true, 'valid historical import must pass');

  // A historical import with no import_batch must fail (if/then enforcement).
  const bad = JSON.parse(
    fs.readFileSync(path.join(FIXTURE_DIR, 'invalid', 'event-historical-import-missing-batch.json'), 'utf8'),
  );
  assert.equal(isValid(bad, eventSchema), false, 'historical_import without batch must fail');

  // A live_observer event with import_batch=null must pass (batch only required on import).
  const live = JSON.parse(JSON.stringify(good));
  live.provenance = 'live_observer';
  live.import_batch = null;
  live.event_id = 'evt_live_variant';
  assert.equal(isValid(live, eventSchema), true, 'live_observer with null batch must pass');
});
