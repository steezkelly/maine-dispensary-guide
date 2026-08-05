#!/usr/bin/env node
/**
 * pre-push-verify.cjs
 *
 * Pre-push verification for the MDG monorepo. Detects changed .astro files,
 * app-source TypeScript, and root Node scripts, then runs three passes:
 *
 *   1. FAST: esbuild parse-only on the .astro frontmatter JS.
 *      Catches the Sprint 75 failure class (missing commas, stray braces
 *      inside embedded object/array literals) in ~1 second per file.
 *      esbuild will refuse to bundle but happily parse-check JS, so we
 *      feed the extracted frontmatter as a virtual entry on stdin.
 *
 *   2. NODE SCRIPTS: `node --check` on changed recursive scripts/ .cjs/.mjs/.js files.
 *
 *   3. THOROUGH: `npx astro check` (full project), then filters results
 *      to changed .astro files and changed app-source TypeScript. Slow
 *      (5-15s for the MDG app), so only runs after pass 1 is green.
 *
 * Replaces the previous scripts/git/delta-typecheck.cjs, which had a
 * hardcoded Windows projectRoot and was never wired into any hook.
 *
 * Exit codes:
 *   0   clean
 *   1   parse error in changed .astro file (fast pass failed)
 *   2   invalid/unknown exact-range option or ref, or astro check error in changed file
 *   3   tool/env error (esbuild missing, not in a git repo, etc.)
 *   4   (legacy) smoke-200: a built page returns non-200 against the live site
 *   5   (legacy) smoke-img-200: a page references an image that 404s
 *   6   sitemap-postprocess: a sitemap unit/integration assertion fails
 *   7   docs-vs-code: a doc claims a check runs that isn't wired in CI or the pre-push gate
 *   8   compressed-frontmatter: a .astro page imports AutoRelated outside its frontmatter fence
 *   9   hero-image-naming: a hero/infographic file uses a Layout-incompatible suffix
 *   10  node --check: a changed root Node script has invalid syntax
 *   11  --data-only: at least one file changed non-data-attribute content
 *   12  --with-smoke: no acceptable smoke base (MDG_PREVIEW_URL missing or MDG_ALLOW_PROD_SMOKE not set)
 *   13  autoRelated-freshness required input absent or content-divergent
 *   14  (reserved) verifier discovered the working tree was mutated
 *   15  (reserved) killOrphanedTsServers could not enumerate
 *   16  release-governance contract failed or was unavailable
 *
 * Pass 3 (smoke-200) was added in Sprint 78. It hits every published page
 * on the explicitly selected preview or post-deploy production target and
 * fails verification if any return non-200. Catches the "build green but
 * specific page 404s/500s" failure mode that build-time checks can't see.
 * Runs ~5s against the selected target. OPT-IN ONLY as of 2026-07-13 (Sprint 78
 * verify-bloat cleanup) — use --with-smoke only after a normal branch push and
 * exact-SHA preview readiness, or after merge and production readiness. Default
 * is OFF because local verification cannot validate an undeployed candidate.
 *
 * Pass 4 (smoke-img-200) was added on 2026-07-02. It walks every rendered
 * HTML file in dist/, extracts every <img src>, <source srcset>,
 * <link rel="preload" as="image" href>, and <meta property="og:image"
 * content> reference, HEADs each same-origin URL against the smoke base,
 * and fails verification if any return non-200. Catches the "shipped with a
 * broken hero/OG image" bug class — see the 2026-07-02 /learn/ consumer
 * hub regression (heroImage pointed at a 404 path; build green, smoke-200
 * green, but the social-share preview was a 404 image and the browser
 * was preloading a 404). Runs ~30s against the live site. OPT-IN ONLY as
 * of 2026-07-13 — bundled with smoke-200 behind --with-smoke.
 *
 * Smoke base contract (2026-07-20 governance):
 *   - The verifier must never run smoke against the currently-deployed
 *     production site by default. The allowed targets are: (a) the
 *     exact Vercel preview deployment for this candidate (via
 *     MDG_PREVIEW_URL, which must match *.vercel.app), or (b) an
 *     explicit post-deploy production smoke via MDG_ALLOW_PROD_SMOKE=1
 *     + MDG_BASE set to the production URL.
 *   - Anything else: --with-smoke refuses to run and exits 12.
 *
 * Canonical release sequence (combined: PR #219 release-governance protections
 * + OPS-06B evidence-bound gate + GitHub merge-commit topology):
 *   1. `npm run ops:integrate -- --repo-full-name steezkelly/maine-dispensary-guide --pr-number "$PR_NUMBER" --evidence "$EVIDENCE_PATH" --expect-evidence-sha256 "$EVIDENCE_DIGEST" --allow-draft`
 *   2. `node scripts/git/pre-push-verify.cjs --ref="$LOCKED_BASE_SHA" --target="$CANDIDATE_SHA"`
 *   3. `npm run build:isolated`
 *   4. Set BRANCH_NAME, then `git push origin HEAD:refs/heads/$BRANCH_NAME`
 *   5. Wait until Vercel reports Ready for that exact candidate SHA.
 *   6. `MDG_PREVIEW_URL=https://your-exact-preview.vercel.app npm run verify:post-deploy`
 *   7. `gh pr merge "$PR_NUMBER" --merge --match-head-commit "$CANDIDATE_SHA"` (GitHub merge commit; --match-head-commit binds the exact verified candidate head).
 *   8. Post-merge reconciliation: first parent = base, second/reachable parent =
 *      candidate, and `git rev-parse "$FINAL_MAIN_SHA"^{tree}` ==
 *      `git rev-parse "$CANDIDATE_SHA"^{tree}`.
 *   9. Only after merge and exact production deployment readiness:
 *   10. `MDG_ALLOW_PROD_SMOKE=1 MDG_BASE=https://mainedispensaryguide.com npm run verify:post-deploy`
 *
 * Usage:
 *   node scripts/git/pre-push-verify.cjs                                 # DEFAULT (smoke OFF): esbuild parse + astro check filtered + sitemap-postprocess + docs-vs-code + compressed-frontmatter + hero-image-naming
 *   node scripts/git/pre-push-verify.cjs --ref=origin/main               # exact range origin/main..HEAD
 *   node scripts/git/pre-push-verify.cjs --ref="$BASE_SHA" --target="$CANDIDATE_SHA" # immutable exact object range (used by pre-push hook)
 *   MDG_PREVIEW_URL=https://your-exact-preview.vercel.app \
 *     node scripts/git/pre-push-verify.cjs --with-smoke                   # smoke against the exact preview deployment
 *   `--ignore-unrelated` is unsupported and rejected; exact-candidate verification has no scope-bypass flag.
 *   MDG_ALLOW_PROD_SMOKE=1 MDG_BASE=https://mainedispensaryguide.com \
 *     node scripts/git/pre-push-verify.cjs --with-smoke                   # explicit post-deploy production smoke
 *   node scripts/git/pre-push-verify.cjs --fast-only                      # parse-only (~1s)
 *   node scripts/git/pre-push-verify.cjs --data-only                      # parse-only + assertion that every diff hunk
 *                                                                       #     adds only data-* attributes; skips slow astro check.
 *                                                                       #     Exits 11 (violation) or 0 (data-only confirmed).
 *   node scripts/git/pre-push-verify.cjs --skip-smoke-200                 # legacy: still works, see below
 *   node scripts/git/pre-push-verify.cjs --skip-smoke-img-200             # legacy: still works
 *
 * Legacy flag note: --skip-smoke-200 / --skip-smoke-img-200 are deprecated. They still
 * work for callers that pass them, but smoke checks now default OFF; --with-smoke is
 * the canonical opt-in.
 */

