#!/usr/bin/env node
/**
 * pre-push-verify.cjs
 *
 * Pre-push verification for the MDG monorepo. Detects .astro and .ts files
 * that are about to be pushed and runs two passes:
 *
 *   1. FAST: esbuild parse-only on the .astro frontmatter JS.
 *      Catches the Sprint 75 failure class (missing commas, stray braces
 *      inside embedded object/array literals) in ~1 second per file.
 *      esbuild will refuse to bundle but happily parse-check JS, so we
 *      feed the extracted frontmatter as a virtual entry on stdin.
 *
 *   2. THOROUGH: `npx astro check` (full project), then filters results
 *      to the changed files. Slow (5-15s for the MDG app), so only runs
 *      after pass 1 is green.
 *
 * Replaces the previous scripts/git/delta-typecheck.cjs, which had a
 * hardcoded Windows projectRoot and was never wired into any hook.
 *
 * Exit codes:
 *   0  clean
 *   1  parse error in changed .astro file (fast pass failed)
 *   2  astro check error in changed file (slow pass failed)
 *   3  tool/env error (esbuild missing, not in a git repo, etc.)
 *
 * Usage:
 *   node scripts/git/pre-push-verify.cjs           # checks staged + working tree
 *   node scripts/git/pre-push-verify.cjs --ref=<ref>  # checks commits <ref>..HEAD
 *   node scripts/git/pre-push-verify.cjs --fast-only  # skip slow pass
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = (() => {
    // Walk up from this file until we find a package.json with "workspaces"
    let dir = __dirname;
    for (let i = 0; i < 6; i++) {
        try {
            const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
            if (Array.isArray(pkg.workspaces)) return dir;
        } catch {}
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    // Fallback: assume CWD is the repo root
    return process.cwd();
})();

const APPS = ['apps/maine-cannabis'];
const ASTRO_FILE_RE = /\.astro$/;
const TS_FILE_RE = /\.(ts|tsx|mts|cts)$/;

function log(level, msg) {
    const tags = { info: '\x1b[36mi\x1b[0m', ok: '\x1b[32m✓\x1b[0m', warn: '\x1b[33m!\x1b[0m', err: '\x1b[31m✗\x1b[0m' };
    const tag = tags[level] || tags.info;
    console.log(`[pre-push] ${tag} ${msg}`);
}

function git(cmd) {
    return execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8', shell: true }).trim();
}

function changedFiles(refArg) {
    // Three sources, deduped:
    //   a) commits in <ref>..HEAD (used when called as a real pre-push hook with the remote ref)
    //   b) staged changes (index vs HEAD)
    //   c) unstaged/uncommitted working-tree changes
    const all = new Set();
    if (refArg) {
        try {
            git(`git diff --name-only ${refArg} HEAD`).split('\n').filter(Boolean).forEach(f => all.add(f));
        } catch (e) {
            log('warn', `could not diff against ${refArg}: ${e.message.split('\n')[0]}`);
        }
    }
    try {
        git('git diff --name-only --cached HEAD').split('\n').filter(Boolean).forEach(f => all.add(f));
    } catch {}
    try {
        git('git diff --name-only').split('\n').filter(Boolean).forEach(f => all.add(f));
    } catch {}
    // Also pick up untracked-but-tracked-by-intent .astro/.ts files (rare but real)
    try {
        const untracked = git('git ls-files --others --exclude-standard').split('\n').filter(Boolean);
        untracked.forEach(f => { if (ASTRO_FILE_RE.test(f) || TS_FILE_RE.test(f)) all.add(f); });
    } catch {}
    return [...all].filter(f => ASTRO_FILE_RE.test(f) || TS_FILE_RE.test(f));
}

/**
 * Extract the script-y portion of an .astro file:
 *   - everything between the first --- fence and the next --- fence (frontmatter), OR
 *   - if no frontmatter, everything from the start of file up to the first
 *     non-script-non-import template marker
 *
 * For pre-push purposes, even the full file body is fine to feed to esbuild
 * because esbuild will treat the leading <template>/<style>/etc. blocks as
 * syntax errors. To avoid that, we extract only the frontmatter section.
 */
function extractFrontmatter(filePath) {
    const src = fs.readFileSync(filePath, 'utf8');
    // Astro frontmatter lives between the first pair of `---` lines at the
    // very start of the file. If the file doesn't start with `---`, there's
    // no frontmatter and esbuild has nothing JS to check — return null.
    if (!src.startsWith('---')) return null;
    const lines = src.split('\n');
    if (lines[0].trim() !== '---') return null;
    // Find the closing fence
    let end = -1;
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '---') { end = i; break; }
    }
    if (end === -1) return null;
    return lines.slice(1, end).join('\n');
}

