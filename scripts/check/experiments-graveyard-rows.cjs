'use strict';

// scripts/check/experiments-graveyard-rows.cjs
//
// Sanitizer for the Cannabis Claim Graveyard rows that render on
// /experiments. The 12 hand-authored rows live in
// apps/maine-cannabis/src/data/experiments-graveyard-rows.json, and
// every `better` field is checked here against a small list of
// banned substrings that MDG's no-YMYL posture disallows.
//
// Why: the Slop Bingo "better" column already honors this contract
// implicitly; surfacing it as a unit test makes a regression
// impossible to ship silently.
//
// Banned substrings (case-insensitive). Any match in a row's `better`
// field is a hard failure — the test file reports the row number and
// the offending substring.

const BANNED_SUBSTRINGS = [
  'best',
  'safest',
  'guaranteed',
  '100%',
  'cure',
  'treat',
  'heal',
  'fda-approved',
  'clinically proven',
  'miracle',
];

function checkBetterField(better, rowIndex) {
  const lowered = String(better).toLowerCase();
  for (const banned of BANNED_SUBSTRINGS) {
    if (lowered.includes(banned)) {
      return {
        ok: false,
        rowIndex,
        banned,
        message: `row ${rowIndex}: "better" field contains banned substring "${banned}"`,
      };
    }
  }
  return { ok: true, rowIndex };
}

function checkGraveyardRows(rows) {
  if (!Array.isArray(rows)) {
    return { ok: false, message: 'graveyardRows must be an array' };
  }
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || typeof row !== 'object') {
      return { ok: false, message: `row ${i}: must be an object` };
    }
    if (typeof row.better !== 'string' || row.better.length === 0) {
      return { ok: false, message: `row ${i}: "better" must be a non-empty string` };
    }
    const verdict = checkBetterField(row.better, i);
    if (!verdict.ok) {
      return { ok: false, message: verdict.message, rowIndex: i, banned: verdict.banned };
    }
  }
  return { ok: true, count: rows.length };
}

module.exports = {
  BANNED_SUBSTRINGS,
  checkBetterField,
  checkGraveyardRows,
};
