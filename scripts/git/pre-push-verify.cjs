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
 *   4  smoke-200: a built page returns non-200 against the live site
 *   5  smoke-img-200: a page references an image that 404s
 *   6  sitemap-postprocess: a sitemap unit/integration assertion fails
 *   7  docs-vs-code: a doc claims a check runs that isn't wired in CI or the pre-push gate
 *
 * Pass 3 (smoke-200) was added in Sprint 78. It hits every published page
 * on https://mainedispensaryguide.com (or MDG_BASE/MDG_PREVIEW_URL) and
 * fails the push if any return non-200. Catches the "build green but
 * specific page 404s/500s" failure mode that build-time checks can't see.
 * Runs ~5s against the live site. Skippable with --skip-smoke-200 for
 * offline runs.
 *
 * Pass 4 (smoke-img-200) was added on 2026-07-02. It walks every rendered
 * HTML file in dist/, extracts every <img src>, <source srcset>,
 * <link rel="preload" as="image" href>, and <meta property="og:image"
 * content> reference, HEADs each same-origin URL against MDG_BASE, and
 * fails the push if any return non-200. Catches the "shipped with a
 * broken hero/OG image" bug class — see the 2026-07-02 /learn/ consumer
 * hub regression (heroImage pointed at a 404 path; build green, smoke-200
 * green, but the social-share preview was a 404 image and the browser
 * was preloading a 404). Runs ~30s against the live site. Skippable with
 * --skip-smoke-img-200 for offline runs.
 *
 * Usage:
 *   node scripts/git/pre-push-verify.cjs                  # all passes
 *   node scripts/git/pre-push-verify.cjs --ref=<ref>     # checks commits <ref>..HEAD
 *   node scripts/git/pre-push-verify.cjs --fast-only     # skip slow pass + smokes
 *   node scripts/git/pre-push-verify.cjs --skip-smoke-200     # skip live-site page smoke
 *   node scripts/git/pre-push-verify.cjs --skip-smoke-img-200 # skip live-site image smoke
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

function smoke200Check() {
    // Pass 3: hit every published page on the live site, fail on any non-200.
    // Wraps scripts/check/smoke-200.cjs (Sprint 77
    // observability). Catches the "build green but specific page 404s" mode.
    // Sprint 78: wire-up.
    const smokeScript = path.join(REPO_ROOT, 'scripts', 'check', 'smoke-200.cjs');
    if (!fs.existsSync(smokeScript)) {
        log('warn', `smoke-200.cjs not found at ${smokeScript} — skipping`);
        return { ok: true };
    }

    const base = process.env.MDG_BASE || process.env.MDG_PREVIEW_URL || 'https://mainedispensaryguide.com';
    log('info', `smoke-200 against ${base}…`);

    const res = spawnSync('node', [smokeScript], {
        env: { ...process.env, MDG_BASE: base },
        encoding: 'utf8',
        cwd: REPO_ROOT,
        timeout: 120_000,
    });

    const out = ((res.stdout || '') + (res.stderr || '')).trim();
    // Echo the last 5 lines so the agent sees what failed.
    const tail = out.split('\n').slice(-5).join('\n');
    if (res.status === 0) {
        log('ok', 'smoke-200: all pages 200');
        return { ok: true };
    }
    log('err', `smoke-200: at least one page returned non-200 — push blocked.`);
    if (tail) console.log(tail);
    return { ok: false };
}

function smokeImg200Check() {
    // Pass 4: walk every rendered HTML in dist/, extract every image
    // reference (img src, source srcset, link rel=preload as=image,
    // meta property=og:image), HEAD each same-origin URL against
    // MDG_BASE, fail on any non-200. Catches the "shipped with a broken
    // hero/OG image" bug class that smoke-200 misses (image requests
    // are client-side, so the page renders 200 even when the image 404s).
    // Added 2026-07-02 after the /learn/ consumer hub regression.
    const smokeScript = path.join(REPO_ROOT, 'scripts', 'check', 'smoke-img-200.cjs');
    if (!fs.existsSync(smokeScript)) {
        log('warn', `smoke-img-200.cjs not found at ${smokeScript} — skipping`);
        return { ok: true };
    }

    const base = process.env.MDG_BASE || process.env.MDG_PREVIEW_URL || 'https://mainedispensaryguide.com';
    log('info', `smoke-img-200 against ${base}…`);

    const res = spawnSync('node', [smokeScript], {
        env: { ...process.env, MDG_BASE: base },
        encoding: 'utf8',
        cwd: REPO_ROOT,
        timeout: 180_000,
    });

    const out = ((res.stdout || '') + (res.stderr || '')).trim();
    // Echo the last 12 lines so the agent sees the broken refs.
    const tail = out.split('\n').slice(-12).join('\n');
    if (res.status === 0) {
        log('ok', 'smoke-img-200: all image refs 200');
        return { ok: true };
    }
    log('err', `smoke-img-200: at least one image ref returned non-200 — push blocked.`);
    if (tail) console.log(tail);
    return { ok: false };
}

