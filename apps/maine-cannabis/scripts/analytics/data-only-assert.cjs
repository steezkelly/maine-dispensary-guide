'use strict';

// Shared regex/predicate module for `--data-only` mode of pre-push-verify.cjs.
//
// The MDG-ANALYTICS-001 wiring batch exposed that the verify script needs a
// data-attribute-only assertion to allow large wiring commits (35 .astro files
// at once) to bypass the slow `astro check` pass. This module is the
// authoritative implementation; both the verify script and its tests import
// from here. Drift between this module and the verify script is the most
// common failure mode here; the tests below catch it.

const HTML_COMMENT_LINE = /<!--/;
const INSERTED_DATA_ATTR = /data-[a-z]+(-[a-z]+)*=["'][^"']*["']/g;
const INSERTED_ATTR_TAIL = /^>\s*$/;
const TAG_OPEN_LINE = /^<[a-zA-Z][\w-]*(\s+[^>]*)?$/;
const SPACING_LINE = /^\+\s*$/;
const PLUS_PREFIX = /^\+\s*/;

function _strip(line) { return line.replace(PLUS_PREFIX, ''); }

function _lineHasData(line) {
    return (_strip(line).match(INSERTED_DATA_ATTR) || []).length;
}

function _isTagOpenLine(line) {
    return TAG_OPEN_LINE.test(_strip(line));
}

function _isAttrTailLine(line) {
    const s = _strip(line);
    if (!s.endsWith('>')) return false;
    if (/^\s*[a-z][\w-]*\s+/.test(s)) return false; // starts a new tag (full opener)
    if (/^\s*<[a-z][\w-]*\s*>/.test(s)) return false; // self-closing or no-attr tag
    return true;
}

function _isSpacingLine(line) {
    return SPACING_LINE.test(line);
}

/**
 * Assert that a single diff hunk (array of `+...` lines) is data-attribute-only.
 *
 * Returns:
 *   { ok: true, attrsCount, violations: [] }
 *   when every line is data-*, comment, attr-tail, spacing, OR a tag-open that's
 *   part of a multi-line tag continuation where another line in the hunk carries
 *   the data-* attribute.
 *
 *   { ok: false, violations: [line1, ...] }
 *   when any line violates (text change, import, etc).
 *
 * Note: callers are responsible for splitting the raw `git diff` output into
 * hunks (separated by `@@` lines). Within each hunk, we run a two-pass scan:
 * pass 1 detects hunk-level data-presence; pass 2 classifies each +line.
 */
function assertHunk(hunkLines) {
    const violations = [];
    let attrsCount = 0;
    if (hunkLines.length === 0) return { ok: true, attrsCount, violations };
    const hasData = hunkLines.some(l => _lineHasData(l) > 0);
    for (const p of hunkLines) {
        const n = _lineHasData(p);
        if (n > 0) { attrsCount += n; continue; }
        if (HTML_COMMENT_LINE.test(p)) continue;
        if (_isAttrTailLine(p)) continue;
        if (_isSpacingLine(p)) continue;
        if (hasData && _isTagOpenLine(p)) continue;
        violations.push(p);
    }
    return { ok: violations.length === 0, attrsCount, violations };
}

/**
 * Walk a full `git diff` output (multiple hunks separated by `@@ ... @@` lines)
 * and assert every hunk is data-attribute-only. Returns aggregated results.
 */
function assertDiffText(diffText) {
    const lines = diffText.split('\n');
    let hunkPending = [];
    const results = [];
    const flush = () => {
        results.push(assertHunk(hunkPending));
        hunkPending = [];
    };
    for (const line of lines) {
        if (line.startsWith('@@')) {
            flush();
            continue;
        }
        if (!line.startsWith('+')) continue;
        if (line.startsWith('+++')) continue;
        hunkPending.push(line);
    }
    flush();
    const allOk = results.every(r => r.ok);
    const attrsCount = results.reduce((s, r) => s + (r.attrsCount || 0), 0);
    const violations = results.flatMap((r, i) => r.violations.map(v => ({ hunk: i, line: v })));
    return { ok: allOk, attrsCount, violations };
}

module.exports = {
    HTML_COMMENT_LINE,
    INSERTED_DATA_ATTR,
    INSERTED_ATTR_TAIL,
    TAG_OPEN_LINE,
    SPACING_LINE,
    PLUS_PREFIX,
    _strip,
    _lineHasData,
    _isTagOpenLine,
    _isAttrTailLine,
    _isSpacingLine,
    assertHunk,
    assertDiffText,
};
