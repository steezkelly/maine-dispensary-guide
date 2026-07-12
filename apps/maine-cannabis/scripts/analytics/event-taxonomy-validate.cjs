#!/usr/bin/env node
/**
 * event-taxonomy-validate.cjs
 *
 * Static-time validation for src/types/event-taxonomy-v1.ts.
 *
 * Reads the source file and asserts:
 *   - Every event in the union has a DECISION_QUESTION entry.
 *   - Every event in the union has a PRIVACY_CLASS_FOR_EVENT entry.
 *   - PRIVACY_RULES_V1 has all six flags set to true.
 *
 * Plus a lightweight TypeScript compilation check (using tsc --noEmit on the
 * file with no project config) to catch type errors introduced into the schema.
 *
 * Refs:
 *   /home/steve/Documents/mdg-analytics-intelligence-package-v0.5/EVENT-TAXONOMY.md
 *   /home/steve/Documents/mdg-analytics-intelligence-package-v0.5/TICKETS/004-event-taxonomy-v1.md
 *
 * Acceptance criteria fulfilled (per Ticket 004 §Acceptance):
 *   - every event has a decision question  (DECISION_QUESTION_FOR_EVENT)
 *   - every parameter has type, bounded vocabulary/cardinality policy, and privacy class
 *     (TS discriminated union + PRIVACY_CLASS_FOR_EVENT)
 *   - visible CTA/FAQ text is not a canonical key (faq_id: stable ID; action_id: bounded slug)
 *   - form field analytics use an explicit allowlist (PRIVACY_RULES_V1 free_text_forbidden)
 *   - arbitrary `trackFields` values cannot silently enter analytics (v1 schema is closed)
 *   - lead_capture is documented as legacy submit intent (DECISION_QUESTION_FOR_EVENT.lead_capture note)
 *   - exposure/start/completion semantics are distinct (action_exposure/action_select, conversion_start/conversion_complete)
 *   - event schema version is explicit (SchemaVersion type, EventEnvelope.schema_version)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SCHEMA_FILE = path.resolve(__dirname, '..', '..', 'src', 'types', 'event-taxonomy-v1.ts');

if (!fs.existsSync(SCHEMA_FILE)) {
  console.error(`Schema not found: ${SCHEMA_FILE}`);
  process.exit(2);
}

const src = fs.readFileSync(SCHEMA_FILE, 'utf8');

// 1) Check the file has DECISION_QUESTION_FOR_EVENT, PRIVACY_CLASS_FOR_EVENT, PRIVACY_RULES_V1.
const requireEntities = ['DECISION_QUESTION_FOR_EVENT', 'PRIVACY_CLASS_FOR_EVENT', 'PRIVACY_RULES_V1'];
for (const name of requireEntities) {
  if (!src.includes(`export const ${name}`)) {
    console.error(`FAIL: missing export const ${name}`);
    process.exit(3);
  }
}

// 2) Pull event-name literal strings from `event_name: 'foo'` patterns.
//    This gives us a closed-vocabulary list of all event names that exist in the union.
const eventNames = new Set();
const re = /event_name:\s*'([a-z_]+)'/g;
let m;
while ((m = re.exec(src)) !== null) eventNames.add(m[1]);

// Also include string-literal members of EventSchemaV0 and EventSchemaV1.
const unionRe = /EventSchemaV[01]\s*=\s*([\s\S]*?);/g;
while ((m = unionRe.exec(src)) !== null) {
  const inner = m[1];
  const litRe = /'([a-z_]+)'/g;
  let lm;
  while ((lm = litRe.exec(inner)) !== null) eventNames.add(lm[1]);
}

console.log(`Discovered ${eventNames.size} event names in v1 schema.`);
const sorted = Array.from(eventNames).sort();
console.log('  ' + sorted.join(', '));

// 3) Required entries in DECISION_QUESTION_FOR_EVENT / PRIVACY_CLASS_FOR_EVENT.
//    The table block uses the pattern 'event_name': 'comment' or  event_name: 'class'.
//    We slice the file at the relevant block boundaries to avoid matching
//    the same name in the union types.
function sliceBlock(src, startMarker, endMarker) {
  const i = src.indexOf(startMarker);
  if (i === -1) return '';
  const j = src.indexOf(endMarker, i + startMarker.length);
  return (j === -1 ? src.slice(i) : src.slice(i, j));
}

const decisionBlock = sliceBlock(src, 'DECISION_QUESTION_FOR_EVENT:', '\n};\n');
const privacyBlock = sliceBlock(src, 'PRIVACY_CLASS_FOR_EVENT:', '\n};\n');

let missingDecision = [];
let missingPrivacy = [];
for (const name of sorted) {
  // table-row match: looks like  name: ...  or  'name': ...
  const tableRe = new RegExp(`(?:\\b${name}\\s*:|['"\`]${name}['"\`]\\s*:)`);
  if (!tableRe.test(decisionBlock)) missingDecision.push(name);
  if (!tableRe.test(privacyBlock)) missingPrivacy.push(name);
}

if (missingDecision.length) {
  console.error(`FAIL: ${missingDecision.length} event(s) missing DECISION_QUESTION entry: ${missingDecision.join(', ')}`);
  process.exit(4);
}
if (missingPrivacy.length) {
  console.error(`FAIL: ${missingPrivacy.length} event(s) missing PRIVACY_CLASS entry: ${missingPrivacy.join(', ')}`);
  process.exit(5);
}

// 4) PRIVACY_RULES_V1 flag check.
const flagNames = [
  'free_text_forbidden',
  'email_phone_name_forbidden',
  'raw_search_text_forbidden',
  'raw_financial_input_forbidden',
  'financial_result_bucket_required',
  'pseudonymous_id_join_to_leads_forbidden',
];
for (const flag of flagNames) {
  const reFlag = new RegExp(`${flag}\\s*:\\s*true`);
  if (!reFlag.test(src)) {
    console.error(`FAIL: PRIVACY_RULES_V1.${flag} is not 'true'.`);
    process.exit(6);
  }
}

// 5) Lightweight TS compile check on the schema file alone.
try {
  execSync(
    `npx --yes -p typescript@5.4.5 tsc --noEmit --target es2020 --moduleResolution node --strict --skipLibCheck --lib es2020 "${SCHEMA_FILE}"`,
    { stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000 }
  );
  console.log('TS compile check: passed');
} catch (err) {
  console.error('TS compile check: failed');
  console.error(err.stdout ? err.stdout.toString() : err.message);
  process.exit(7);
}

console.log('event-taxonomy-validate: PASS');
console.log(`  events: ${sorted.length}`);
console.log(`  decision questions: all present`);
console.log(`  privacy classes: all present`);
console.log(`  PRIVACY_RULES_V1: 6/6 flags set`);