function sitemapPostprocessCheck() {
    // Pass 5: run the sitemap postprocessor unit + integration tests
    // against the real dist/sitemap-0.xml. Catches the "dead-code
    // cascade" failure mode (a tiny change to astro.config.mjs
    // collapsing the sitemap from 222 URLs to 7) and the
    // "noindex check broke" failure mode (force-everything-noindex
    // collapse to 0 URLs). Both are silent — the build goes green,
    // the gate goes green, and the live site is broken until
    // someone notices. Added 2026-07-02 after the dead-code
    // cascade was caught manually.
    const testScript = path.join(REPO_ROOT, 'scripts', 'check', 'sitemap-postprocess.test.mjs');
    if (!fs.existsSync(testScript)) {
        log('warn', `sitemap-postprocess.test.mjs not found at ${testScript} — skipping`);
        return { ok: true };
    }
    log('info', `sitemap-postprocess…`);
    const res = spawnSync('node', [testScript], {
        encoding: 'utf8',
        cwd: REPO_ROOT,
        timeout: 60_000,
    });
    const out = ((res.stdout || '') + (res.stderr || '')).trim();
    // Echo the tail so the agent sees which assertions failed.
    const tail = out.split('\n').slice(-15).join('\n');
    if (res.status === 0) {
        log('ok', 'sitemap-postprocess: all assertions pass');
        return { ok: true };
    }
    log('err', `sitemap-postprocess: at least one assertion failed — push blocked.`);
    if (tail) console.log(tail);
    return { ok: false };
}

function docsVsCodeCheck() {
    // Pass 6: assert that the AGENTS.md / handbook / project state docs
    // mention only checks that actually run in CI or the pre-push gate.
    // Catches the "docs claim 6 checks but CI runs 3" class that the
    // senior review flagged in 2026-07-02 (the docs claimed 6 checks
    // but CI only ran 3 of them — drift went uncaught for at least one
    // sprint). The check:docs-vs-code script is at scripts/check/
    // (root) and is also wired into CI directly.
    //
    // Historical note: this code path previously referenced
    // apps/maine-cannabis/scripts/content/check-docs-vs-code.cjs — a
    // file that does not exist (the actual script is at the root
    // scripts/check/ path). That stale reference silently bypassed the
    // lint on every push from 2026-07-03 onward until caught here.
    const lintScript = path.join(REPO_ROOT, 'scripts', 'check', 'docs-vs-code.cjs');
    if (!fs.existsSync(lintScript)) {
        log('warn', `docs-vs-code.cjs not found at ${lintScript} — skipping`);
        return { ok: true };
    }
    log('info', `docs-vs-code…`);
    const res = spawnSync('node', [lintScript], {
        encoding: 'utf8',
        cwd: REPO_ROOT,
        timeout: 30_000,
    });
    const out = ((res.stdout || '') + (res.stderr || '')).trim();
    const tail = out.split('\n').slice(-15).join('\n');
    if (res.status === 0) {
        log('ok', 'docs-vs-code: no drift');
        return { ok: true };
    }
    log('err', `docs-vs-code: drift detected — push blocked.`);
    if (tail) console.log(tail);
    return { ok: false };
}

