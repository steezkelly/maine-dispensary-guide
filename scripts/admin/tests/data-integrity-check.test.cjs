'use strict';

// Regression for the 2026-07-26 finding: AGENTS.md carried stale blog &
// components count claims (44 / 25) while the filesystem held 54 / 30.
// data-integrity-check.cjs originally returned only the FIRST regex
// match per category, so a stale duplicate elsewhere in the doc went
// undetected. These tests pin:
//   1. Every numeric claim found in AGENTS.md for each category equals
//      live filesystem reality (no first-match shortcut).
//   2. A full end-to-end run of data-integrity-check.cjs exits 0 against
//      the current repo.
//   3. A pure-fixture unit assertion that extractBlogCounts /
//      extractComponentsCounts surface duplicate claims. Runs without
//      touching either AGENTS.md or any tracked file: it builds a
//      controlled string, shells out a tiny inline node script that
//      requires the .cjs and prints results, and asserts the JSON
//      array. The script never modifies AGENTS.md, so any interruption
//      between steps cannot damage the tracked file.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { test } = require('node:test');

const REPO = path.resolve(__dirname, '..', '..', '..');
const SCRIPT = path.join(REPO, 'scripts/admin/data-integrity-check.cjs');
const AGENTS = path.join(REPO, 'AGENTS.md');
const APPS = path.join(REPO, 'apps/maine-cannabis');
const BLOG_DIR = path.join(APPS, 'src', 'pages', 'blog');
const COMPONENTS_DIR = path.join(APPS, 'src', 'components');

// Pull the production extractors from the shared module so the test
// exercises the same regexes the script uses. (Codex finding 8 on
// PR #221: the prior probes reimplemented the regexes inline, so a
// helper regression to first-match behavior would still pass.)
const {
    extractBlogCountsFromText,
    extractComponentsCountsFromText,
} = require(path.resolve(REPO, 'scripts/admin/data-integrity-extractors.cjs'));

function countAstroDir(d) {
    if (!fs.existsSync(d)) return 0;
    return fs.readdirSync(d).filter((f) => f.endsWith('.astro')).length;
}

test('every AGENTS.md blog count claim equals live blog/ directory size', () => {
    const text = fs.readFileSync(AGENTS, 'utf8');
    const actual = countAstroDir(BLOG_DIR);
    const claims = extractBlogCountsFromText(text);
    assert.ok(claims.length >= 1, 'AGENTS.md must contain at least one blog count claim');
    for (const claim of claims) {
        assert.equal(claim, actual,
            `AGENTS.md claims ${claim} blog posts but ${BLOG_DIR} contains ${actual} .astro files`);
    }
});

test('every AGENTS.md components count claim equals live components/ directory size', () => {
    const text = fs.readFileSync(AGENTS, 'utf8');
    const actual = countAstroDir(COMPONENTS_DIR);
    const claims = extractComponentsCountsFromText(text);
    assert.ok(claims.length >= 1, 'AGENTS.md must contain at least one components count claim');
    for (const claim of claims) {
        assert.equal(claim, actual,
            `AGENTS.md claims ${claim} reusable components but ${COMPONENTS_DIR} contains ${actual} .astro files`);
    }
});

test('data-integrity-check.cjs exits 0 against the current repo (no drift)', () => {
    const result = execFileSync(process.execPath, [SCRIPT, '--check'], {
        cwd: REPO,
        encoding: 'utf8',
        stdio: 'pipe',
    });
    assert.match(result, /all docs match reality/,
        'data-integrity-check.cjs must report zero drift on the current repo');
});

test('production extractBlogCountsFromText returns every occurrence (not just first)', () => {
    // Direct call to the production helper imported above. If it ever
    // regresses to first-match behavior, this test fails.
    const fixture =
        'first claim 54 blog posts on overview.\n' +
        'second claim 99 blog posts on project-tree.\n';
    const claims = extractBlogCountsFromText(fixture);
    assert.deepEqual(claims.sort(), [54, 99],
        'production extractBlogCountsFromText must return both claims');
});

test('production extractComponentsCountsFromText returns every occurrence', () => {
    const fixture =
        'first claim 30 reusable components on overview.\n' +
        'second claim 88 reusable components on project-tree.\n';
    const claims = extractComponentsCountsFromText(fixture);
    assert.deepEqual(claims.sort(), [30, 88],
        'production extractComponentsCountsFromText must return both claims');
});

test('production extractBlogCountsFromText ignores Blog posts (N articles) parenthetical', () => {
    // Codex finding 6: the "(53 articles)" parenthetical is a
    // sub-count for explainability, not a directory-size claim, so it
    // must NOT be captured. Otherwise an article count of 53 will
    // always be flagged as drift against the .astro file count of 54.
    const fixture =
        '54 blog posts (53 article posts plus the blog index)\n';
    const claims = extractBlogCountsFromText(fixture);
    assert.deepEqual(claims, [54],
        'production extractBlogCountsFromText must not capture the parenthetical article sub-count');
});

test('production extractComponentsCountsFromText matches plain line-start Components (N, …)', () => {
    // Codex finding 7: a /m multiline regex is required so ^ matches
    // the start of any line, not just the start of the file.
    const fixture =
        'unrelated prose above.\n' +
        'Components (88, somewhere): …\n' +
        'more prose.\n';
    const claims = extractComponentsCountsFromText(fixture);
    assert.ok(claims.includes(88),
        'extractComponentsCountsFromText must match plain Components (N, …) on lines after the file start');
});

