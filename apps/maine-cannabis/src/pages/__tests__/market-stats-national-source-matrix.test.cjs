'use strict';

/**
 * apps/maine-cannabis/src/pages/__tests__/market-stats-national-source-matrix.test.cjs
 *
 * Focused regression test for the §8.2 prose rewrites driven by
 * docs/research/market-stats-national-source-matrix-2026-07-22.md. Each
 * assertion pins one required string (or absence) in the rendered
 * market-stats.astro source so a future operator who silently edits any
 * of the four §8.2 rows gets an attributable, immediate failure instead
 * of a downstream content drift.
 *
 * Run with: node apps/maine-cannabis/src/pages/__tests__/market-stats-national-source-matrix.test.cjs
 */

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const PAGE = resolve(__dirname, '..', 'market-stats.astro');
const source = readFileSync(PAGE, 'utf8');

let pass = 0;
let fail = 0;
function check(name, fn) {
  try {
    fn();
    process.stderr.write('  ok  ' + name + '\n');
    pass += 1;
  } catch (err) {
    process.stderr.write('  FAIL ' + name + ': ' + err.message + '\n');
    fail += 1;
  }
}

check('§8.2 #1: drops the $149B Flowhub total-economic-contribution row', () => {
  // The matrix classifies nationalMarket.1.6 as a derived Flowhub multiplier
  // without a defensible primary URL. The rewrite drops the row entirely.
  // Surface a small explicit note so future editors do not re-add it.
  // The literal "$149B" may appear inside an audit comment that records
  // the removal; we forbid the data-row context but allow the comment.
  const dataRowRegex = /\{\s*metric:\s*["']Total U\.S\.\s+economic contribution/i;
  const dataRowCount = (source.match(dataRowRegex) || []).length;
  assert.equal(
    dataRowCount,
    0,
    '§8.2 #1: the §1.6 "Total U.S. economic contribution" data row must be removed (data-row context)',
  );
  assert.doesNotMatch(
    source,
    /metric:\s*["']Total U\.S\.\s+economic contribution[^"']*["'][^}]*value:\s*["']\$149B/,
    '§8.2 #1: the data row must not assert "$149B" as a value',
  );
  assert.match(
    source,
    /Flowhub[^\n]{0,40}derived[^\n]{0,30}multiplier/i,
    '§8.2 #1: a brief methodology note about the Flowhub-derived multiplier should be present so the omission is auditable',
  );
});

check('§8.2 #2: hemp row caption mentions H.R. 7024 and H.R. 7010 delay bills', () => {
  // federalStatus.4.4: change "changing Nov 12, 2026" to a longer caption
  // that also names the active H.R. 7024 / H.R. 7010 / Senate delay bills.
  assert.match(
    source,
    /H\.?R\.?\s*7024/,
    'federalStatus.4.4 caption must reference H.R. 7024',
  );
  assert.match(
    source,
    /H\.?R\.?\s*7010/,
    'federalStatus.4.4 caption must reference H.R. 7010',
  );
  assert.match(
    source,
    /Nov 12, 2026/,
    'the Section 781 effective date must remain in the caption',
  );
});

check('§8.2 #3: broader rescheduling row reflects post-hearing-brief phase', () => {
  // federalStatus.4.5: hearing concluded Jul 15, 2026; post-hearing briefs
  // due Aug 17, 2026; ALJ has no deadline; DEA Administrator final rule
  // has no deadline. The old "Jun 29 - Jul 15" hearing-range string must
  // be gone.
  assert.match(
    source,
    /hearing concluded Jul 15, 2026/i,
    'federalStatus.4.5 must use the new hearing-concluded wording',
  );
  assert.match(
    source,
    /post-hearing briefs due Aug 17, 2026/i,
    'federalStatus.4.5 must reference the Aug 17, 2026 post-hearing-brief deadline',
  );
  assert.match(
    source,
    /ALJ has no deadline/i,
    'federalStatus.4.5 must state the ALJ has no formal deadline',
  );
  assert.doesNotMatch(
    source,
    /PENDING\s*—\s*hearing\s+Jun 29\s*–\s*Jul 15\s*,?\s*2026/i,
    'the old "PENDING — hearing Jun 29 - Jul 15, 2026" string must be removed',
  );
  assert.doesNotMatch(
    source,
    /PENDING\s*—\s*DEA ALJ hearing Jun 29\s*[–-]\s*Jul 15/i,
    'the alternate "PENDING — DEA ALJ hearing Jun 29 - Jul 15" form must also be removed',
  );
});

check('§8.2 #4: wholesale spot row dropped (2.40 and 1,087/lb literals removed)', () => {
  // nationalPricing.3.8: drop the wholesale spot Nov 21, 2025 row.
  // The matrix explicitly allows either drop or refresh; this card chooses
  // drop and adds a small "intentionally omitted" note.
  assert.doesNotMatch(
    source,
    /\$2\.40/,
    'the $2.40/g wholesale spot row should be removed from market-stats.astro',
  );
  assert.doesNotMatch(
    source,
    /1,?087\s*\/\s*lb/,
    'the $1,087/lb wholesale spot row should be removed from market-stats.astro',
  );
  assert.doesNotMatch(
    source,
    /Cannabis Benchmarks\s+Nov 21,\s*2025/i,
    'the wholesale spot caption tied to the Nov 21, 2025 Cannabis Benchmarks weekly should be removed',
  );
  assert.match(
    source,
    /wholesale\s*spot\s*intentionally\s*omitted/i,
    'a short "wholesale spot intentionally omitted" note should be present so the omission is auditable',
  );
});

process.stderr.write('\nmarket-stats-national-source-matrix.test.cjs: ' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail === 0 ? 0 : 1);