function compressedFrontmatterCheck() {
    // Pass 7: assert that every .astro file using <AutoRelated /> has its
    // `import AutoRelated from '...';` statement INSIDE the file's
    // frontmatter (between the opening and closing `---` fences).
    //
    // Catches the R128 bug class (2026-07-04): R127's first migration
    // appended `import AutoRelated` to the END of compressed-frontmatter
    // lines that began with `---`. Astro's bundler only resolves imports
    // that appear early in the frontmatter statement list — when the
    // import lands at the end (after const/let/export), the build silently
    // produces an empty <aside class="auto-related"> with no related-guide
    // items. 35 files were affected; fixup commit was 1fa654c0.
    //
    // This lint runs over all .astro files in apps/maine-cannabis/src/pages
    // and reports any file where <AutoRelated> is used but the import is
    // outside the frontmatter block. Cheap (no Astro invocation, no build,
    // no network) and cwd-independent.
    const lintScript = path.join(REPO_ROOT, 'scripts', 'check', 'check-compressed-frontmatter.cjs');
    if (!fs.existsSync(lintScript)) {
        log('warn', `check-compressed-frontmatter.cjs not found at ${lintScript} — skipping`);
        return { ok: true };
    }
    log('info', `compressed-frontmatter check (Pass 7)…`);
    const res = spawnSync('node', [lintScript], {
        encoding: 'utf8',
        cwd: REPO_ROOT,
        timeout: 30_000,
    });
    const out = ((res.stdout || '') + (res.stderr || '')).trim();
    const tail = out.split('\n').slice(-15).join('\n');
    if (res.status === 0) {
        log('ok', 'compressed-frontmatter: all AutoRelated imports inside frontmatter');
        return { ok: true };
    }
    log('err', `compressed-frontmatter: at least one .astro file has a misplaced import — push blocked.`);
    if (tail) console.log(tail);
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

    // Inreach pass 2026-07-05: if any changed file is an .astro page,
    // auto-regenerate autoRelatedData.json before the verify runs. The
    // regenerated data file is restaged so the commit captures the
    // fresh data (the alternative — silently shipping stale data when
    // a new guide is added — was the failure mode that motivated this).
    const astroPageFiles = files.filter(f => f.includes('apps/maine-cannabis/src/pages/') && ASTRO_FILE_RE.test(f));
    if (astroPageFiles.length > 0) {
        log('info', `autoRelated: ${astroPageFiles.length} .astro page file(s) changed — regenerating data file…`);
        const regenScript = path.join(REPO_ROOT, 'scripts', 'data', 'regen-auto-related.cjs');
        if (fs.existsSync(regenScript)) {
            const regen = spawnSync('node', [regenScript], { encoding: 'utf8', cwd: REPO_ROOT, timeout: 60_000 });
            const tail = ((regen.stdout || '') + (regen.stderr || '')).trim().split('\n').slice(-3).join('\n');
            if (regen.status === 0) {
                log('ok', `autoRelated: data file regenerated. ${tail}`);
                // Stage the regenerated data file if it's part of the repo
                try { git('git add apps/maine-cannabis/src/data/autoRelatedData.json'); } catch {}
            } else {
                log('warn', `autoRelated: regen script failed (exit ${regen.status}) — verify continues.`);
                if (tail) console.log(tail);
            }
        }
    }

    const fast = fastParseCheck(files);
    if (!fast.ok) process.exit(1);
    if (fastOnly) {
        log('ok', 'fast-only mode — slow pass skipped');
        process.exit(0);
    }

    const slow = slowAstroCheck(files);
    if (!slow.ok) process.exit(2);

    if (!args.includes('--skip-smoke-200')) {
        const smoke = smoke200Check();
        if (!smoke.ok) process.exit(4);
    } else {
        log('info', 'smoke-200 skipped (--skip-smoke-200)');
    }

    if (!args.includes('--skip-smoke-img-200')) {
        const smokeImg = smokeImg200Check();
        if (!smokeImg.ok) process.exit(5);
    } else {
        log('info', 'smoke-img-200 skipped (--skip-smoke-img-200)');
    }

    if (!args.includes('--skip-sitemap-postprocess')) {
        const smChk = sitemapPostprocessCheck();
        if (!smChk.ok) process.exit(6);
    } else {
        log('info', 'sitemap-postprocess skipped (--skip-sitemap-postprocess)');
    }

    if (!args.includes('--skip-docs-vs-code')) {
        const dvc = docsVsCodeCheck();
        if (!dvc.ok) process.exit(7);
    } else {
        log('info', 'docs-vs-code skipped (--skip-docs-vs-code)');
    }

    if (!args.includes('--skip-compressed-frontmatter')) {
        const cf = compressedFrontmatterCheck();
        if (!cf.ok) process.exit(8);
    } else {
        log('info', 'compressed-frontmatter skipped (--skip-compressed-frontmatter)');
    }

    log('ok', 'pre-push verify: clean. Proceed with push.');
    process.exit(0);
}

main();