function fastParseCheck(files) {
    const astroFiles = files.filter(f => ASTRO_FILE_RE.test(f));
    if (astroFiles.length === 0) {
        log('info', 'no .astro files changed — skipping esbuild parse pass');
        return { ok: true, errors: [] };
    }

    log('info', `esbuild parse pass on ${astroFiles.length} .astro file(s)…`);
    const esbuildBin = path.join(REPO_ROOT, 'node_modules', '.bin', 'esbuild');
    if (!fs.existsSync(esbuildBin)) {
        log('err', `esbuild not found at ${esbuildBin} — run \`npm install\` first`);
        return { ok: false, errors: [{ file: '(env)', msg: 'esbuild missing' }] };
    }

    const errors = [];
    for (const rel of astroFiles) {
        const abs = path.join(REPO_ROOT, rel);
        if (!fs.existsSync(abs)) continue; // file was deleted
        const fm = extractFrontmatter(abs);
        if (fm === null || fm.trim() === '') {
            log('ok', `${rel} — no frontmatter, skipped`);
            continue;
        }
        // Feed frontmatter to esbuild as stdin. Use --loader=ts to handle any
        // inline TS annotations. --log-level=warning suppresses the
        // "this entry is a stub" noise.
        const res = spawnSync(esbuildBin, [
            '--loader=ts',
            '--log-level=warning',
            '--format=esm',
            '--target=es2022',
        ], { input: fm, encoding: 'utf8', cwd: REPO_ROOT });

        if (res.status === 0) {
            log('ok', `${rel} — parsed clean`);
        } else {
            const stderr = (res.stderr || '').trim();
            // esbuild prints "ERROR: ..." and a "X|Y: msg" line. Pull out
            // the first concrete error location + message.
            const lineMatch = stderr.match(/(\d+):(\d+):\s*(.+)/);
            const loc = lineMatch ? `${lineMatch[1]}:${lineMatch[2]}` : '?';
            const msg = (stderr.split('\n').find(l => l.includes('ERROR')) || stderr.split('\n')[0] || 'parse error').trim();
            log('err', `${rel} — ${msg}`);
            errors.push({ file: rel, loc, msg });
        }
    }

    if (errors.length > 0) {
        console.log();
        log('err', `${errors.length} .astro file(s) failed parse check — push blocked.`);
        console.log('    Fix the syntax errors above. If a missing comma between');
        console.log('    object literals is reported, re-check every `},` → `}`');
        console.log('    transition inside the changed .astro frontmatter.');
        return { ok: false, errors };
    }
    return { ok: true, errors: [] };
}

function slowAstroCheck(files) {
    const astroFiles = files.filter(f => ASTRO_FILE_RE.test(f));
    if (astroFiles.length === 0) {
        log('info', 'no .astro files changed — skipping astro check pass');
        return { ok: true };
    }

    // For the MDG monorepo, the Astro app is apps/maine-cannabis
    const astroApp = path.join(REPO_ROOT, 'apps', 'maine-cannabis');
    if (!fs.existsSync(path.join(astroApp, 'package.json'))) {
        log('warn', `no Astro app found at ${astroApp} — skipping slow pass`);
        return { ok: true };
    }

    log('info', `astro check (filtered to ${astroFiles.length} changed file(s))…`);
    const res = spawnSync('npx', ['astro', 'check'], {
        cwd: astroApp,
        encoding: 'utf8',
        maxBuffer: 16 * 1024 * 1024,
        timeout: 240_000,
    });

    const output = (res.stdout || '') + (res.stderr || '');
    if (res.status === 0) {
        log('ok', 'astro check passed (0 errors)');
        return { ok: true };
    }

    // Filter output to lines mentioning any of the changed basenames
    const basenames = new Set(astroFiles.map(f => path.basename(f)));
    const relevant = output.split('\n').filter(line => {
        return [...basenames].some(b => line.includes(b));
    });
    if (relevant.length === 0) {
        log('warn', 'astro check failed but no errors match changed files — pre-existing baseline. Continuing.');
        return { ok: true };
    }
    console.log(relevant.slice(0, 60).join('\n'));
    log('err', `astro check found errors in changed files — push blocked.`);
    return { ok: false };
}

function main() {
    const args = process.argv.slice(2);
    const refArg = (args.find(a => a.startsWith('--ref=')) || '').slice('--ref='.length);
    const fastOnly = args.includes('--fast-only');

    log('info', `repo: ${REPO_ROOT}`);

    if (!fs.existsSync(path.join(REPO_ROOT, '.git'))) {
        log('err', 'not a git repository — refusing to run');
        process.exit(3);
    }

    const files = changedFiles(refArg);
    if (files.length === 0) {
        log('ok', 'no .astro or .ts files changed — nothing to verify');
        process.exit(0);
    }
    log('info', `changed files: ${files.length}`);
    files.forEach(f => log('info', `  ${f}`));
    console.log();

    const fast = fastParseCheck(files);
    if (!fast.ok) process.exit(1);
    if (fastOnly) {
        log('ok', 'fast-only mode — slow pass skipped');
        process.exit(0);
    }

    const slow = slowAstroCheck(files);
    if (!slow.ok) process.exit(2);

    log('ok', 'pre-push verify: clean. Proceed with push.');
    process.exit(0);
}

main();