const { execSync, spawnSync } = require('child_process');
const crypto = require('node:crypto');
const fs = require('fs');
const path = require('path');
const { GOVERNANCE_TRIGGER_FILES } = require('./release-governance-surfaces.cjs');

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
const NODE_SCRIPT_RE = /\.(cjs|mjs|js)$/;
const REQUIRED_VERIFIER_INPUTS = new Set([
    'apps/maine-cannabis/scripts/image/check-hero-naming.cjs',
    'apps/maine-cannabis/src/data/autoRelatedData.json',
]);
const ANSI_ESCAPE_RE = /\u001B\[[0-?]*[ -/]*[@-~]/g;
function isGovernanceTrigger(filePath) {
    return GOVERNANCE_TRIGGER_FILES.includes(normalizeRepoPath(filePath));
}
function isRequiredVerifierInput(filePath) {
    return REQUIRED_VERIFIER_INPUTS.has(normalizeRepoPath(filePath));
}

/**
 * Resolve the base URL for smoke checks.
 *
 * Returns:
 *   - the resolved base URL string when an acceptable target is configured
 *   - null when the request cannot be honored (caller logs and returns ok:false)
 *
 * Contract (2026-07-20 governance):
 *   - `MDG_PREVIEW_URL` (preferred): a Vercel preview deployment URL, e.g.
 *     https://maine-dispensary-guide-example-sha-steezkellys-projects.vercel.app
 *     This is the only path that pre-transport smoke against an
 *     untrafficked deployment must use, because the URL routes to a
 *     fresh preview deployment created by Vercel for the exact
 *     candidate SHA.
 *   - `MDG_ALLOW_PROD_SMOKE=1` + `MDG_BASE`: an explicit acknowledgement
 *     that the caller intends to smoke the currently-deployed production
 *     host. Required for post-deploy production smoke, forbidden for
 *     pre-transport smoke.
 *   - Anything else (default to mainedispensaryguide.com hostname, or
 *     `MDG_BASE` set without `MDG_ALLOW_PROD_SMOKE=1`): returns null and
 *     the smoke gate reports a remediation hint. This prevents the
 *     pre-transport smoke-against-old-deployment failure mode the
 *     2026-07-20 governance change documented.
 *
 * @returns {string|null}
 */
function resolveSmokeBase() {
    const preview = process.env.MDG_PREVIEW_URL;
    if (preview && /\.vercel\.app$/.test(preview)) {
        return preview;
    }
    if (process.env.MDG_ALLOW_PROD_SMOKE === '1') {
        const base = process.env.MDG_BASE || process.env.MDG_PREVIEW_URL;
        if (base) return base;
    }
    return null;
}

function log(level, msg) {
    const tags = { info: '\x1b[36mi\x1b[0m', ok: '\x1b[32m✓\x1b[0m', warn: '\x1b[33m!\x1b[0m', err: '\x1b[31m✗\x1b[0m' };
    const tag = tags[level] || tags.info;
    console.log(`[pre-push] ${tag} ${msg}`);
}

function git(cmd) {
    return execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8', shell: true }).trim();
}

function gitExec(args) {
    const res = spawnSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' });
    if (res.status !== 0) {
        const err = new Error((res.stderr || res.stdout || `git ${args.join(' ')} failed`).trim());
        err.status = res.status;
        throw err;
    }
    return (res.stdout || '').trim();
}

// Validate a git ref name. The set covers the realistic use cases —
// branch names, commit SHAs, ref paths (refs/heads/main), and standard
// git operators (HEAD~1, HEAD^2). Git itself does stricter validation per
// ref kind, so this is a defense-in-depth filter on the shell-interpolated
// input, not a replacement for git's checks.
function isValidRef(s) {
    return typeof s === 'string' && /^[a-zA-Z0-9._/^~:-]+$/.test(s);
}

const KNOWN_FLAGS = new Set([
    '--fast-only',
    '--data-only',
    '--with-smoke',
    '--skip-smoke-200',
    '--skip-smoke-img-200',
    '--skip-autoRelated-freshness',
    '--skip-sitemap-postprocess',
    '--skip-docs-vs-code',
    '--skip-compressed-frontmatter',
    '--skip-hero-image-naming',
]);

function parseCliArgs(args) {
    let refArg = null;
    let targetArg = 'HEAD';
    let targetExplicit = false;
    for (const arg of args) {
        if (arg.startsWith('--ref=')) {
            if (refArg !== null) throw new Error('Duplicate --ref option.');
            refArg = arg.slice('--ref='.length);
            if (!refArg) throw new Error('--ref requires a value: use --ref=<base>.');
        } else if (arg.startsWith('--target=')) {
            if (targetExplicit) throw new Error('Duplicate --target option.');
            targetArg = arg.slice('--target='.length);
            targetExplicit = true;
            if (!targetArg) throw new Error('--target requires a value: use --target=<candidate>.');
        } else if (!KNOWN_FLAGS.has(arg)) {
            throw new Error(`Unknown option: ${arg || '(empty)'}.`);
        }
    }
    if (targetExplicit && !refArg) throw new Error('--target requires --ref=<base>.');
    for (const [name, value] of [['--ref', refArg], ['--target', targetArg]]) {
        if (value && !isValidRef(value)) {
            throw new Error(`Invalid ${name} value (must match /^[a-zA-Z0-9._/^~:-]+$/): ${value}`);
        }
    }
    return { refArg, targetArg, targetExplicit };
}

function validateExactTarget({ targetArg, targetExplicit }) {
    if (!targetExplicit) return;
    let resolvedTarget;
    let resolvedHead;
    try {
        resolvedTarget = gitExec(['rev-parse', '--verify', `${targetArg}^{commit}`]).trim();
        resolvedHead = gitExec(['rev-parse', '--verify', 'HEAD^{commit}']).trim();
    } catch (error) {
        const targetError = new Error(`could not resolve exact --target=${targetArg}: ${error.message.split('\n')[0]}`);
        targetError.code = 'INVALID_REF';
        throw targetError;
    }
    if (resolvedTarget !== resolvedHead) {
        const targetError = new Error(`--target resolves to ${resolvedTarget}, but the checked-out HEAD is ${resolvedHead}`);
        targetError.code = 'INVALID_REF';
        throw targetError;
    }
    const dirty = gitExec(['status', '--porcelain', '--untracked-files=all']).trim();
    if (dirty) {
        const targetError = new Error('explicit --target verification requires a clean working tree so every checker reads the exact candidate object');
        targetError.code = 'DIRTY_TARGET';
        throw targetError;
    }
}

function resolveDefaultIterationBase(refArg) {
    if (refArg !== null) return refArg;

    let head;
    try {
        head = gitExec(['rev-parse', '--verify', 'HEAD^{commit}']);
    } catch (error) {
        const baseError = new Error(`default verification cannot resolve HEAD: ${error.message.split('\n')[0]}`);
        baseError.code = 'DEFAULT_BASE_UNAVAILABLE';
        throw baseError;
    }

    let originMain;
    try {
        // Resolve the local tracking ref only. Reaching the network here would
        // make iterative verification nondeterministic and unexpectedly slow.
        originMain = gitExec(['rev-parse', '--verify', 'origin/main^{commit}']);
    } catch (error) {
        let hasCommittedHistoryBeyondInitial = false;
        let isShallowRepository = false;
        try {
            gitExec(['rev-parse', '--verify', 'HEAD^']);
            hasCommittedHistoryBeyondInitial = true;
        } catch {}
        try {
            isShallowRepository = gitExec(['rev-parse', '--is-shallow-repository']) === 'true';
        } catch {}
        if (!hasCommittedHistoryBeyondInitial && !isShallowRepository) {
            log('warn', 'origin/main is unavailable in an initial repository; checking live worktree changes only. Fetch origin before verifying committed branch history.');
            return null;
        }
        const baseError = new Error(`default verification requires a resolvable origin/main merge base to verify committed branch history and live worktree changes; fetch origin or pass an explicit --ref=<base>: ${error.message.split('\n')[0]}`);
        baseError.code = 'DEFAULT_BASE_UNAVAILABLE';
        throw baseError;
    }

    try {
        const base = gitExec(['merge-base', 'HEAD', originMain]);
        if (base === head) return null;
        log('info', `auto-detected default diff base: ${base}..${head} (plus live worktree changes)`);
        return base;
    } catch (error) {
        const baseError = new Error(`default verification requires a resolvable origin/main merge base to verify committed branch history and live worktree changes; fetch origin or pass an explicit --ref=<base>: ${error.message.split('\n')[0]}`);
        baseError.code = 'DEFAULT_BASE_UNAVAILABLE';
        throw baseError;
    }
}

function changedFiles(refArg, targetArg = 'HEAD') {
    // Exact-range calls compare <base>..<candidate>. Default iteration on an
    // ahead branch uses its merge-base range and combines staged, unstaged,
    // and untracked trigger files so work in progress cannot be hidden.
    const all = new Set();
    if (refArg) {
        const range = `${refArg}..${targetArg}`;
        try {
            // --no-renames preserves both the deleted source and added
            // destination paths. Required-input or governance removals must
            // not disappear behind Git's single-destination R100 output.
            git(`git diff --no-renames --name-only ${range}`).split('\n').filter(Boolean).forEach(f => all.add(f));
        } catch (e) {
            const message = `could not diff exact range ${range}: ${e.message.split('\n')[0]}`;
            const refError = new Error(message);
            refError.code = 'INVALID_REF';
            throw refError;
        }
    }

    // Only iteration/default HEAD verification includes live working-tree
    // state. An explicit candidate SHA must remain an immutable object range.
    if (!refArg || targetArg === 'HEAD') {
        for (const cmd of ['git diff --no-renames --name-only --cached', 'git diff --no-renames --name-only']) {
            try {
                git(cmd).split('\n').filter(Boolean).forEach(f => all.add(f));
            } catch (_) { /* ignore individual source failure */ }
        }
        try {
            git('git ls-files --others --exclude-standard').split('\n').filter(Boolean).forEach(f => {
                if (ASTRO_FILE_RE.test(f) || TS_FILE_RE.test(f) || isRootNodeScript(f)
                    || isGovernanceTrigger(f) || isRequiredVerifierInput(f)) all.add(f);
            });
        } catch (_) { /* no untracked files */ }
    }

    return [...all].filter(f => ASTRO_FILE_RE.test(f) || TS_FILE_RE.test(f) || isRootNodeScript(f)
        || isGovernanceTrigger(f) || isRequiredVerifierInput(f));
}

function rejectDirtyRangeOverlap(refArg, targetArg = 'HEAD') {
    // A default HEAD verification reads live files. If an uncommitted edit overlays
    // a path in the committed candidate range, it can mask the object being pushed.
    if (!refArg || targetArg !== 'HEAD') return;
    let committed;
    try {
        committed = new Set(git(`git diff --no-renames --name-only ${refArg}..HEAD`).split('\n').filter(Boolean));
    } catch (error) {
        const refError = new Error(`could not diff exact range ${refArg}..HEAD: ${error.message.split('\n')[0]}`);
        refError.code = 'INVALID_REF';
        throw refError;
    }
    const dirty = new Set();
    for (const cmd of ['git diff --no-renames --name-only --cached', 'git diff --no-renames --name-only']) {
        git(cmd).split('\n').filter(Boolean).forEach(file => dirty.add(file));
    }
    const overlap = [...committed].filter(file => dirty.has(file));
    if (overlap.length === 0) return;
    const overlapError = new Error(`default verification refuses a dirty worktree that overlaps committed candidate paths: ${overlap.join(', ')}. Commit, stash, or explicitly verify an immutable --target SHA.`);
    overlapError.code = 'DIRTY_RANGE_OVERLAP';
    throw overlapError;
}

function normalizeRepoPath(filePath) {
    return String(filePath).replace(ANSI_ESCAPE_RE, '').replace(/\\/g, '/').replace(/^\.\//, '');
}

function isRootNodeScript(filePath) {
    const rel = normalizeRepoPath(filePath);
    return NODE_SCRIPT_RE.test(rel) && rel.startsWith('scripts/');
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
        return { ok: false, environmentError: true, errors: [{ file: '(env)', msg: 'esbuild missing' }] };
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
    const appSrcTsFiles = files.filter(f => TS_FILE_RE.test(f) && normalizeRepoPath(f).startsWith('apps/maine-cannabis/src/'));
    const astroCheckFiles = [...astroFiles, ...appSrcTsFiles];
    if (astroCheckFiles.length === 0) {
        log('info', 'no .astro files or app src TS files changed — skipping astro check pass');
        return { ok: true };
    }

    // For the MDG monorepo, the Astro app is apps/maine-cannabis
    const astroApp = path.join(REPO_ROOT, 'apps', 'maine-cannabis');
    if (!fs.existsSync(path.join(astroApp, 'package.json'))) {
        log('err', `required check absent: no Astro app package found at ${astroApp} — push blocked`);
        return { ok: false };
    }

    log('info', `astro check (filtered to ${astroCheckFiles.length} changed Astro/app TS file(s))…`);
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

    // A changed app-source TS module can surface an Astro diagnostic in an
    // unchanged consumer such as a layout. There is no reliable reverse map
    // from that consumer diagnostic to the changed import, so any Astro-check
    // failure while app source TS changed blocks the push rather than silently
    // accepting a potentially introduced type error.
    if (appSrcTsFiles.length > 0) {
        const relevantOutput = output.trim().split('\n').slice(0, 60).join('\n');
        if (relevantOutput) console.log(relevantOutput);
        log('err', 'astro check failed while changed app source TS files may affect Astro consumers — push blocked.');
        return { ok: false };
    }

    // Filter output to lines mentioning normalized changed paths. Astro check
    // reports paths relative to the app cwd, while git paths are repo-relative.
    const normalizedChanged = astroFiles.flatMap(f => {
        const repoRelative = normalizeRepoPath(f);
        const appRelative = repoRelative.startsWith('apps/maine-cannabis/')
            ? repoRelative.slice('apps/maine-cannabis/'.length)
            : repoRelative;
        return [repoRelative, appRelative];
    });
    const relevant = output.split('\n').filter(line => {
        const normalizedLine = normalizeRepoPath(line);
        return normalizedChanged.some(file => {
            const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return new RegExp(`(?:^|[^\\w./-])${escaped}(?::\\d+(?::\\d+)?)?(?:[^\\w./-]|$)`).test(normalizedLine);
        });
    });
    if (relevant.length === 0) {
        log('warn', 'astro check failed but no errors match changed files — pre-existing baseline. Continuing.');
        return { ok: true };
    }
    console.log(relevant.slice(0, 60).join('\n'));
    log('err', `astro check found errors in changed files — push blocked.`);
    return { ok: false };
}

function nodeSyntaxCheck(files) {
    const nodeFiles = files.filter(f => {
        const rel = normalizeRepoPath(f);
        return isRootNodeScript(rel) && fs.existsSync(path.join(REPO_ROOT, rel));
    });
    if (nodeFiles.length === 0) {
        log('info', 'no root Node .cjs/.mjs/.js scripts changed — skipping node --check pass');
        return { ok: true };
    }

    log('info', `node --check on ${nodeFiles.length} root Node script(s)…`);
    const failures = [];
    for (const rel of nodeFiles) {
        const res = spawnSync('node', ['--check', rel], {
            encoding: 'utf8',
            cwd: REPO_ROOT,
            timeout: 30_000,
        });
        const out = ((res.stdout || '') + (res.stderr || '')).trim();
        if (res.status === 0) {
            log('ok', `${rel} — node syntax clean`);
        } else {
            failures.push(rel);
            log('err', `${rel} — node --check failed`);
            if (out) console.log(out.split('\n').slice(0, 12).join('\n'));
        }
    }
    if (failures.length > 0) {
        log('err', `${failures.length} root Node script(s) failed node --check — push blocked.`);
        return { ok: false };
    }
    return { ok: true };
}

function governanceCheck(files) {
    const governanceTriggers = files.filter(isGovernanceTrigger);
    const defaultDiffBaseTest = 'scripts/git/tests/pre-push-verify-default-diff-base.test.cjs';
    const defaultDiffBaseTriggers = files.filter(file => {
        const normalized = normalizeRepoPath(file);
        return normalized === 'scripts/git/pre-push-verify.cjs' || normalized === defaultDiffBaseTest;
    });
    let testPath;
    if (governanceTriggers.length > 0) {
        testPath = path.join(REPO_ROOT, 'scripts', 'git', 'tests', 'pre-push-verify-governance.test.cjs');
        if (!fs.existsSync(testPath)) {
            log('err', `release-governance suite missing at ${testPath} — push blocked`);
            return { ok: false };
        }
    }
    let defaultDiffBaseTestPath;
    if (defaultDiffBaseTriggers.length > 0) {
        defaultDiffBaseTestPath = path.join(REPO_ROOT, defaultDiffBaseTest);
        if (!fs.existsSync(defaultDiffBaseTestPath)) {
            log('err', `default-diff-base regression suite missing at ${defaultDiffBaseTestPath} — push blocked`);
            return { ok: false };
        }
    }

    const suites = [];
    if (governanceTriggers.length > 0) {
        suites.push({
            label: 'release-governance',
            triggerCount: governanceTriggers.length,
            path: testPath,
        });
    }
    if (defaultDiffBaseTriggers.length > 0) {
        suites.push({
            label: 'default-diff-base regression',
            triggerCount: defaultDiffBaseTriggers.length,
            path: defaultDiffBaseTestPath,
        });
    }
    if (suites.length === 0) {
        log('info', 'release-governance suite skipped (no governed files changed)');
        return { ok: true };
    }

    for (const suite of suites) {
        log('info', `${suite.label} suite (${suite.triggerCount} governed file(s) changed)…`);
        const res = spawnSync('node', [suite.path], {
            encoding: 'utf8',
            cwd: REPO_ROOT,
            timeout: 120_000,
        });
        const output = ((res.stdout || '') + (res.stderr || '')).trim();
        if (res.status === 0) {
            if (output) console.log(output);
            log('ok', `${suite.label} suite passed`);
            continue;
        }
        if (output) console.log(output.split('\n').slice(0, 120).join('\n'));
        log('err', `${suite.label} suite failed — push blocked`);
        return { ok: false };
    }
    return { ok: true };
}

/**
 * autoRelatedData freshness check. The relationship-registry data file
 * must exist and match a side-effect-free canonical regeneration when its
 * mtime is older than a changed .astro page. Required-check absent or
 * content-divergent → error string returned; main() routes
 * this to exit code 13. This is a fail-closed replacement for the
 * 2026-07-05 "auto-regen and auto-stage" behavior (which mutated the
 * working tree from inside the verifier).
 *
 * @param {string[]} files changed files from changedFiles()
 * @returns {{ ok: boolean, error: string|null }}
 */
function autoRelatedFreshnessCheck(files) {
    const dataRelativePath = 'apps/maine-cannabis/src/data/autoRelatedData.json';
    const astroPageFiles = files.filter(f => f.includes('apps/maine-cannabis/src/pages/') && ASTRO_FILE_RE.test(f));
    const dataInputChanged = files.some(f => normalizeRepoPath(f) === dataRelativePath);
    if (astroPageFiles.length === 0 && !dataInputChanged) {
        // No page or registry-input change → this gate is irrelevant to the diff.
        return { ok: true, error: null };
    }
    const dataFile = path.join(REPO_ROOT, dataRelativePath);
    if (!fs.existsSync(dataFile)) {
        return {
            ok: false,
            error: `autoRelated-freshness: required data file missing at ${path.relative(REPO_ROOT, dataFile)} — push blocked. Run the dedicated regen-and-stage step before committing.`,
        };
    }
    if (astroPageFiles.length === 0) {
        return { ok: true, error: null };
    }
    let newestPageMtime = 0;
    for (const rel of astroPageFiles) {
        const abs = path.join(REPO_ROOT, rel);
        try {
            const stat = fs.statSync(abs);
            if (stat.mtimeMs > newestPageMtime) newestPageMtime = stat.mtimeMs;
        } catch {}
    }
    const dataStat = fs.statSync(dataFile);
    if (dataStat.mtimeMs >= newestPageMtime) {
        log('ok', `autoRelated-freshness: ${astroPageFiles.length} .astro page file(s) check out — mtime pre-filter confirms data is current`);
        return { ok: true, error: null };
    }

    const regenScript = path.join(REPO_ROOT, 'scripts', 'data', 'regen-auto-related.cjs');
    const regen = spawnSync(process.execPath, [regenScript, '--stdout'], {
        cwd: REPO_ROOT,
        encoding: 'buffer',
        timeout: 30_000,
    });
    if (regen.error || regen.status !== 0) {
        const detail = regen.error?.message || Buffer.from(regen.stderr || '').toString('utf8').trim() || `exit ${regen.status}`;
        return {
            ok: false,
            error: `autoRelated-freshness: canonical regeneration failed (${detail}) — push blocked.`,
        };
    }
    const currentHash = crypto.createHash('sha256').update(fs.readFileSync(dataFile)).digest('hex');
    const regeneratedHash = crypto.createHash('sha256').update(regen.stdout || Buffer.alloc(0)).digest('hex');
    if (currentHash !== regeneratedHash) {
        return {
            ok: false,
            error: `autoRelated-freshness: content divergence detected (${currentHash.slice(0, 12)} != ${regeneratedHash.slice(0, 12)}) — push blocked. Run the dedicated regen-and-stage step before committing.`,
        };
    }
    log('ok', `autoRelated-freshness: ${astroPageFiles.length} .astro page file(s) check out — content hash matches despite older data mtime`);
    return { ok: true, error: null };
}

function smoke200Check() {
    // Pass 3: hit every published page on a verify-target base, fail on any
    // non-200. Wraps scripts/check/smoke-200.cjs (Sprint 77
    // observability). Catches the "build green but specific page 404s" mode.
    // Sprint 78: wire-up.
    //
    // Required smoke base (2026-07-20 governance):
    //   - For pre-transport verification the verifier must never smoke the
    //     currently-deployed production site, because that test cannot
    //     validate the not-yet-deployed candidate.
    //   - MDG_PREVIEW_URL must be set to a Vercel preview deployment URL
    //     (matching *.vercel.app) before --with-smoke is honored.
    //   - MDG_ALLOW_PROD_SMOKE=1 may be set to bypass this guard for an
    //     explicit post-deploy production smoke; this is the only path
    //     that permits the production hostname.
    const smokeScript = path.join(REPO_ROOT, 'scripts', 'check', 'smoke-200.cjs');
    if (!fs.existsSync(smokeScript)) {
        log('err', `required check absent: smoke-200.cjs not found at ${smokeScript} — push blocked.`);
        return { ok: false };
    }

    const base = resolveSmokeBase();
    if (base === null) {
        log('err', '--with-smoke requires MDG_PREVIEW_URL (or MDG_ALLOW_PROD_SMOKE=1 with MDG_BASE set to production). Run `npm run verify:iterate` (smoke-free) instead, or wait for Vercel preview deployment and re-run with MDG_PREVIEW_URL set.');
        return { ok: false };
    }
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

function smokeImg200Check(args) {
    // Pass 4: walk every rendered HTML in dist/, extract every image
    // reference (img src, source srcset, link rel=preload as=image,
    // meta property=og:image), HEAD each same-origin URL against the
    // smoke base, fail on any non-200. Catches the "shipped with a broken
    // hero/OG image" bug class that smoke-200 misses (image requests
    // are client-side, so the page renders 200 even when the image 404s).
    // Added 2026-07-02 after the /learn/ consumer hub regression.
    //
    // Same MDG_PREVIEW_URL / MDG_ALLOW_PROD_SMOKE gate as smoke-200Check.
    const smokeScript = path.join(REPO_ROOT, 'scripts', 'check', 'smoke-img-200.cjs');
    if (!fs.existsSync(smokeScript)) {
        log('err', `required check absent: smoke-img-200.cjs not found at ${smokeScript} — push blocked.`);
        return { ok: false };
    }

    const base = resolveSmokeBase();
    if (base === null) {
        log('err', '--with-smoke requires MDG_PREVIEW_URL (or MDG_ALLOW_PROD_SMOKE=1 with MDG_BASE set to production). Run `npm run verify:iterate` (smoke-free) instead, or wait for Vercel preview deployment and re-run with MDG_PREVIEW_URL set.');
        return { ok: false };
    }
    const ignoreUnrelated = (args || []).includes('--ignore-unrelated');

    const env = { ...process.env, MDG_BASE: base };
    if (ignoreUnrelated) {
        // Derive a substring filter from the current diff: each Astro page that
        // was changed in this push contributes its dist-relative URL to the
        // filter list. Example: a change to apps/maine-cannabis/src/pages/
        // guides/bangor-dispensary-guide.astro → 'guides/bangor-dispensary-guide'
        // substring match against dist/guides/bangor-dispensary-guide/index.html.
        const diffOut = git('git diff --name-only HEAD@{1} HEAD 2>/dev/null || git diff --name-only HEAD~1..HEAD 2>/dev/null || git diff --cached --name-only').split('\n').filter(Boolean);
        const pageSubstrings = new Set();
        for (const rel of diffOut) {
            // apps/maine-cannabis/src/pages/guides/bangor-dispensary-guide.astro
            //   → look for dist/guides/bangor-dispensary-guide/index.html
            const pageMatch = rel.match(/(?:^|\/)pages\/(.+?)(?:\/index)?\.astro$/);
            if (pageMatch) pageSubstrings.add(pageMatch[1]);
        }
        if (pageSubstrings.size > 0) {
            const filter = [...pageSubstrings].join(',');
            env.SMOKE_IMG_FILTER_PAGES = filter;
            log('info', `smoke-img-200 --ignore-unrelated: filter SMOKE_IMG_FILTER_PAGES='${filter}' (${pageSubstrings.size} page(s) from diff)`);
        } else {
            log('info', 'smoke-img-200 --ignore-unrelated: no .astro page changes in diff — running full scan as fallback');
        }
    }

    log('info', `smoke-img-200 against ${base}…`);
    const res = spawnSync('node', [smokeScript], {
        env,
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
        log('err', `required check absent: sitemap-postprocess.test.mjs not found at ${testScript} — push blocked`);
        return { ok: false };
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
        log('err', `required check absent: docs-vs-code.cjs not found at ${lintScript} — push blocked`);
        return { ok: false };
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
        log('err', `required check absent: check-compressed-frontmatter.cjs not found at ${lintScript} — push blocked`);
        return { ok: false };
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

function heroImageNamingCheck() {
    // Pass 9: assert that no hero/infographic file uses a Layout-incompatible
    // suffix (e.g. -1280x720.jpg, -1280w.jpg). Layout.astro lines 101-105 derive
    // the 5 srcset variants purely by string-replace of the trailing `.jpg`,
    // so files with a dimension-suffix silently produce 404 srcset URLs that
    // a build-time check can't catch.
    //
    // The 2026-07-06 COA bug (commit cff15405) was 6 broken srcset refs from a
    // single dimension-suffix upload — this guard makes that class impossible
    // to re-introduce via a plain `git add` upload. Catches the bad pattern at
    // commit time, not at production-smoke time.
    const lintScript = path.join(REPO_ROOT, 'apps', 'maine-cannabis', 'scripts', 'image', 'check-hero-naming.cjs');
    if (!fs.existsSync(lintScript)) {
        log('err', `required check absent: check-hero-naming.cjs not found at ${lintScript} — push blocked`);
        return { ok: false };
    }
    log('info', `hero-image-naming check (Pass 9)…`);
    const res = spawnSync('node', [lintScript], {
        encoding: 'utf8',
        cwd: REPO_ROOT,
        timeout: 30_000,
    });
    const out = ((res.stdout || '') + (res.stderr || '')).trim();
    const tail = out.split('\n').slice(-15).join('\n');
    if (res.status === 0) {
        log('ok', 'hero-image-naming: no Layout-incompatible suffixes');
        return { ok: true };
    }
    log('err', `hero-image-naming: at least one hero/infographic file uses a bad suffix — push blocked.`);
    if (tail) console.log(tail);
    return { ok: false };
}

// Verifier PID used to scope best-effort cleanup to immediate children only.
// Parent scoping prevents termination of unrelated users' tsserver processes.
const VERIFIER_PID = process.pid;

function killOrphanedTsServers() {
  // Never use global `pkill -f tsserver.js`. A parent-scoped call may clean up
  // an immediate child that still exists when this verifier exits; it cannot
  // and does not claim to reap already-reparented descendants.
  try {
    execSync(`pkill -P ${VERIFIER_PID} -f tsserver.js`, { stdio: 'ignore' });
    log('info', 'cleaned up immediate-child tsserver.js process');
  } catch (_) {
    // pkill exit 1 means no immediate child matched.
  }
}

// Best-effort cleanup on the two signals explicitly handled here.
process.on('SIGINT', () => { killOrphanedTsServers(); process.exit(130); });
process.on('SIGTERM', () => { killOrphanedTsServers(); process.exit(143); });

// assertAllDiffsAreDataAttributes -- uses the shared module
// apps/maine-cannabis/scripts/analytics/data-only-assert.cjs
//
// Tests: apps/maine-cannabis/scripts/analytics/test-data-only-assert.cjs
//   (must remain in sync; both rely on the shared module exporting
//    HTML_COMMENT_LINE / INSERTED_DATA_ATTR / etc. via the same surface.)
const dataOnlyAssert = require('../../apps/maine-cannabis/scripts/analytics/data-only-assert.cjs');
const {
    HTML_COMMENT_LINE,
    INSERTED_DATA_ATTR,
    _strip: _plusStrip,
    _lineHasData,
    _isTagOpenLine,
    _isAttrTailLine,
    _isSpacingLine,
    assertDiffText,
} = dataOnlyAssert;

function assertAllDiffsAreDataAttributes(files, refArg, targetArg) {
    const violations = [];
    let attrsCount = 0;
    const diffRange = refArg ? `${refArg}..${targetArg}` : 'HEAD';

    for (const rel of files) {
        if (!rel.match(/\.(astro|cjs|js|css|md|ts)$/)) continue;

        let out;
        try {
            out = gitExec(['diff', '--no-color', diffRange, '--', rel]);
        } catch (_) {
            violations.push(`${rel}: cannot diff — --data-only requires a working tree state`);
            continue;
        }
        if (!out.trim()) continue;

        const r = assertDiffText(out);
        attrsCount += r.attrsCount;
        for (const v of r.violations) {
            violations.push(`${rel}: ${v.line}`);
        }
    }
    return { ok: violations.length === 0, violations, attrsCount };
}

/**
 * OPS-06B-HARDEN-R1 (§6.E): candidate commit/push boundary ownership check.
 * Proves, fail-closed, that the current push is performed by the live owner of
 * the current branch:
 *   - resolves the current branch;
 *   - proves the branch is owned by the exact acquisition_id (unexpired);
 *   - proves the worktree matches the recorded worktree (when recorded);
 *   - proves the expected remote head is unchanged (no drift).
 * Returns { ok: true } or { ok: false, reason }. Never throws.
 */
function branchWriterBoundaryCheck(acquisitionId) {
    try {
        const WRITER = require(path.join(__dirname, 'mdg-branch-writer.cjs'));
        let branch;
        try {
            branch = gitExec(['rev-parse', '--abbrev-ref', 'HEAD']).trim();
        } catch (error) {
            return { ok: false, reason: `cannot determine current branch: ${error.message}` };
        }
        if (!branch || branch === 'HEAD') {
            return { ok: false, reason: 'push boundary requires a named branch (detached HEAD is not owner-verifiable)' };
        }
        const worktree = process.env.MDG_BRANCH_WRITER_WORKTREE || undefined;
        const expectedHead = process.env.MDG_BRANCH_WRITER_EXPECTED_HEAD || undefined;
        WRITER.verifyPushBoundary(REPO_ROOT, {
            branch,
            acquisition_id: acquisitionId,
            worktree,
            expected_remote_head: expectedHead,
        });
        log('ok', `branch-writer push boundary: ${branch} owned by acquisition ${acquisitionId}`);
        return { ok: true };
    } catch (error) {
        return { ok: false, reason: String(error && error.message ? error.message : error) };
    }
}

function main() {
    const args = process.argv.slice(2);
    let options;
    try {
        options = parseCliArgs(args);
    } catch (error) {
        log('err', `${error.message} Exact-range options fail closed.`);
        process.exit(2);
    }
    const { refArg, targetArg } = options;

    const fastOnly = args.includes('--fast-only');
    const dataOnly = args.includes('--data-only');

    log('info', `repo: ${REPO_ROOT}`);

    if (!fs.existsSync(path.join(REPO_ROOT, '.git'))) {
        log('err', 'not a git repository — refusing to run');
        process.exit(3);
    }

    // OPS-06B-HARDEN-R1 (§6.E): candidate commit/push boundary ownership check.
    // SCOPED: active only when MDG_BRANCH_WRITER_ACQUISITION_ID is set (the
    // canonical author-launch wrapper sets it). It never imposes a lock on
    // ordinary non-agent developer work. Proves, fail-closed: current branch,
    // exact acquisition_id, unexpired ownership, and expected remote head
    // unchanged. Exit code 17.
    const bwAcquisition = process.env.MDG_BRANCH_WRITER_ACQUISITION_ID;
    if (bwAcquisition) {
        const bw = branchWriterBoundaryCheck(bwAcquisition);
        if (!bw.ok) process.exit(17);
    }

    let files;
    let effectiveRefArg;
    try {
        validateExactTarget(options);
        effectiveRefArg = resolveDefaultIterationBase(refArg);
        rejectDirtyRangeOverlap(effectiveRefArg, targetArg);
        files = changedFiles(effectiveRefArg, targetArg);
    } catch (error) {
        log('err', `${error.message} — exact-range verification cannot continue.`);
        process.exit(error.code === 'INVALID_REF' ? 2 : 3);
    }
    if (files.length === 0) {
        log('ok', 'no .astro, .ts, root Node script, or governed release files changed — nothing to verify');
        process.exit(0);
    }
    log('info', `changed files: ${files.length}`);
    files.forEach(f => log('info', `  ${f}`));
    console.log();

    // Release governance is the first diff-dependent gate. It must run before
    // autoRelated freshness, fast-only, data-only, or any other early exit so
    // a mixed governance/content diff cannot bypass policy enforcement.
    const governance = governanceCheck(files);
    if (!governance.ok) process.exit(16);

    if (dataOnly && !fastOnly) {
        // Note: --data-only implies cheap-mode behavior (parse-only plus the
        // data-attribute assertion). It's a strict subset of --fast-only for
        // the slow pass, with the additional check that all diff hunks add
        // data-* attributes only.
        log('info', '--data-only: skipping slow astro check (data-attribute additions only)');
    }

    // Inreach pass (2026-07-05 → fail-closed 2026-07-20): the verifier
    // used to auto-regenerate apps/maine-cannabis/src/data/autoRelatedData.json
    // and `git add` it as part of "verification". That is forbidden: a
    // verifier must not mutate the working tree. The correct place for
    // regeneration is a dedicated pre-commit step or a standalone
    // `prepush:data` job, owned by the data-registry lane. The verifier's
    // job here is to fail closed if the data file is missing or stale
    // relative to changed pages.
    //
    // The check is treated as a maintained gate; `--skip-autoRelated-freshness`
    // is the documented bypass for legacy or test-only invocations.
    if (!args.includes('--skip-autoRelated-freshness')) {
        const autoRelatedFreshness = autoRelatedFreshnessCheck(files);
        if (autoRelatedFreshness.error) {
            console.log(`    ${autoRelatedFreshness.error}`);
            log('err', 'autoRelated-freshness: required check absent or stale — push blocked. Run the dedicated regen-and-stage step before committing, do not bypass.');
            process.exit(13);
        }
    } else {
        log('info', 'autoRelated-freshness skipped (--skip-autoRelated-freshness)');
    }

    const fast = fastParseCheck(files);
    if (!fast.ok) process.exit(fast.environmentError ? 3 : 1);
    if (fastOnly || dataOnly) {
        // --data-only implies --fast-only behavior, with the additional
        // data-attribute assertion below.
        log('ok', 'fast pass clean');

        if (dataOnly) {
            const verdict = assertAllDiffsAreDataAttributes(files, effectiveRefArg, targetArg);
            if (!verdict.ok) {
                log('err', '--data-only failed: at least one file changed non-data-attribute content:');
                for (const line of verdict.violations.slice(0, 5)) console.log(`  ${line}`);
                log('info', 'drop --data-only to run the full astro check (slower)');
                process.exit(11);
            }
            log('ok', `--data-only confirmed: all ${verdict.attrsCount} additions are data-* attributes`);
            process.exit(0);
        }

        log('ok', 'fast-only mode — slow pass skipped');
        process.exit(0);
    }

    const nodeSyntax = nodeSyntaxCheck(files);
    if (!nodeSyntax.ok) process.exit(10);

    const slow = slowAstroCheck(files);
    // Sweep any tsserver.js children that slowAstroCheck spawned but
    // didn't reap — see killOrphanedTsServers() for the why. Cheap
    // (~10 ms when nothing matches) and prevents the 2 GB-per-run RAM
    // leak that the 2026-07-13 incident triggered.
    killOrphanedTsServers();
    if (!slow.ok) process.exit(2);

    // Smoke checks default OFF — they hit production URLs and were
    // documented as slow + bandwidth-hungry (GSC_QUERIES_3MO_ACTION_PLAN_2026-07-04.md,
    // Round 103). Iterate-fast uses default; pre-push uses --with-smoke to opt in.
    //
    // --with-smoke contracts (2026-07-20 governance):
    //   - The verifier must never run smoke against the currently-deployed
    //     production site by default. The allowed targets are: (a) the
    //     exact Vercel preview deployment for this candidate (via
    //     MDG_PREVIEW_URL), or (b) an explicit post-deploy production
    //     smoke via MDG_ALLOW_PROD_SMOKE=1.
    //   - resolveSmokeBase() returns null in any other case; the smoke
    //     check reports the remediation hint and returns ok:false.
    //     main() then exits with code 12.
    if (args.includes('--with-smoke')) {
        const smoke = smoke200Check();
        if (!smoke.ok) process.exit(12);
        const smokeImg = smokeImg200Check(args);
        if (!smokeImg.ok) process.exit(12);
    } else if (args.includes('--skip-smoke-200') || args.includes('--skip-smoke-img-200')) {
        // Back-compat: old --skip-* flags still work but emit a deprecation note.
        log('info', '--skip-smoke-* flags are deprecated; smoke checks now default OFF. Use --with-smoke to enable.');
        if (!args.includes('--skip-smoke-200')) {
            const smoke = smoke200Check();
            if (!smoke.ok) process.exit(12);
        }
        if (!args.includes('--skip-smoke-img-200')) {
            const smokeImg = smokeImg200Check(args);
            if (!smokeImg.ok) process.exit(12);
        }
    } else {
        log('info', 'smoke-200 skipped (default; pass --with-smoke + MDG_PREVIEW_URL to enable preview smoke)');
        log('info', 'smoke-img-200 skipped (default; pass --with-smoke + MDG_PREVIEW_URL to enable preview smoke)');
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

    if (!args.includes('--skip-hero-image-naming')) {
        const hin = heroImageNamingCheck();
        if (!hin.ok) process.exit(9);
    } else {
        log('info', 'hero-image-naming skipped (--skip-hero-image-naming)');
    }

    log('ok', 'pre-push verify: clean. Proceed with push.');
    process.exit(0);
}

main();
