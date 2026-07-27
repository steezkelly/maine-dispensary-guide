#!/usr/bin/env node
'use strict';

/**
 * Pre-push verifier governance contracts.
 *
 * Locks four behavior changes from
 * `docs/governance/verifier-governance-migration-notes-2026-07-20.md`:
 *
 *   1. killOrphanedTsServers must be scoped to the verifier's own process
 *      tree, not a global `pkill -f tsserver.js` that affects unrelated
 *      processes owned by other users / agents.
 *   2. The verifier must NOT regenerate generated data files (e.g.
 *      apps/maine-cannabis/src/data/autoRelatedData.json) and `git add`
 *      them as part of running. Generated files should fail the verify
 *      run when stale relative to changed pages; the regen is an
 *      out-of-band step (a dedicated pre-commit hook or a separate
 *      job).
 *   3. Required checks (sitemap-postprocess, docs-vs-code,
 *      compressed-frontmatter, hero-image-naming, autoRelated-freshness)
 *      must FAIL CLOSED when their script is missing, instead of
 *      warn-and-skip with exit 0.
 *   4. `--with-smoke` must REQUIRE `MDG_PREVIEW_URL` (or an explicit
 *      `MDG_ALLOW_PROD_SMOKE=1` allow-list). The pre-transport smoke
 *      against the currently-deployed production site is rejected by
 *      default.
 *
 * Plus one shell-level contract:
 *
 *   5. .githooks/pre-push must exit non-zero when the verifier binary
 *      is absent (refuse silent fall-through).
 *   6. Active operator guidance must not advertise `git push --no-verify`
 *      as a remediation path.
 *   7. Active release guidance must use preview-first, post-transport smoke
 *      and must not prescribe the removed `verify:push` script.
 *   8. Approved workstream specifications and continuity/migration guidance
 *      must stay inside the governed release surface and describe executable,
 *      current behavior rather than retired commands or frozen clocks.
 *
 * Run with: node scripts/git/tests/pre-push-verify-governance.test.cjs
 * Exits 0 if every contract holds; non-zero with diagnostics otherwise.
 */

const assert = require('node:assert/strict');

const { spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Git exports repository-local variables while invoking hooks. Disposable
// fixture repositories must discover their own .git directories instead of
// inheriting the caller's object database/index from the real push.
for (const name of [
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_COMMON_DIR',
  'GIT_DIR',
  'GIT_GRAFT_FILE',
  'GIT_IMPLICIT_WORK_TREE',
  'GIT_INDEX_FILE',
  'GIT_INTERNAL_SUPER_PREFIX',
  'GIT_NO_REPLACE_OBJECTS',
  'GIT_OBJECT_DIRECTORY',
  'GIT_PREFIX',
  'GIT_REPLACE_REF_BASE',
  'GIT_SHALLOW_FILE',
  'GIT_WORK_TREE',
]) {
  delete process.env[name];
}

const ROOT = path.resolve(__dirname, '..', '..', '..');
const VERIFIER = path.join(ROOT, 'scripts/git/pre-push-verify.cjs');
const HOOK = path.join(ROOT, '.githooks/pre-push');
const SURFACE_INVENTORY = path.join(ROOT, 'scripts/git/release-governance-surfaces.cjs');
let sharedInventory = null;
try { sharedInventory = require(SURFACE_INVENTORY); } catch {}
const FALLBACK_REQUIRED_SURFACES = [
  '.github/workflows/ci.yml',
  '.githooks/pre-push',
  'AGENTS.md',
  'CONTEXT.md',
  'MDG_AGENT_HANDBOOK.md',
  'PROJECT_STATE.md',
  'SCRIPTS.md',
  'apps/maine-cannabis/package.json',
  'apps/maine-cannabis/scripts/seo/city-title-rewriter.cjs',
  'docs/README.md',
  'docs/agents/domain.md',
  'docs/governance/AGENT_WORKING_ORDERS.md',
  'docs/governance/mdg-agent-orchestration-v1.md',
  'docs/governance/templates/mdg-integrator-checklist.md',
  'docs/governance/templates/mdg-kanban-card-body.md',
  'docs/governance/templates/mdg-verifier-prompt.md',
  'docs/governance/verifier-governance-migration-notes-2026-07-20.md',
  'docs/superpowers/specs/2026-07-21-mdg-evidence-led-question-expansion-design.md',
  'package.json',
  'project-todos.md',
  'scripts/git/install-hooks.cjs',
  'scripts/git/pre-push-verify.cjs',
];
const ACTIVE_GUIDANCE = sharedInventory?.REQUIRED_GOVERNANCE_SURFACES || FALLBACK_REQUIRED_SURFACES;
const GOVERNANCE_TRIGGER_FILES = sharedInventory?.GOVERNANCE_TRIGGER_FILES || [
  ...FALLBACK_REQUIRED_SURFACES,
  'scripts/git/release-governance-surfaces.cjs',
  'scripts/git/tests/pre-push-verify-governance.test.cjs',
];
const APPROVED_RELEASE_SPECS = Object.freeze([
  'docs/superpowers/specs/2026-07-21-mdg-evidence-led-question-expansion-design.md',
]);

const suiteLabel = `[gov-test ${process.pid}-${Date.now()}-${randomBytes(4).toString('hex')}]`;
let failures = 0;

function logPass(name) {
  console.log(`  ✓ ${suiteLabel} ${name}`);
}
function logFail(name, msg) {
  failures++;
  console.error(`  ✗ ${suiteLabel} ${name}`);
  console.error(`     ${msg}`);
}

function readFileSafe(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}

function containsNoVerifyToken(source) {
  const normalized = String(source)
    .replace(/\\\r?\n/g, '')
    .replace(/\\(?=['"])/g, '')
    .replace(/['"]/g, '')
    .replace(/\s+/g, ' ');
  return normalized.includes('--no-verify');
}

function chmodSafe(file, mode) {
  try { fs.chmodSync(file, mode); } catch {}
}

function testSharedGovernanceSurfaceInventory() {
  const verifier = readFileSafe(VERIFIER);
  const required = new Set(sharedInventory?.REQUIRED_GOVERNANCE_SURFACES || []);
  const triggers = new Set(sharedInventory?.GOVERNANCE_TRIGGER_FILES || []);
  const mandatory = [
    '.github/workflows/ci.yml',
    '.githooks/pre-push',
    'AGENTS.md',
    'CONTEXT.md',
    'MDG_AGENT_HANDBOOK.md',
    'PROJECT_STATE.md',
    'SCRIPTS.md',
    'apps/maine-cannabis/package.json',
    'apps/maine-cannabis/scripts/seo/city-title-rewriter.cjs',
    'docs/README.md',
    'docs/agents/domain.md',
    'docs/governance/AGENT_WORKING_ORDERS.md',
    'docs/governance/mdg-agent-orchestration-v1.md',
    'docs/governance/templates/mdg-integrator-checklist.md',
    'docs/governance/templates/mdg-kanban-card-body.md',
    'docs/governance/templates/mdg-verifier-prompt.md',
    'docs/governance/verifier-governance-migration-notes-2026-07-20.md',
    'docs/superpowers/specs/2026-07-21-mdg-evidence-led-question-expansion-design.md',
    'package.json',
    'project-todos.md',
    'scripts/git/install-hooks.cjs',
    'scripts/git/pre-push-verify.cjs',
  ];
  const sharedModuleIsCanonical = sharedInventory
    && required.size === mandatory.length
    && triggers.size === required.size + 2
    && mandatory.every((relativePath) => required.has(relativePath))
    && [...required].every((relativePath) => triggers.has(relativePath))
    && triggers.has('scripts/git/release-governance-surfaces.cjs')
    && triggers.has('scripts/git/tests/pre-push-verify-governance.test.cjs')
    && /require\(['"]\.\/release-governance-surfaces\.cjs['"]\)/.test(verifier)
    && /GOVERNANCE_TRIGGER_FILES/.test(verifier);

  if (!sharedModuleIsCanonical) {
    logFail('shared governance surface inventory is canonical',
      'Create scripts/git/release-governance-surfaces.cjs, include every required authority/hook/package surface, and import its trigger set in the verifier and this suite.');
    return;
  }
  logPass('shared governance surface inventory is canonical');
}

function testRequiredGovernanceInputsAreReadable() {
  const missing = GOVERNANCE_TRIGGER_FILES.filter((relativePath) => {
    try {
      return !fs.statSync(path.join(ROOT, relativePath)).isFile();
    } catch {
      return true;
    }
  });
  if (missing.length > 0) {
    logFail('required governance inputs are readable',
      `Required governance input(s) missing or unreadable: ${missing.join(', ')}.`);
    return;
  }
  logPass('required governance inputs are readable');
}

const EXPECTED_ROOT_RELEASE_COMMANDS = Object.freeze({
  'verify:iterate': 'node scripts/git/pre-push-verify.cjs',
  'verify:post-deploy': 'node scripts/git/pre-push-verify.cjs --with-smoke',
  'build:isolated': 'node scripts/build/assert-worktree-isolation.cjs && bash vercel-build.sh && node scripts/continuation/tests/ica-built-output.test.cjs',
});
const EXPECTED_APP_RELEASE_COMMANDS = Object.freeze({
  'verify:post-deploy': 'node ../../scripts/git/pre-push-verify.cjs --with-smoke',
});

function packageReleaseCommandsAreExact(rootScripts, appScripts) {
  return Object.entries(EXPECTED_ROOT_RELEASE_COMMANDS)
    .every(([name, command]) => rootScripts[name] === command)
    && Object.entries(EXPECTED_APP_RELEASE_COMMANDS)
      .every(([name, command]) => appScripts[name] === command)
    && !Object.hasOwn(rootScripts, 'verify:push')
    && !Object.hasOwn(appScripts, 'verify:push');
}

function testPackageReleaseCommandsExist() {
  let rootPackage;
  let appPackage;
  try {
    rootPackage = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    appPackage = JSON.parse(fs.readFileSync(path.join(ROOT, 'apps/maine-cannabis/package.json'), 'utf8'));
  } catch (error) {
    logFail('package release commands exist', `Package authority could not be parsed: ${error.message}`);
    return;
  }
  const rootScripts = rootPackage.scripts || {};
  const appScripts = appPackage.scripts || {};
  const invalidMutations = [
    [{ ...rootScripts, 'verify:iterate': `node unsafe.cjs && ${rootScripts['verify:iterate']}` }, appScripts],
    [{ ...rootScripts, 'verify:post-deploy': `node unsafe.cjs && ${rootScripts['verify:post-deploy']}` }, appScripts],
    [{ ...rootScripts, 'verify:post-deploy': 'node scripts/git/pre-push-verify.cjs' }, appScripts],
    [{ ...rootScripts, 'build:isolated': 'bash vercel-build.sh && node scripts/build/assert-worktree-isolation.cjs && node scripts/continuation/tests/ica-built-output.test.cjs' }, appScripts],
    [{ ...rootScripts, 'build:isolated': 'echo assert-worktree-isolation.cjs' }, appScripts],
  ];
  const mutationsRejected = invalidMutations
    .every(([mutatedRoot, mutatedApp]) => !packageReleaseCommandsAreExact(mutatedRoot, mutatedApp));
  const valid = packageReleaseCommandsAreExact(rootScripts, appScripts) && mutationsRejected;
  if (!valid) {
    logFail('package release commands exist',
      `Root/app package authorities must equal the maintained complete command mappings, reject prefixed/dropped/reordered/echo-only stages, and omit the retired smoke-before-push alias. mutations rejected=${mutationsRejected}.`);
    return;
  }
  logPass('package release commands exist');
}

function testScriptsAuthorityDescribesCurrentVerifier() {
  const scripts = readFileSafe(path.join(ROOT, 'SCRIPTS.md'));
  const requiredPasses = [
    /release[- ]governance/i,
    /autoRelated[- ]freshness/i,
    /Node syntax/i,
    /sitemap-postprocess/i,
    /docs-vs-code/i,
    /compressed-frontmatter/i,
    /hero-image-naming/i,
  ];
  const requiredExitCodes = [1, 2, 3, 6, 7, 8, 9, 10, 11, 12, 13, 16];
  const missingPasses = requiredPasses.filter((pattern) => !pattern.test(scripts)).map(String);
  const missingExitCodes = requiredExitCodes.filter((code) => !scripts.includes(`- \`${code}\``));

  if (missingPasses.length || missingExitCodes.length || /Two-pass verification gate/.test(scripts)) {
    logFail('SCRIPTS authority describes the current verifier',
      `missing passes=${missingPasses.join(', ') || 'none'}, missing exit codes=${missingExitCodes.join(', ') || 'none'}, stale two-pass label=${/Two-pass verification gate/.test(scripts)}.`);
    return;
  }
  logPass('SCRIPTS authority describes the current verifier');
}

function testExactRangeArgumentsFailClosedAndUseBaseToHead() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-governance-exact-range-'));
  try {
    const verifierPath = path.join(tempRoot, 'scripts/git/pre-push-verify.cjs');
    const inventoryPath = path.join(tempRoot, 'scripts/git/release-governance-surfaces.cjs');
    const dataOnlyAssertPath = path.join(tempRoot, 'apps/maine-cannabis/scripts/analytics/data-only-assert.cjs');
    const baseOnlyPath = path.join(tempRoot, 'scripts/git/base-only.cjs');
    for (const file of [verifierPath, inventoryPath, dataOnlyAssertPath, baseOnlyPath]) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
    }
    fs.copyFileSync(VERIFIER, verifierPath);
    fs.copyFileSync(SURFACE_INVENTORY, inventoryPath);
    fs.copyFileSync(path.join(ROOT, 'apps/maine-cannabis/scripts/analytics/data-only-assert.cjs'), dataOnlyAssertPath);
    fs.writeFileSync(baseOnlyPath, "'use strict';\n");

    const gitCommands = [
      ['init', '-q'],
      ['config', 'user.name', 'Governance Contract'],
      ['config', 'user.email', 'governance-contract@example.invalid'],
      ['add', '.'],
      ['commit', '-qm', 'baseline'],
    ];
    const setupFailure = gitCommands
      .map((args) => spawnSync('git', args, { cwd: tempRoot, encoding: 'utf8' }))
      .find((result) => result.status !== 0);
    if (setupFailure) {
      logFail('exact-range arguments fail closed and use base..HEAD',
        `Temporary runtime fixture setup failed: ${(setupFailure.stderr || setupFailure.stdout || '').trim()}.`);
      return;
    }

    const baseSha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: tempRoot, encoding: 'utf8' }).stdout.trim();
    const candidateOnlyPath = path.join(tempRoot, 'scripts/git/candidate-only.cjs');
    fs.writeFileSync(candidateOnlyPath, "'use strict';\n");
    spawnSync('git', ['add', 'scripts/git/candidate-only.cjs'], { cwd: tempRoot, encoding: 'utf8' });
    const candidateCommit = spawnSync('git', ['commit', '-qm', 'candidate'], { cwd: tempRoot, encoding: 'utf8' });
    if (candidateCommit.status !== 0) {
      logFail('exact-range arguments fail closed and use base..HEAD',
        `Candidate fixture commit failed: ${(candidateCommit.stderr || candidateCommit.stdout || '').trim()}.`);
      return;
    }
    const candidateSha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: tempRoot, encoding: 'utf8' }).stdout.trim();
    const laterOnlyPath = path.join(tempRoot, 'scripts/git/later-only.cjs');
    fs.writeFileSync(laterOnlyPath, "'use strict';\n");
    spawnSync('git', ['add', 'scripts/git/later-only.cjs'], { cwd: tempRoot, encoding: 'utf8' });
    const laterCommit = spawnSync('git', ['commit', '-qm', 'later'], { cwd: tempRoot, encoding: 'utf8' });
    if (laterCommit.status !== 0) {
      logFail('exact-range arguments fail closed and use base..HEAD',
        `Later fixture commit failed: ${(laterCommit.stderr || laterCommit.stdout || '').trim()}.`);
      return;
    }

    const commonArgs = ['--fast-only', '--skip-autoRelated-freshness'];
    const invalidCases = [
      ['--ref=refs/heads/definitely-missing', ...commonArgs],
      ['--ref=', ...commonArgs],
      ['--ref', ...commonArgs],
      ['--reff=refs/heads/definitely-missing', ...commonArgs],
      ['--reference=refs/heads/definitely-missing', ...commonArgs],
    ].map((args) => {
      const result = spawnSync('node', ['scripts/git/pre-push-verify.cjs', ...args], {
        cwd: tempRoot,
        encoding: 'utf8',
      });
      return { args, result, output: `${result.stdout || ''}${result.stderr || ''}` };
    });
    const invalidPassed = invalidCases.filter(({ result, output }) => result.status !== 2 || !/(?:invalid|unknown|could not diff|requires a value)/i.test(output));

    const rangeResult = spawnSync('node', [
      'scripts/git/pre-push-verify.cjs',
      `--ref=${baseSha}`,
      ...commonArgs,
    ], { cwd: tempRoot, encoding: 'utf8' });
    const rangeOutput = `${rangeResult.stdout || ''}${rangeResult.stderr || ''}`;
    const rangeIsBaseToHead = rangeResult.status === 0
      && /scripts\/git\/candidate-only\.cjs/.test(rangeOutput)
      && /scripts\/git\/later-only\.cjs/.test(rangeOutput)
      && !/scripts\/git\/base-only\.cjs/.test(rangeOutput);
    const headSha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: tempRoot, encoding: 'utf8' }).stdout.trim();
    const targetResult = spawnSync('node', [
      'scripts/git/pre-push-verify.cjs',
      `--ref=${baseSha}`,
      `--target=${headSha}`,
      ...commonArgs,
    ], { cwd: tempRoot, encoding: 'utf8' });
    const targetOutput = `${targetResult.stdout || ''}${targetResult.stderr || ''}`;
    const targetMatchesCleanHead = targetResult.status === 0
      && /scripts\/git\/(?:candidate|later)-only\.cjs/.test(targetOutput)
      && !/scripts\/git\/base-only\.cjs/.test(targetOutput);
    const nonHeadTarget = spawnSync('node', [
      'scripts/git/pre-push-verify.cjs',
      `--ref=${baseSha}`,
      `--target=${candidateSha}`,
      ...commonArgs,
    ], { cwd: tempRoot, encoding: 'utf8' });
    fs.writeFileSync(path.join(tempRoot, 'untracked.txt'), 'dirty\n');
    const dirtyTarget = spawnSync('node', [
      'scripts/git/pre-push-verify.cjs',
      `--ref=${baseSha}`,
      `--target=${headSha}`,
      ...commonArgs,
    ], { cwd: tempRoot, encoding: 'utf8' });
    const exactTargetFailsClosed = nonHeadTarget.status === 2
      && /checked-out HEAD/i.test(`${nonHeadTarget.stdout || ''}${nonHeadTarget.stderr || ''}`)
      && dirtyTarget.status === 3
      && /clean working tree/i.test(`${dirtyTarget.stdout || ''}${dirtyTarget.stderr || ''}`);

    if (invalidPassed.length > 0 || !rangeIsBaseToHead || !targetMatchesCleanHead || !exactTargetFailsClosed) {
      logFail('exact-range arguments fail closed and use base..HEAD',
        `Expected malformed/missing refs to exit 2, full-SHA base to select base..HEAD, and explicit target to require clean checked-out HEAD; invalid cases=${invalidPassed.map(({ args, result }) => `${args[0]}:${result.status}`).join(', ') || 'none'}; range exit=${rangeResult.status}, target exit=${targetResult.status}, non-HEAD exit=${nonHeadTarget.status}, dirty exit=${dirtyTarget.status}.`);
      return;
    }
    logPass('exact-range arguments fail closed and use base..HEAD');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function testMissingEsbuildUsesEnvironmentExitCode() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-governance-esbuild-exit-'));
  try {
    const verifierPath = path.join(tempRoot, 'scripts/git/pre-push-verify.cjs');
    const inventoryPath = path.join(tempRoot, 'scripts/git/release-governance-surfaces.cjs');
    const dataOnlyAssertPath = path.join(tempRoot, 'apps/maine-cannabis/scripts/analytics/data-only-assert.cjs');
    const astroPath = path.join(tempRoot, 'apps/maine-cannabis/src/pages/fixture.astro');
    fs.mkdirSync(path.dirname(verifierPath), { recursive: true });
    fs.mkdirSync(path.dirname(dataOnlyAssertPath), { recursive: true });
    fs.mkdirSync(path.dirname(astroPath), { recursive: true });
    fs.copyFileSync(VERIFIER, verifierPath);
    fs.copyFileSync(SURFACE_INVENTORY, inventoryPath);
    fs.copyFileSync(path.join(ROOT, 'apps/maine-cannabis/scripts/analytics/data-only-assert.cjs'), dataOnlyAssertPath);
    fs.writeFileSync(astroPath, "---\nconst title = 'baseline';\n---\n<h1>{title}</h1>\n");

    const gitCommands = [
      ['init', '-q'],
      ['config', 'user.name', 'Governance Contract'],
      ['config', 'user.email', 'governance-contract@example.invalid'],
      ['add', '.'],
      ['commit', '-qm', 'baseline'],
    ];
    const setupFailure = gitCommands
      .map((args) => spawnSync('git', args, { cwd: tempRoot, encoding: 'utf8' }))
      .find((result) => result.status !== 0);
    if (setupFailure) {
      logFail('missing esbuild uses environment exit code 3',
        `Temporary runtime fixture setup failed: ${(setupFailure.stderr || setupFailure.stdout || '').trim()}.`);
      return;
    }

    fs.writeFileSync(astroPath, "---\nconst title = 'changed';\n---\n<h1>{title}</h1>\n");
    const result = spawnSync('node', [
      'scripts/git/pre-push-verify.cjs',
      '--skip-autoRelated-freshness',
      '--fast-only',
    ], { cwd: tempRoot, encoding: 'utf8' });
    const output = `${result.stdout || ''}${result.stderr || ''}`;
    if (result.status !== 3 || !/esbuild not found/.test(output)) {
      logFail('missing esbuild uses environment exit code 3',
        `Expected executable missing-esbuild fixture to exit 3 with remediation; exit=${result.status}, output=${output.trim()}.`);
      return;
    }
    logPass('missing esbuild uses environment exit code 3');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function testAutoRelatedStaleFileUsesBlockingExit13() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-governance-auto-related-exit-'));
  try {
    const verifierPath = path.join(tempRoot, 'scripts/git/pre-push-verify.cjs');
    const inventoryPath = path.join(tempRoot, 'scripts/git/release-governance-surfaces.cjs');
    const dataOnlyAssertPath = path.join(tempRoot, 'apps/maine-cannabis/scripts/analytics/data-only-assert.cjs');
    const astroPath = path.join(tempRoot, 'apps/maine-cannabis/src/pages/fixture.astro');
    const dataPath = path.join(tempRoot, 'apps/maine-cannabis/src/data/autoRelatedData.json');
    fs.mkdirSync(path.dirname(verifierPath), { recursive: true });
    fs.mkdirSync(path.dirname(dataOnlyAssertPath), { recursive: true });
    fs.mkdirSync(path.dirname(astroPath), { recursive: true });
    fs.mkdirSync(path.dirname(dataPath), { recursive: true });
    const verifierSource = readFileSafe(VERIFIER);
    fs.writeFileSync(verifierPath, verifierSource);
    fs.copyFileSync(SURFACE_INVENTORY, inventoryPath);
    fs.copyFileSync(path.join(ROOT, 'apps/maine-cannabis/scripts/analytics/data-only-assert.cjs'), dataOnlyAssertPath);
    fs.writeFileSync(astroPath, "---\nconst title = 'baseline';\n---\n<h1>{title}</h1>\n");
    fs.writeFileSync(dataPath, '{}\n');

    const gitCommands = [
      ['init', '-q'],
      ['config', 'user.name', 'Governance Contract'],
      ['config', 'user.email', 'governance-contract@example.invalid'],
      ['add', '.'],
      ['commit', '-qm', 'baseline'],
    ];
    const setupFailure = gitCommands
      .map((args) => spawnSync('git', args, { cwd: tempRoot, encoding: 'utf8' }))
      .find((result) => result.status !== 0);
    if (setupFailure) {
      logFail('stale autoRelated data uses blocking exit code 13',
        `Temporary runtime fixture setup failed: ${(setupFailure.stderr || setupFailure.stdout || '').trim()}.`);
      return;
    }

    const staleTime = new Date(Date.now() - 60_000);
    fs.utimesSync(dataPath, staleTime, staleTime);
    fs.writeFileSync(astroPath, "---\nconst title = 'changed';\n---\n<h1>{title}</h1>\n");
    const runVerifier = () => spawnSync('node', [
      'scripts/git/pre-push-verify.cjs',
      '--fast-only',
    ], { cwd: tempRoot, encoding: 'utf8' });
    const baseline = runVerifier();
    const baselineOutput = `${baseline.stdout || ''}${baseline.stderr || ''}`;

    const staleStart = verifierSource.indexOf('if (dataStat.mtimeMs < newestPageMtime)');
    const staleEnd = staleStart < 0 ? -1 : verifierSource.indexOf('\n    }', staleStart);
    const staleBranch = staleStart < 0 || staleEnd < 0 ? '' : verifierSource.slice(staleStart, staleEnd + 6);
    const failOpenBranch = staleBranch.replace('ok: false', 'ok: true').replace(/error:\s*`[^`]+`/, 'error: null');
    const failOpenSource = staleBranch && failOpenBranch !== staleBranch
      ? verifierSource.replace(staleBranch, failOpenBranch)
      : verifierSource;
    fs.writeFileSync(verifierPath, failOpenSource);
    const failOpenMutation = runVerifier();

    fs.writeFileSync(verifierPath, verifierSource.replace('process.exit(13);', 'process.exit(0);'));
    const exitMutation = runVerifier();

    const mutationSound = failOpenSource !== verifierSource
      && failOpenMutation.status !== 13
      && exitMutation.status !== 13;
    if (baseline.status !== 13 || !/is older than at least one changed \.astro page/.test(baselineOutput)
        || !mutationSound) {
      logFail('stale autoRelated data uses blocking exit code 13',
        `Expected stale runtime fixture exit=13 and fail-open/exit mutations to change the result; baseline=${baseline.status}, fail-open=${failOpenMutation.status}, exit mutation=${exitMutation.status}, mutation sound=${mutationSound}.`);
      return;
    }
    logPass('stale autoRelated data uses blocking exit code 13');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

// ----------------------------------------------------------------------------
// Contract 1: killOrphanedTsServers is scoped to immediate verifier children.
//
// This is a source-level safety contract: reject the global
// `pkill -f tsserver.js` form and require a parent-PID restriction. The suite
// intentionally does not launch a competing tsserver process and does not
// claim that immediate-child cleanup can reap reparented descendants.
// ----------------------------------------------------------------------------
function testKillScopedToVerifierProcessTree() {
  const src = readFileSafe(VERIFIER);
  // The legacy global form we are replacing.
  const hasGlobalPkill = /\bpkill\b[^;&]*\b-f\b[^;&]*tsserver\.js/.test(src)
    && !/-P\s*\$\{?[A-Za-z_][A-Za-z0-9_]*\}?/.test(src.match(/\bpkill\b[^;&]*\b-f\b[^;&]*tsserver\.js/)?.[0] || '');
  // The replacement form: parent-scoped kill.
  const hasParentScopedKill =
    /-P\s*(\$\{?[A-Za-z_][A-Za-z0-9_]*\}?)/.test(src) && /tsserver\.js/.test(src);
  const overstatedCleanupClaims = [
    /reparented[^\n]*(?:still reaped|cleanup succeeds)/i,
    /matches descendants only/i,
    /descendant process tree/i,
    /uncaught exception/i,
  ].filter((pattern) => pattern.test(src));

  if (hasGlobalPkill) {
    logFail('kill scoped to verifier process tree',
      `verifier still contains a global pkill match for tsserver.js without a parent-PID restriction. New contract requires -P <pid> scoping.`);
    return;
  }
  if (!hasParentScopedKill || overstatedCleanupClaims.length > 0) {
    logFail('kill scoped to verifier process tree',
      `Verifier must use only a best-effort immediate-child (-P) kill and must not claim reparented-descendant or uncaught-exception cleanup; parent scoped=${hasParentScopedKill}, overstated claims=${overstatedCleanupClaims.length}.`);
    return;
  }
  logPass('kill scoped to verifier process tree');
}

// ----------------------------------------------------------------------------
// Contract 2: verifier refuses to regenerate generated files
//
// RED will fire: the unmodified verifier, when it sees an .astro page
// change, runs `scripts/data/regen-auto-related.cjs` and then
// `git add apps/maine-cannabis/src/data/autoRelatedData.json`. We
// simulate that by grepping the verifier source for the regeneration
// call plus the staged git-add of the data file in the same scope.
// ----------------------------------------------------------------------------
function testVerifierDoesNotRegenerateOrStageGeneratedFiles() {
  const src = readFileSafe(VERIFIER);

  // Old contract: run regen script inside main()
  const runsRegenScript =
    /regen-auto-related\.cjs/.test(src) && /spawnSync\(['"]node['"],\s*\[\s*regenScript\s*\]/.test(src);
  // Old contract: git add the data file
  const stagesDataFile = /git\s+add\s+apps\/maine-cannabis\/src\/data\/autoRelatedData\.json/.test(src);
  // Old contract: silent failure warn-and-continue
  const regenWarnAndContinue = /autoRelated: regen script failed.*verify continues/i.test(src);

  if (runsRegenScript) {
    logFail('verifier refuses to regenerate generated files',
      'verifier still calls regen-auto-related.cjs during verify; move regen to a pre-commit step.');
    return;
  }
  if (stagesDataFile) {
    logFail('verifier refuses to regenerate generated files',
      'verifier still issues `git add apps/maine-cannabis/src/data/autoRelatedData.json`; mutating the working tree from a verifier is forbidden.');
    return;
  }
  if (regenWarnAndContinue) {
    logFail('verifier refuses to regenerate generated files',
      'verifier still warns and continues when regen fails; this is fail-open behavior.');
    return;
  }
  // Positive assertion: the new contract must add an autoRelated freshness
  // check that treats stale data as a fail-closed error.
  const hasFreshnessCheck =
    /autoRelated[A-Za-z]*\s*[a-z]*(?:freshness|stale|staleness)/i.test(src)
    || /stale.*data\b/i.test(src);
  if (!hasFreshnessCheck) {
    logFail('verifier refuses to regenerate generated files',
      'verifier does not appear to add an autoRelated freshness / stale-data check. Required-checks list is missing autoRelated-freshness.');
    return;
  }
  logPass('verifier refuses to regenerate generated files');
}

// ----------------------------------------------------------------------------
// Contract 3: every maintained checker fails closed when its required script,
// data file, or governance suite is missing. Function-specific mutation probes
// make each assertion load-bearing rather than source decoration.
// ----------------------------------------------------------------------------
function testRequiredChecksFailClosedWhenScriptIsMissing() {
  const src = readFileSafe(VERIFIER);
  const requiredChecks = [
    { fn: 'smoke200Check', existsNeedle: 'if (!fs.existsSync(smokeScript))', missingLabel: 'required check absent: smoke-200.cjs' },
    { fn: 'smokeImg200Check', existsNeedle: 'if (!fs.existsSync(smokeScript))', missingLabel: 'required check absent: smoke-img-200.cjs' },
    { fn: 'autoRelatedFreshnessCheck', existsNeedle: 'if (!fs.existsSync(dataFile))', missingLabel: 'required data file missing', requireLog: false },
    { fn: 'governanceCheck', existsNeedle: 'if (!fs.existsSync(testPath))', missingLabel: 'release-governance suite missing' },
    { fn: 'slowAstroCheck', existsNeedle: "if (!fs.existsSync(path.join(astroApp, 'package.json')))", missingLabel: 'required check absent: no Astro app package' },
    { fn: 'sitemapPostprocessCheck', existsNeedle: 'if (!fs.existsSync(testScript))', missingLabel: 'required check absent: sitemap-postprocess.test.mjs' },
    { fn: 'docsVsCodeCheck', existsNeedle: 'if (!fs.existsSync(lintScript))', missingLabel: 'required check absent: docs-vs-code.cjs' },
    { fn: 'compressedFrontmatterCheck', existsNeedle: 'if (!fs.existsSync(lintScript))', missingLabel: 'required check absent: check-compressed-frontmatter.cjs' },
    { fn: 'heroImageNamingCheck', existsNeedle: 'if (!fs.existsSync(lintScript))', missingLabel: 'required check absent: check-hero-naming.cjs' },
  ];
  const failures = [];

  const branchFailsClosed = (branch, check) => /return\s*\{\s*ok:\s*false/.test(branch)
    && (check.requireLog === false || /log\(['"]err['"]/.test(branch))
    && branch.includes(check.missingLabel);

  for (const check of requiredChecks) {
    const start = src.indexOf(`function ${check.fn}(`);
    const next = start === -1 ? -1 : src.indexOf('\nfunction ', start + 1);
    const body = start === -1 ? '' : src.slice(start, next === -1 ? src.length : next);
    const branchStart = body.indexOf(check.existsNeedle);
    const branchTail = branchStart < 0 ? '' : body.slice(branchStart);
    const branchEnd = branchTail.indexOf('\n    }');
    const branch = branchEnd < 0 ? '' : branchTail.slice(0, branchEnd);
    const mutations = [branch.replace(/ok:\s*false/, 'ok: true')];
    if (check.requireLog === false) {
      mutations.push(branch.replace(check.missingLabel, 'missing-check-allowed'));
    } else {
      mutations.push(branch.replace(/log\(['"]err['"]/, "log('warn'"));
    }
    const mutationsRejected = mutations.every((mutation) => mutation !== branch && !branchFailsClosed(mutation, check));
    if (!branchFailsClosed(branch, check) || !mutationsRejected) failures.push(check.fn);
  }

  if (failures.length > 0) {
    logFail('required checks fail closed when missing',
      `Missing-input branches are still fail-open or lack required-check remediation in: ${failures.join(', ')}.`);
    return;
  }
  logPass('required checks fail closed when missing');
}

function testPublicVerifierSeesDeletedRequiredInputs() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-governance-required-input-'));
  try {
    const verifierPath = path.join(tempRoot, 'scripts/git/pre-push-verify.cjs');
    const inventoryPath = path.join(tempRoot, 'scripts/git/release-governance-surfaces.cjs');
    const dataOnlyAssertPath = path.join(tempRoot, 'apps/maine-cannabis/scripts/analytics/data-only-assert.cjs');
    const heroCheckerPath = path.join(tempRoot, 'apps/maine-cannabis/scripts/image/check-hero-naming.cjs');
    const dataPath = path.join(tempRoot, 'apps/maine-cannabis/src/data/autoRelatedData.json');
    for (const file of [verifierPath, inventoryPath, dataOnlyAssertPath, heroCheckerPath, dataPath]) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
    }
    fs.copyFileSync(VERIFIER, verifierPath);
    fs.copyFileSync(SURFACE_INVENTORY, inventoryPath);
    fs.copyFileSync(path.join(ROOT, 'apps/maine-cannabis/scripts/analytics/data-only-assert.cjs'), dataOnlyAssertPath);
    fs.writeFileSync(heroCheckerPath, "process.exit(0);\n");
    fs.writeFileSync(dataPath, '{}\n');

    const gitCommands = [
      ['init', '-q'],
      ['config', 'user.name', 'Governance Contract'],
      ['config', 'user.email', 'governance-contract@example.invalid'],
      ['add', '.'],
      ['commit', '-qm', 'baseline'],
    ];
    const setupFailure = gitCommands
      .map((args) => spawnSync('git', args, { cwd: tempRoot, encoding: 'utf8' }))
      .find((result) => result.status !== 0);
    if (setupFailure) {
      logFail('public verifier sees deleted required inputs',
        `Temporary runtime fixture setup failed: ${(setupFailure.stderr || setupFailure.stdout || '').trim()}.`);
      return;
    }

    fs.rmSync(heroCheckerPath);
    const heroResult = spawnSync('node', [
      'scripts/git/pre-push-verify.cjs',
      '--skip-autoRelated-freshness',
      '--skip-sitemap-postprocess',
      '--skip-docs-vs-code',
      '--skip-compressed-frontmatter',
    ], { cwd: tempRoot, encoding: 'utf8' });
    const heroOutput = `${heroResult.stdout || ''}${heroResult.stderr || ''}`;

    spawnSync('git', ['checkout', '--', 'apps/maine-cannabis/scripts/image/check-hero-naming.cjs'], {
      cwd: tempRoot,
      encoding: 'utf8',
    });
    fs.rmSync(dataPath);
    const dataResult = spawnSync('node', [
      'scripts/git/pre-push-verify.cjs',
      '--fast-only',
    ], { cwd: tempRoot, encoding: 'utf8' });
    const dataOutput = `${dataResult.stdout || ''}${dataResult.stderr || ''}`;

    const valid = heroResult.status === 9
      && /required check absent: check-hero-naming\.cjs/.test(heroOutput)
      && dataResult.status === 13
      && /required data file missing/.test(dataOutput);
    if (!valid) {
      logFail('public verifier sees deleted required inputs',
        `Expected public deletion probes to block hero=9 and data=13; hero exit=${heroResult.status}, output=${heroOutput.trim()}; data exit=${dataResult.status}, output=${dataOutput.trim()}.`);
      return;
    }
    logPass('public verifier sees deleted required inputs');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function testPublicVerifierSeesRenamedRequiredInputs() {
  const scenarios = [
    {
      source: 'apps/maine-cannabis/scripts/image/check-hero-naming.cjs',
      destination: 'apps/maine-cannabis/scripts/image/check-hero-naming-retired.cjs',
      expectedStatus: 9,
      args: [
        '--skip-autoRelated-freshness',
        '--skip-sitemap-postprocess',
        '--skip-docs-vs-code',
        '--skip-compressed-frontmatter',
      ],
    },
    {
      source: 'apps/maine-cannabis/src/data/autoRelatedData.json',
      destination: 'apps/maine-cannabis/src/data/autoRelatedData-retired.json',
      expectedStatus: 13,
      args: ['--fast-only'],
    },
    {
      source: 'AGENTS.md',
      destination: 'AGENTS-retired.md',
      expectedStatus: 16,
      args: ['--fast-only', '--skip-autoRelated-freshness'],
    },
  ];

  const failures = [];
  for (const scenario of scenarios) {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-governance-required-rename-'));
    try {
      const fixtureFiles = {
        'scripts/git/pre-push-verify.cjs': readFileSafe(VERIFIER),
        'scripts/git/release-governance-surfaces.cjs': readFileSafe(SURFACE_INVENTORY),
        'apps/maine-cannabis/scripts/analytics/data-only-assert.cjs': readFileSafe(
          path.join(ROOT, 'apps/maine-cannabis/scripts/analytics/data-only-assert.cjs'),
        ),
        'apps/maine-cannabis/scripts/image/check-hero-naming.cjs': "#!/usr/bin/env node\n'use strict';\nprocess.exit(0);\n",
        'apps/maine-cannabis/src/data/autoRelatedData.json': '{}\n',
        'AGENTS.md': '# governed fixture\n',
        'package.json': '{"private":true,"workspaces":["apps/*"]}\n',
      };
      for (const [relativePath, content] of Object.entries(fixtureFiles)) {
        const absolutePath = path.join(tempRoot, relativePath);
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
        fs.writeFileSync(absolutePath, content);
      }
      const setup = [
        ['init', '-q'],
        ['config', 'user.name', 'Governance Contract'],
        ['config', 'user.email', 'governance-contract@example.invalid'],
        ['add', '.'],
        ['commit', '-qm', 'baseline'],
      ].map((args) => spawnSync('git', args, { cwd: tempRoot, encoding: 'utf8' }))
        .find((result) => result.status !== 0);
      if (setup) {
        failures.push(`${scenario.source}: setup failed`);
        continue;
      }
      const baseSha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: tempRoot, encoding: 'utf8' }).stdout.trim();
      fs.renameSync(path.join(tempRoot, scenario.source), path.join(tempRoot, scenario.destination));
      spawnSync('git', ['add', '-A'], { cwd: tempRoot, encoding: 'utf8' });
      const commit = spawnSync('git', ['commit', '-qm', `rename ${path.basename(scenario.source)}`], {
        cwd: tempRoot,
        encoding: 'utf8',
      });
      if (commit.status !== 0) {
        failures.push(`${scenario.source}: rename commit failed`);
        continue;
      }
      const targetSha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: tempRoot, encoding: 'utf8' }).stdout.trim();
      const result = spawnSync('node', [
        'scripts/git/pre-push-verify.cjs',
        `--ref=${baseSha}`,
        `--target=${targetSha}`,
        ...scenario.args,
      ], { cwd: tempRoot, encoding: 'utf8' });
      if (result.status !== scenario.expectedStatus) {
        const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
        failures.push(`${scenario.source}: expected ${scenario.expectedStatus}, got ${result.status}; ${output}`);
      }
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  }

  if (failures.length > 0) {
    logFail('public verifier sees renamed required inputs', failures.join(' | '));
    return;
  }
  logPass('public verifier sees renamed required inputs');
}

// ----------------------------------------------------------------------------
// Contract 4: --with-smoke requires MDG_PREVIEW_URL (refuses production
// pre-transport smoke by default).
//
// RED will fire: the unmodified verifier resolves `MDG_BASE` and
// `MDG_PREVIEW_URL` and falls back to `https://mainedispensaryguide.com`
// for `--with-smoke`. We instead require MDG_PREVIEW_URL to be set
// when --with-smoke is passed.
// ----------------------------------------------------------------------------
function testWithSmokeRequiresPreviewUrl() {
  const src = readFileSafe(VERIFIER);

  // Negative: the legacy `https://mainedispensaryguide.com` default
  // must not be used as a fallback for --with-smoke. We allow it to
  // remain as a literal elsewhere (logs, comments), but the
  // production-default-as-fallback site must be gone.
  const hasProductionDefault =
    /MDG_BASE[\s\S]{0,200}https:\/\/mainedispensaryguide\.com/.test(src)
    && /mdg[-_a-z]*base[\s\S]{0,200}fallback/i.test(src);
  // Positive: there must be a guard that --with-smoke requires
  // MDG_PREVIEW_URL.
  const requiresPreviewUrl =
    /MDG_PREVIEW_URL[\s\S]{0,200}(?:required|required|missing|not set|set\b|must)/i.test(src)
    || /--with-smoke[\s\S]{0,200}MDG_PREVIEW_URL/i.test(src);

  if (hasProductionDefault) {
    logFail('--with-smoke refuses to smoke the currently-deployed production site',
      'verifier still falls back to https://mainedispensaryguide.com when MDG_BASE is unset; pre-transport smoke against the old deployment is forbidden by default.');
    return;
  }
  if (!requiresPreviewUrl) {
    logFail('--with-smoke refuses to smoke the currently-deployed production site',
      'verifier does not appear to require MDG_PREVIEW_URL for --with-smoke. Production smoke against the new candidate requires an explicit preview URL.');
    return;
  }
  logPass('--with-smoke refuses to smoke the currently-deployed production site');
}

// ----------------------------------------------------------------------------
// Contract 5: .githooks/pre-push refuses to silently fall through when
// the verifier binary is missing.
//
// RED will fire: the unmodified hook prints a warning and exits 0 when
// $VERIFY is missing.
// ----------------------------------------------------------------------------
function testHookVerifiesEveryExactLocalSha() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-governance-hook-exact-'));
  try {
    const hookPath = path.join(tempRoot, '.githooks/pre-push');
    const verifierPath = path.join(tempRoot, 'scripts/git/pre-push-verify.cjs');
    const capturePath = path.join(tempRoot, 'hook-calls.jsonl');
    fs.mkdirSync(path.dirname(hookPath), { recursive: true });
    fs.mkdirSync(path.dirname(verifierPath), { recursive: true });
    fs.copyFileSync(HOOK, hookPath);
    fs.writeFileSync(verifierPath, [
      '#!/usr/bin/env node',
      "'use strict';",
      "require('fs').appendFileSync(process.env.MDG_HOOK_CAPTURE, `${JSON.stringify(process.argv.slice(2))}\\n`);",
      '',
    ].join('\n'));
    chmodSafe(hookPath, 0o755);
    chmodSafe(verifierPath, 0o755);
    const setup = [
      ['init', '-q'],
      ['config', 'user.name', 'Governance Contract'],
      ['config', 'user.email', 'governance-contract@example.invalid'],
      ['add', '.'],
      ['commit', '-qm', 'baseline'],
    ].map((args) => spawnSync('git', args, { cwd: tempRoot, encoding: 'utf8' }))
      .find((result) => result.status !== 0);
    if (setup) {
      logFail('pre-push hook verifies every exact local SHA',
        `Temporary hook fixture setup failed: ${(setup.stderr || setup.stdout || '').trim()}.`);
      return;
    }

    const zeros = '0'.repeat(40);
    const headSha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: tempRoot, encoding: 'utf8' }).stdout.trim();
    const remoteOne = '2'.repeat(40);
    const remoteTwo = '4'.repeat(40);
    const stdin = [
      `refs/heads/one ${headSha} refs/heads/one ${remoteOne}`,
      `refs/heads/two ${headSha} refs/heads/two ${remoteTwo}`,
      `refs/heads/deleted ${zeros} refs/heads/deleted ${remoteTwo}`,
      '',
    ].join('\n');
    const env = { ...process.env, MDG_HOOK_CAPTURE: capturePath };
    const result = spawnSync('bash', ['.githooks/pre-push', 'origin', 'example.invalid'], {
      cwd: tempRoot,
      encoding: 'utf8',
      input: stdin,
      env,
    });
    const calls = readFileSafe(capturePath).trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
    const exactCalls = calls.length === 2
      && JSON.stringify(calls[0]) === JSON.stringify([`--ref=${remoteOne}`, `--target=${headSha}`])
      && JSON.stringify(calls[1]) === JSON.stringify([`--ref=${remoteTwo}`, `--target=${headSha}`]);

    fs.rmSync(capturePath, { force: true });
    const nonHeadSha = '1'.repeat(40);
    const nonHead = spawnSync('bash', ['.githooks/pre-push', 'origin', 'example.invalid'], {
      cwd: tempRoot,
      encoding: 'utf8',
      input: `refs/heads/non-head ${nonHeadSha} refs/heads/non-head ${remoteOne}\n`,
      env,
    });
    const nonHeadFailedClosed = nonHead.status !== 0 && !fs.existsSync(capturePath);

    fs.rmSync(capturePath, { force: true });
    const newBranch = spawnSync('bash', ['.githooks/pre-push', 'origin', 'example.invalid'], {
      cwd: tempRoot,
      encoding: 'utf8',
      input: `refs/heads/new ${headSha} refs/heads/new ${zeros}\n`,
      env,
    });
    const newBranchFailedClosed = newBranch.status !== 0 && !fs.existsSync(capturePath);

    if (result.status !== 0 || !exactCalls || !nonHeadFailedClosed || !newBranchFailedClosed) {
      logFail('pre-push hook verifies every exact local SHA',
        `Expected one --ref=<remote-sha> --target=<checked-out-head-sha> call per non-deletion update, non-HEAD pushes to fail closed, and a fail-closed new-branch policy; existing exit=${result.status}, calls=${JSON.stringify(calls)}, non-HEAD exit=${nonHead.status}, new-branch exit=${newBranch.status}.`);
      return;
    }
    logPass('pre-push hook verifies every exact local SHA');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function testHookFailsClosedWhenVerifierMissing() {
  // We can't easily move the real verify file without affecting other
  // tests in the suite. Instead, point the hook at a definitely-absent
  // path via env and verify the hook's "missing" branch behavior.
  // The hook currently uses $VERIFY which is set inside the script,
  // not the env, so the safe way to make $VERIFY missing is to
  // temporarily delete /usr/local/bin/node… actually no. We use a
  // different approach: invoke the hook with `bash` and inject a
  // pre-step that unsets the script's verifier by replacing the file
  // path arithmetic. Simpler: just inspect the hook source for the
  // fail-closed contract — same approach as contract 1/3.
  //
  // We do this by source-text assertion: there must be a path that,
  // upon missing the verifier, exits 1 and emits a remediation hint.
  const src = readFileSafe(HOOK);
  const failsClosedOnMissing =
    /verify[\s\S]*?not found[\s\S]*?exit\s+1/i.test(src);

  if (!failsClosedOnMissing) {
    logFail('.githooks/pre-push fails closed when verifier is missing',
      '.githooks/pre-push does not emit `exit 1` (or equivalent non-zero) when the verifier binary is missing. Old contract: `exit 0` with a warning, which silently drops the gate.');
    return;
  }
  logPass('.githooks/pre-push fails closed when verifier is missing');
}

// ----------------------------------------------------------------------------
// Contract 7: canonical verifier usage does not advertise partial smoke as a
// release-gate shortcut. The legacy `--ignore-unrelated` behavior may remain
// for compatibility, but operator-facing command examples must require the
// full exact-candidate smoke scan.
// ----------------------------------------------------------------------------
function testVerifierUsageDoesNotAdvertiseIgnoreUnrelated() {
  const src = readFileSafe(VERIFIER);
  const usageMatch = src.match(/\* Usage:[\s\S]*?\*\//);
  const usageBlock = usageMatch ? usageMatch[0] : '';
  const advertisesPartialSmoke = usageBlock
    .split('\n')
    .some((line) => /node\s+scripts\/git\/pre-push-verify\.cjs[^\n]*--ignore-unrelated/.test(line));

  if (advertisesPartialSmoke) {
    logFail('verifier usage does not advertise `--ignore-unrelated`',
      'pre-push-verify.cjs still publishes a partial-smoke command as canonical usage. Release guidance must require the full exact-candidate smoke scan.');
    return;
  }
  logPass('verifier usage does not advertise `--ignore-unrelated`');
}

// ----------------------------------------------------------------------------
// Contract 6: install-hooks.cjs contains no hook-bypass token.
//
// The contract is: install-hooks.cjs must NOT contain the legacy advisory
// "To skip the hook in an emergency: git push --no-verify" or any other
// text that names the bypass token. Active guidance uses a zero-token policy
// so unrelated negation cannot accidentally bless a copyable bypass command.
//
// RED will fire: the unmodified installer prints
// "To skip the hook in an emergency: git push --no-verify".
// ----------------------------------------------------------------------------
function testInstallHooksDoesNotTeachNoVerify() {
  const src = readFileSafe(path.join(ROOT, 'scripts/git/install-hooks.cjs'));
  const teachesNoVerify = containsNoVerifyToken(src);

  if (teachesNoVerify) {
    logFail('install-hooks.cjs does not teach `git push --no-verify` as a bypass',
      'install-hooks.cjs still recommends `--no-verify` as a remediation. Replace with "fix the verifier and retry" guidance.');
    return;
  }
  logPass('install-hooks.cjs does not teach `git push --no-verify` as a bypass');
}

// ----------------------------------------------------------------------------
// Contract 8: active operator guidance does not teach hook bypasses.
//
// Historical records may document old behavior, but active command/reference
// docs must not contain the bypass token at all. A zero-token policy avoids
// ambiguity from unrelated negation or wrapped shell commands.
// ----------------------------------------------------------------------------
function testActiveGuidanceDoesNotTeachNoVerify() {
  const violations = ACTIVE_GUIDANCE
    .filter((relativePath) => containsNoVerifyToken(readFileSafe(path.join(ROOT, relativePath))));

  if (violations.length > 0) {
    logFail('active operator guidance does not teach `git push --no-verify`',
      `Active guidance contains the forbidden --no-verify token in: ${violations.join(', ')}. Replace it with fail-closed repair-and-retry guidance.`);
    return;
  }
  logPass('active operator guidance does not teach `git push --no-verify`');
}

function testNoVerifyClassifierRejectsAdversarialForms() {
  const unsafe = [
    'Do not rerun the verifier; use git push --no-verify in an emergency.',
    'git push \\\n       --no-verify',
    'git push --no-\\\nverify',
    'git push --no-"verify"',
    "git push --no-'verify'",
    'git push --no-\\"verify\\"',
  ];
  const safe = [
    'Never bypass the hook; repair the verifier and retry.',
    'Hook failures are release blockers.',
  ];
  const missedUnsafe = unsafe.filter((sample) => !containsNoVerifyToken(sample));
  const rejectedSafe = safe.filter((sample) => containsNoVerifyToken(sample));

  if (missedUnsafe.length > 0 || rejectedSafe.length > 0) {
    logFail('no-verify classifier rejects adversarial command forms',
      `Classifier missed ${missedUnsafe.length} unsafe fixture(s) and rejected ${rejectedSafe.length} safe fixture(s).`);
    return;
  }
  logPass('no-verify classifier rejects adversarial command forms');
}

function verifierRunsBlockingGovernanceFirst(verifier) {
  const mainStart = verifier.indexOf('function main()');
  const mainEnd = verifier.lastIndexOf('\nmain();');
  const mainBody = mainStart < 0 || mainEnd < mainStart ? '' : verifier.slice(mainStart, mainEnd);
  const callNeedle = 'const governance = governanceCheck(files);';
  const blockNeedle = 'if (!governance.ok) process.exit(16);';
  const callIndex = mainBody.indexOf(callNeedle);
  const freshnessIndex = mainBody.indexOf("if (!args.includes('--skip-autoRelated-freshness'))");
  const callCount = [...mainBody.matchAll(/\bgovernanceCheck\(files\)/g)].length;
  const blockingPair = new RegExp(`${callNeedle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*${blockNeedle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
    .test(mainBody);
  return callCount === 1 && callIndex >= 0 && freshnessIndex >= 0
    && callIndex < freshnessIndex && blockingPair;
}

function testCanonicalGatesRunGovernanceSuite() {
  const verifier = readFileSafe(VERIFIER);
  const ci = readFileSafe(path.join(ROOT, '.github/workflows/ci.yml'));
  const verifierUsesSharedTriggers = /require\(['"]\.\/release-governance-surfaces\.cjs['"]\)/.test(verifier)
    && /GOVERNANCE_TRIGGER_FILES\.includes\(normalizeRepoPath\(filePath\)\)/.test(verifier)
    && /files\.filter\(isGovernanceTrigger\)/.test(verifier);
  const sharedTriggersCoverRequiredSurfaces = ACTIVE_GUIDANCE
    .every((relativePath) => GOVERNANCE_TRIGGER_FILES.includes(relativePath));
  const verifierRunsSuite = verifierRunsBlockingGovernanceFirst(verifier)
    && /pre-push-verify-governance\.test\.cjs/.test(verifier);
  const invalidMutations = [
    verifier.replace('if (!governance.ok) process.exit(16);', 'governance.ok;'),
    verifier.replace('const governance = governanceCheck(files);', 'const governance = { ok: true };'),
  ];
  const mutationsRejected = invalidMutations
    .every((mutation) => mutation !== verifier && !verifierRunsBlockingGovernanceFirst(mutation));
  const ciRunsSuite = /node\s+scripts\/git\/tests\/pre-push-verify-governance\.test\.cjs/.test(ci);

  if (!verifierUsesSharedTriggers || !sharedTriggersCoverRequiredSurfaces || !verifierRunsSuite
      || !mutationsRejected || !ciRunsSuite) {
    logFail('canonical gates execute the governance suite',
      `shared pre-push triggers=${verifierUsesSharedTriggers}, required-surface coverage=${sharedTriggersCoverRequiredSurfaces}, one blocking pre-push execution before diff-dependent exits=${verifierRunsSuite}, blocking mutations rejected=${mutationsRejected}, CI execution=${ciRunsSuite}.`);
    return;
  }
  logPass('canonical gates execute the governance suite');
}

function isPreviewFirstReleaseGuidance(section) {
  // Combined canonical sequence (PR #219 release-governance protections +
  // OPS-06B evidence-bound gate + GitHub merge-commit topology). The ordering
  // contract: evidence-bound gate → exact-target verify → isolated build →
  // normal push → exact-SHA Vercel Ready → preview smoke → merge commit →
  // post-merge reconciliation → production readiness → production smoke.
  const markers = {
    opsGate: section.indexOf('npm run ops:integrate'),
    exactTarget: section.indexOf('node scripts/git/pre-push-verify.cjs --ref="$LOCKED_BASE_SHA" --target="$CANDIDATE_SHA"'),
    isolatedBuild: section.indexOf('npm run build:isolated'),
    normalPush: section.indexOf('git push origin HEAD:refs/heads/$BRANCH_NAME'),
    exactReady: section.search(/Vercel reports Ready for that exact (?:candidate|pushed) SHA/i),
    previewSmoke: section.indexOf('MDG_PREVIEW_URL=https://your-exact-preview.vercel.app npm run verify:post-deploy'),
    mergeCommit: section.search(/gh pr merge[^\n]*--merge/i),
    reconciliation: section.search(/[Pp]ost-merge reconciliation/),
    mergeReady: section.search(/only after merge and exact production deployment readiness/i),
    productionSmoke: section.indexOf('MDG_ALLOW_PROD_SMOKE=1 MDG_BASE=https://mainedispensaryguide.com npm run verify:post-deploy'),
  };
  const ordered = [
    markers.opsGate,
    markers.exactTarget,
    markers.isolatedBuild,
    markers.normalPush,
    markers.exactReady,
    markers.previewSmoke,
    markers.mergeCommit,
    markers.reconciliation,
    markers.mergeReady,
    markers.productionSmoke,
  ];
  const smokeCommands = [...section.matchAll(/(?:node\s+scripts\/git\/pre-push-verify\.cjs[^\n]*--with-smoke|npm\s+run\s+verify:post-deploy)/g)]
    .map((match) => match.index);
  const earlySmokeCommand = smokeCommands.some((index) => index < markers.exactReady);
  return ordered.every((index) => index >= 0)
    && ordered.every((index, position) => position === 0 || index > ordered[position - 1])
    && !earlySmokeCommand;
}

function testActiveReleaseGuidanceIsPreviewFirst() {
  const agents = readFileSafe(path.join(ROOT, 'AGENTS.md'));
  const verifySection = agents.match(/### Verify cycle[\s\S]*?(?=### Autonomous worktree protocol)/i)?.[0] || '';
  const integratorChecklist = readFileSafe(path.join(ROOT, 'docs/governance/templates/mdg-integrator-checklist.md'));
  const orchestration = readFileSafe(path.join(ROOT, 'docs/governance/mdg-agent-orchestration-v1.md'));
  const integratorGuide = orchestration.match(/### Integrator[\s\S]*?(?=### Continuity Watcher)/i)?.[0] || '';
  const verifier = readFileSafe(VERIFIER);
  const verifierHeader = verifier.match(/^#![^\n]*\n\/\*\*[\s\S]*?\*\//)?.[0] || '';
  const removedScriptGuidance = ACTIVE_GUIDANCE
    .filter((relativePath) => /npm\s+run\s+verify:push\b/.test(readFileSafe(path.join(ROOT, relativePath))));
  const productionCommand = 'MDG_ALLOW_PROD_SMOKE=1 MDG_BASE=https://mainedispensaryguide.com npm run verify:post-deploy';
  const invalidFixtures = [
    // Remove a required transport step.
    verifySection.replace('git push origin HEAD:refs/heads/$BRANCH_NAME', ''),
    // Degrade exact candidate readiness into an unbound "preview exists" claim.
    verifySection.replace('Vercel reports Ready for that exact candidate SHA', 'Preview exists'),
    // Put production smoke before transport readiness.
    `${productionCommand}\n${verifySection}`,
    // Put a smoke command before transport readiness.
    `node scripts/git/pre-push-verify.cjs --with-smoke\n${verifySection}`,
    // Drop the evidence-bound canonical gate.
    verifySection.replace('npm run ops:integrate -- --repo-full-name steezkelly/maine-dispensary-guide --pr-number "$PR_NUMBER" --evidence "$EVIDENCE_PATH" --expect-evidence-sha256 "$EVIDENCE_DIGEST" --allow-draft', ''),
  ];
  const invalidFixtureAccepted = invalidFixtures.some(isPreviewFirstReleaseGuidance);

  if (removedScriptGuidance.length > 0
      || !isPreviewFirstReleaseGuidance(verifySection)
      || !isPreviewFirstReleaseGuidance(verifierHeader)
      || !isPreviewFirstReleaseGuidance(integratorChecklist)
      || !isPreviewFirstReleaseGuidance(integratorGuide)
      || invalidFixtureAccepted) {
    logFail('active release guidance uses preview-first post-transport smoke',
      `Active guidance and the verifier header must remove verify:push and order exact-range verify → isolated build → normal push → exact-SHA Vercel Ready → preview smoke → merge/readiness → production smoke. Removed command remains in: ${removedScriptGuidance.join(', ') || 'none'}; adversarial fixture accepted=${invalidFixtureAccepted}.`);
    return;
  }
  logPass('active release guidance uses preview-first post-transport smoke');
}

function testApprovedReleaseSpecificationsAreGoverned() {
  const governed = new Set(sharedInventory?.REQUIRED_GOVERNANCE_SURFACES || []);
  const missingFromInventory = APPROVED_RELEASE_SPECS.filter((relativePath) => !governed.has(relativePath));
  const retiredCommands = APPROVED_RELEASE_SPECS.filter((relativePath) => (
    /npm\s+run\s+verify:push\b/.test(readFileSafe(path.join(ROOT, relativePath)))
  ));

  if (missingFromInventory.length > 0 || retiredCommands.length > 0) {
    logFail('approved release specifications are governed and executable',
      `Approved release specifications must be scanned by the shared governance inventory and must not prescribe retired verify:push. Missing from inventory: ${missingFromInventory.join(', ') || 'none'}; retired command remains in: ${retiredCommands.join(', ') || 'none'}.`);
    return;
  }
  logPass('approved release specifications are governed and executable');
}

function testContinuityGuidanceDoesNotFreezeOperationalTime() {
  const relativePath = 'docs/governance/mdg-agent-orchestration-v1.md';
  const source = readFileSafe(path.join(ROOT, relativePath));
  const command = source.match(/npm run agents:continuity[^\n`]*/)?.[0] || '';
  const frozenClock = /--now\s+(?:20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z|['"]20\d{2}-)/.test(command);

  if (!command || frozenClock) {
    logFail('continuity guidance does not freeze operational time',
      `The canonical continuity command must rely on the command's current-time default or a runtime-computed value, not a historical ISO timestamp. Command: ${command || 'missing'}.`);
    return;
  }
  logPass('continuity guidance does not freeze operational time');
}

function testMigrationNotesAndHookDescribeImplementedBehavior() {
  const notes = readFileSafe(path.join(ROOT, 'docs/governance/verifier-governance-migration-notes-2026-07-20.md'));
  const hook = readFileSafe(HOOK);
  const verifierHeader = readFileSafe(VERIFIER).match(/^#![^\n]*\n\/\*\*[\s\S]*?\*\//)?.[0] || '';
  const hookHeader = hook.split('\n').slice(0, 12).join('\n');
  const overstatements = [
    /falls back to a documented nuke-gated-by-warning-if-ppid-mismatch strategy/i,
    /simulates a non-descendant `tsserver\.js` process/i,
    /invokes the hook with `VERIFY` pointed at a non-existent path/i,
    /No application code was touched\. No `apps\/` files were touched\./i,
    /two best-effort `pkill -P "\$VERIFIER_PID"[^\n]*direct verifier children/i,
    /requires both cleanup commands to use `pkill -P` with the verifier PID/i,
    /autoRelatedData\.json[^\n]*`--shortstat` output of dirty paths/i,
    /stubs one of[^\n]*hero-image-naming[^\n]*not exist[^\n]*code \(13\)/i,
    /invokes the verifier with `--with-smoke` and no env/i,
    /expected `contracts: kill-scoped,[^`]+` summary/i,
  ].filter((pattern) => pattern.test(notes));
  const verifierHeaderOverstatesExit13 = /13[^\n]*maintained[\s\S]{0,80}checker script is missing/i.test(verifierHeader);
  const hookScopeAccurate = /governed release|release-governance|governance/i.test(hookHeader);

  if (overstatements.length > 0 || verifierHeaderOverstatesExit13 || !hookScopeAccurate) {
    logFail('migration notes and hook header describe implemented behavior',
      `Remove claims not supported by implementation/runtime tests and keep the verifier exit map accurate. Unsupported note claims=${overstatements.length}; verifier header overstates exit 13=${verifierHeaderOverstatesExit13}; hook scope accurate=${hookScopeAccurate}.`);
    return;
  }
  logPass('migration notes and hook header describe implemented behavior');
}

const RELEASE_PENDING_COMMANDS = Object.freeze([
  'npm run ops:integrate -- --repo-full-name steezkelly/maine-dispensary-guide --pr-number $PR_NUMBER --evidence $EVIDENCE_PATH --expect-evidence-sha256 $EVIDENCE_DIGEST --allow-draft',
  'node scripts/git/pre-push-verify.cjs --ref=$LOCKED_BASE_SHA --target=$CANDIDATE_SHA',
  'npm run build:isolated',
  'git push origin HEAD:refs/heads/$BRANCH_NAME',
  'vercel ready wait on the exact candidate SHA',
  'MDG_PREVIEW_URL=https://your-exact-preview.vercel.app npm run verify:post-deploy',
  'gh pr merge $PR_NUMBER --merge',
]);
const RELEASED_COMMANDS = Object.freeze([
  'npm run ops:integrate -- --repo-full-name steezkelly/maine-dispensary-guide --pr-number $PR_NUMBER --evidence $EVIDENCE_PATH --expect-evidence-sha256 $EVIDENCE_DIGEST --allow-draft',
  'node scripts/git/pre-push-verify.cjs --ref=$LOCKED_BASE_SHA --target=$CANDIDATE_SHA',
  'npm run build:isolated',
  'git push origin HEAD:refs/heads/$BRANCH_NAME',
  'vercel preview ready wait on the exact candidate SHA',
  'MDG_PREVIEW_URL=https://your-exact-preview.vercel.app npm run verify:post-deploy',
  'gh pr merge $PR_NUMBER --merge',
  'post-merge reconciliation: rev-parse $FINAL_MAIN_SHA^{tree} == rev-parse $CANDIDATE_SHA^{tree}',
  'node --test scripts/operations/tests/*.test.cjs (on final main)',
  'vercel production ready wait on final-main-sha',
  'MDG_ALLOW_PROD_SMOKE=1 MDG_BASE=https://mainedispensaryguide.com npm run verify:post-deploy',
  'PRODUCTION_ROUTE=https://mainedispensaryguide.com/expected-route; curl --fail --silent --show-error "$PRODUCTION_ROUTE"',
  'gather closeout evidence',
]);

function integratorChecklistCloseoutIsValid(checklist) {
  const markers = [
    'MDG_ALLOW_PROD_SMOKE=1 MDG_BASE=https://mainedispensaryguide.com npm run verify:post-deploy',
    'PRODUCTION_ROUTE=https://mainedispensaryguide.com/expected-route; curl --fail --silent --show-error "$PRODUCTION_ROUTE"',
    'Gather closeout evidence',
    'Release the feature lease',
    'Close the candidate card',
    'Attach one final `status: released` metadata record',
  ].map((marker) => checklist.indexOf(marker));
  const ordered = markers.every((index) => index >= 0)
    && markers.every((index, position) => position === 0 || index > markers[position - 1]);
  const contradictory = /after the sequence in step 12/i.test(checklist)
    || /Record `closeout_evidence`[^\n]*after step 15/i.test(checklist);
  const metadataRecords = [...checklist.matchAll(/```json\s*([\s\S]*?)```/g)]
    .map((match) => {
      try { return JSON.parse(match[1]); } catch { return null; }
    });
  const pending = metadataRecords.filter((record) => record?.status === 'release-pending');
  const released = metadataRecords.filter((record) => record?.status === 'released');
  const arraysExact = pending.length === 1 && released.length === 1
    && JSON.stringify(pending[0].validation_commands) === JSON.stringify(RELEASE_PENDING_COMMANDS)
    && JSON.stringify(released[0].validation_commands) === JSON.stringify(RELEASED_COMMANDS);
  return ordered && !contradictory && arraysExact;
}

function testIntegratorChecklistClosesOutAfterProductionEvidence() {
  const checklist = readFileSafe(path.join(ROOT, 'docs/governance/templates/mdg-integrator-checklist.md'));
  const invalidMutations = [
    // Drop the production route probe (release would close without production evidence).
    checklist.replace('    "PRODUCTION_ROUTE=https://mainedispensaryguide.com/expected-route; curl --fail --silent --show-error \\"$PRODUCTION_ROUTE\\"",\n', ''),
    // Inject an iteration command before closeout evidence (breaks evidence-first ordering).
    checklist.replace('    "gather closeout evidence"', '    "npm run verify:iterate",\n    "gather closeout evidence"'),
    // Reorder merge after production-ready (production smoke before the merge commit).
    checklist.replace('    "gh pr merge $PR_NUMBER --merge",\n    "post-merge reconciliation: rev-parse $FINAL_MAIN_SHA^{tree} == rev-parse $CANDIDATE_SHA^{tree}",', '    "post-merge reconciliation: rev-parse $FINAL_MAIN_SHA^{tree} == rev-parse $CANDIDATE_SHA^{tree}",\n    "gh pr merge $PR_NUMBER --merge",'),
    // Drop the evidence-bound gate (release would bypass the canonical integrity gate).
    checklist.replace('    "npm run ops:integrate -- --repo-full-name steezkelly/maine-dispensary-guide --pr-number $PR_NUMBER --evidence $EVIDENCE_PATH --expect-evidence-sha256 $EVIDENCE_DIGEST --allow-draft",\n', ''),
  ];
  const mutationsRejected = invalidMutations
    .every((mutation) => mutation !== checklist && !integratorChecklistCloseoutIsValid(mutation));

  if (!integratorChecklistCloseoutIsValid(checklist) || !mutationsRejected) {
    logFail('integrator checklist closes out only after production evidence',
      `Expected exact release arrays and production smoke → route probe → gather evidence → release lease → close card → one final released record; valid=${integratorChecklistCloseoutIsValid(checklist)}, mutations rejected=${mutationsRejected}.`);
    return;
  }
  logPass('integrator checklist closes out only after production evidence');
}

function findShellPlaceholderViolations(source, relativePath = 'fixture') {
  const normalized = String(source).replace(/\\\r?\n/g, '');
  return normalized
    .split('\n')
    .map((line, index) => ({ line, number: index + 1, relativePath }))
    .filter(({ line }) => !line.trimStart().startsWith('#'))
    .filter(({ line }) => {
      // Literal paired HTML assertions (for example grep '<title>…</title>')
      // are data, not shell placeholders. Keep unpaired <path>-style tokens.
      const shellText = line.replace(/(['"])[^'"]*<([A-Za-z][\w:-]*)[^>]*>[^'"]*<\/\2>[^'"]*\1/g, '');
      return /(?:^|[\s`'";$|&()])(?:cd|cp|git|npm|npx|node|curl|bash|hermes|which|env|vercel|mmx)\b[^\n]*<[^>]+>/i.test(shellText)
        || /(?:^|[\s`'";$|&()])file\s+--[A-Za-z0-9-]+[^\n]*<[^>]+>/i.test(shellText)
        || /\b[A-Z][A-Z0-9_]*=\s*<[^>]+>/.test(shellText)
        || /https:\/\/[^\s`"']*<[^>]+>[^\s`"']*\.vercel\.app/.test(shellText);
    });
}

function findNonExecutableCommandExamples(source, relativePath = 'fixture') {
  return String(source)
    .replace(/\\\r?\n/g, '')
    .split('\n')
    .flatMap((line, index) => {
      const violations = [];
      if (/\/absolute\/path\//.test(line)
          && /(?:^|[\s`])(?:cd|export|git|npm|npx|node|curl|bash|hermes|env|vercel)\b/.test(line)) {
        violations.push({ relativePath, number: index + 1, type: 'literal-absolute-placeholder' });
      }
      const assignment = line.match(/(?:^|[\s`'"])([A-Z][A-Z0-9_]*)=[^\s;|&]+\s+/);
      if (assignment) {
        const variable = assignment[1];
        const tail = line.slice((assignment.index || 0) + assignment[0].length).split(/[;|&]/, 1)[0];
        const expandsBeforeAssignment = new RegExp(`\\$(?:\\{${variable}\\}|${variable}\\b)`).test(tail);
        if (expandsBeforeAssignment) {
          violations.push({ relativePath, number: index + 1, type: 'same-command-assignment-expansion' });
        }
      }
      return violations;
    });
}

function testActiveReleaseCommandsAreExecutable() {
  const violations = ACTIVE_GUIDANCE.flatMap((relativePath) => findNonExecutableCommandExamples(
    readFileSafe(path.join(ROOT, relativePath)), relativePath,
  ));
  const unsafeFixtures = [
    'TS_CONFIG_PATH=tsconfig.json npx tsc --noEmit -p "$TS_CONFIG_PATH"',
    'env BRANCH_NAME=fix/test git push origin HEAD:refs/heads/$BRANCH_NAME',
    'cd /absolute/path/to/maine-dispensary-guide',
  ];
  const safeFixtures = [
    'TS_CONFIG_PATH=tsconfig.json; npx tsc --noEmit -p "$TS_CONFIG_PATH"',
    'npx tsc --noEmit -p tsconfig.json',
    ': "${MDG_REPO_ROOT:?Set MDG_REPO_ROOT}"',
  ];
  const missedUnsafe = unsafeFixtures.filter((fixture) => findNonExecutableCommandExamples(fixture).length === 0);
  const rejectedSafe = safeFixtures.filter((fixture) => findNonExecutableCommandExamples(fixture).length > 0);

  if (violations.length > 0 || missedUnsafe.length > 0 || rejectedSafe.length > 0) {
    logFail('active release commands are executable',
      `Active examples contain literal absolute placeholders or same-command assignment expansion: ${violations.map(({ relativePath, number, type }) => `${relativePath}:${number} (${type})`).join(', ') || 'none'}; unsafe fixtures missed=${missedUnsafe.length}; safe fixtures rejected=${rejectedSafe.length}.`);
    return;
  }
  logPass('active release commands are executable');
}

function testActiveReleaseCommandsUseShellSafePlaceholders() {
  const violations = ACTIVE_GUIDANCE.flatMap((relativePath) => findShellPlaceholderViolations(
    readFileSafe(path.join(ROOT, relativePath)), relativePath,
  ));
  const unsafeFixtures = [
    'git push origin \\\n HEAD:refs/heads/<branch>',
    'MDG_PREVIEW_URL=\\\n <preview-url> npm run verify:post-deploy',
    'env BRANCH=<branch> git push origin HEAD:refs/heads/$BRANCH',
    'cp <video>.mp4 "$OUTPUT_DIR/output.mp4"',
    'file --mime-type <path>',
    'mmx image --prompt <prompt>',
    'npx tsc -p <tsconfig>',
    'vercel inspect <deployment-url> --format json',
    'which <tool>',
  ];
  const safeFixtures = [
    'A legitimate <tag> in prose is not a shell command.',
    '<article> is literal HTML markup.',
    'Use "$PATH_TO_CHECK" as the opaque path.',
  ];
  const missedFixtures = unsafeFixtures.filter((fixture) => findShellPlaceholderViolations(fixture).length === 0);
  const rejectedSafeFixtures = safeFixtures.filter((fixture) => findShellPlaceholderViolations(fixture).length > 0);

  if (violations.length > 0 || missedFixtures.length > 0 || rejectedSafeFixtures.length > 0) {
    logFail('active release commands use shell-safe placeholders',
      `Executable examples contain angle-bracket placeholders that a shell treats as redirection: ${violations.map(({ relativePath, number }) => `${relativePath}:${number}`).join(', ') || 'none'}; unsafe fixtures missed=${missedFixtures.length}; safe prose rejected=${rejectedSafeFixtures.length}.`);
    return;
  }
  logPass('active release commands use shell-safe placeholders');
}

// ----------------------------------------------------------------------------
// Suite runner
// ----------------------------------------------------------------------------
function runAll() {
  console.log(`\n  pre-push verifier governance contracts ${suiteLabel}\n`);
  testSharedGovernanceSurfaceInventory();
  testRequiredGovernanceInputsAreReadable();
  testPackageReleaseCommandsExist();
  testScriptsAuthorityDescribesCurrentVerifier();
  testExactRangeArgumentsFailClosedAndUseBaseToHead();
  testMissingEsbuildUsesEnvironmentExitCode();
  testAutoRelatedStaleFileUsesBlockingExit13();
  testKillScopedToVerifierProcessTree();
  testVerifierDoesNotRegenerateOrStageGeneratedFiles();
  testRequiredChecksFailClosedWhenScriptIsMissing();
  testPublicVerifierSeesDeletedRequiredInputs();
  testPublicVerifierSeesRenamedRequiredInputs();
  testWithSmokeRequiresPreviewUrl();
  testHookVerifiesEveryExactLocalSha();
  testHookFailsClosedWhenVerifierMissing();
  testInstallHooksDoesNotTeachNoVerify();
  testActiveGuidanceDoesNotTeachNoVerify();
  testNoVerifyClassifierRejectsAdversarialForms();
  testActiveReleaseGuidanceIsPreviewFirst();
  testApprovedReleaseSpecificationsAreGoverned();
  testContinuityGuidanceDoesNotFreezeOperationalTime();
  testMigrationNotesAndHookDescribeImplementedBehavior();
  testIntegratorChecklistClosesOutAfterProductionEvidence();
  testActiveReleaseCommandsAreExecutable();
  testActiveReleaseCommandsUseShellSafePlaceholders();
  testCanonicalGatesRunGovernanceSuite();
  testVerifierUsageDoesNotAdvertiseIgnoreUnrelated();
  console.log(`\n  summary: ${failures === 0 ? 'OK' : `${failures} failure(s)`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

runAll();
