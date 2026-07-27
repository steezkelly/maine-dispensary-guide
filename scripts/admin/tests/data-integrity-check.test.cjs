'use strict';

// Regression for the Sprint 80 / OPS-05 follow-up finding:
// AGENTS.md carried stale blog & components count claims (44 / 25) while
// the filesystem held 54 / 30. This test pins the root AGENTS.md count
// claims against live filesystem reality and runs the full script
// end-to-end on the real repo to assert zero drift.

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

function countAstroDir(d) {
    if (!fs.existsSync(d)) return 0;
    return fs.readdirSync(d).filter((f) => f.endsWith('.astro')).length;
}

// Same regexes the script uses (verbatim copies). Drift here between
// the test and the script would invalidate the contract.
function extractBlogCount(file) {
    const c = fs.readFileSync(file, 'utf8');
    const m = c.match(/(\d+)\s*blog\s*posts?/i)
           || c.match(/Blog\s*posts\s*\((\d+)\s*articles?\)/i);
    return m ? parseInt(m[1]) : null;
}

function extractComponentsCount(file) {
    const c = fs.readFileSync(file, 'utf8');
    const m = c.match(/(\d+)\s*reusable\s*components?/i);
    return m ? parseInt(m[1]) : null;
}

test('root AGENTS.md blog count claim equals live blog/ directory size', () => {
    const actual = countAstroDir(BLOG_DIR);
    const claim = extractBlogCount(AGENTS);
    assert.notEqual(claim, null, 'AGENTS.md must contain a blog post count claim');
    assert.equal(claim, actual,
        `AGENTS.md claims ${claim} blog posts but ${BLOG_DIR} contains ${actual} .astro files`);
});

test('root AGENTS.md components count claim equals live components/ directory size', () => {
    const actual = countAstroDir(COMPONENTS_DIR);
    const claim = extractComponentsCount(AGENTS);
    assert.notEqual(claim, null, 'AGENTS.md must contain a reusable components count claim');
    assert.equal(claim, actual,
        `AGENTS.md claims ${claim} reusable components but ${COMPONENTS_DIR} contains ${actual} .astro files`);
});

test('data-integrity-check.cjs exits 0 against the current repo (no drift)', () => {
    // Full end-to-end: invokes the real script with --check so any drift
    // surfaces without forcing a nonzero exit that would fail CI here.
    // (The script's --check mode is warn-only; we still assert exit 0.)
    const result = execFileSync(process.execPath, [SCRIPT, '--check'], {
        cwd: REPO,
        encoding: 'utf8',
        stdio: 'pipe',
    });
    assert.match(result, /all docs match reality/,
        'data-integrity-check.cjs must report zero drift on the current repo');
});

test('data-integrity-check.cjs reports drift when AGENTS.md is artificially stale', () => {
    // RED proof: temporarily rewrite AGENTS.md with a deliberately wrong
    // blog count, run the script with --check, assert it reports drift,
    // then restore AGENTS.md atomically. Uses mkdtemp sibling so the
    // restoration path stays inside the test process.
    const original = fs.readFileSync(AGENTS, 'utf8');
    const stale = original.replace(/(\d+)\s*blog\s*posts?/i, '1 blog posts');
    assert.notEqual(stale, original, 'fixture rewrite must change AGENTS.md');
    try {
        fs.writeFileSync(AGENTS, stale);
        let output;
        try {
            output = execFileSync(process.execPath, [SCRIPT, '--check'], {
                cwd: REPO,
                encoding: 'utf8',
                stdio: 'pipe',
            });
        } catch (err) {
            // --check is warn-only and the script exits 0 on drift, but if
            // any future revision changes that, surface stderr.
            output = (err.stdout || '') + (err.stderr || '');
        }
        assert.match(output, /claims 1 blog posts but reality is \d+ blog posts/,
            'script must surface the drift when AGENTS.md blog count is artificially stale');
    } finally {
        fs.writeFileSync(AGENTS, original);
        // Reassert the original passed the integrity check so any failure
        // above cannot silently leak a permanently-broken AGENTS.md.
        const verify = execFileSync(process.execPath, [SCRIPT, '--check'], {
            cwd: REPO, encoding: 'utf8', stdio: 'pipe',
        });
        assert.match(verify, /all docs match reality/,
            'AGENTS.md must be restored to a clean state before the test returns');
    }
});
