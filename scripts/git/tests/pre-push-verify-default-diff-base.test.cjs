const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const suffix = `${process.pid}-${Date.now()}`;
const fixtureRepo = path.join(os.tmpdir(), `mdg-verify-default-diff-${suffix}`);
const fixtureRemote = path.join(os.tmpdir(), `mdg-verify-default-diff-origin-${suffix}.git`);
const noOriginRepo = path.join(os.tmpdir(), `mdg-verify-no-origin-${suffix}`);
const fixtureBranch = `test/verify-default-diff-${suffix}`;
const committedFixture = `scripts/__verify-default-committed-${suffix}.mjs`;
const uncommittedFixture = `scripts/__verify-default-uncommitted-${suffix}.mjs`;
const verifierSource = path.join(ROOT, 'scripts', 'git', 'pre-push-verify.cjs');
const releaseSurfacesSource = path.join(ROOT, 'scripts', 'git', 'release-governance-surfaces.cjs');
const dataOnlyAssertSource = path.join(ROOT, 'apps', 'maine-cannabis', 'scripts', 'analytics', 'data-only-assert.cjs');
const verifierArgs = [
  'scripts/git/pre-push-verify.cjs',
  '--skip-sitemap-postprocess',
  '--skip-docs-vs-code',
  '--skip-compressed-frontmatter',
  '--skip-hero-image-naming',
  '--skip-autoRelated-freshness',
];
function localGitEnvironmentNames() {
  return execFileSync('git', ['rev-parse', '--local-env-vars'], { cwd: ROOT, encoding: 'utf8' })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
}

const GIT_LOCAL_CONTEXT = new Set(localGitEnvironmentNames());

function sanitizeGitEnvironment(environment) {
  for (const name of GIT_LOCAL_CONTEXT) delete environment[name];
  for (const name of Object.keys(environment)) {
    if (/^GIT_CONFIG_(?:KEY|VALUE)_\d+$/.test(name)) delete environment[name];
  }
  return environment;
}

sanitizeGitEnvironment(process.env);

function git(args, cwd = ROOT) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

function runVerifier(cwd) {
  return spawnSync('node', verifierArgs, { cwd, encoding: 'utf8', timeout: 120_000 });
}

function combinedOutput(result) {
  return (result.stdout || '') + (result.stderr || '');
}

function withReplacement(filePath, replacement, run) {
  const original = fs.readFileSync(filePath, 'utf8');
  fs.writeFileSync(filePath, replacement);
  try {
    return run();
  } finally {
    fs.writeFileSync(filePath, original);
  }
}

function cleanup(pathname) {
  fs.rmSync(pathname, { recursive: true, force: true });
  assert.equal(fs.existsSync(pathname), false, `fixture cleanup left ${pathname}`);
}

function rootSnapshot() {
  return {
    head: git(['rev-parse', 'HEAD']).trim(),
    status: git(['status', '--porcelain=v1']).trim(),
    fixtureRefs: git(['for-each-ref', '--format=%(refname):%(objectname)', 'refs/heads/test/verify-default-diff-']).trim(),
  };
}

function writeVerifierFixture(repo, { defaultDiffSuiteSource = null, governanceSuiteSource = null } = {}) {
  fs.mkdirSync(path.join(repo, 'scripts', 'git', 'tests'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'apps', 'maine-cannabis', 'scripts', 'analytics'), { recursive: true });
  fs.copyFileSync(verifierSource, path.join(repo, 'scripts', 'git', 'pre-push-verify.cjs'));
  fs.copyFileSync(releaseSurfacesSource, path.join(repo, 'scripts', 'git', 'release-governance-surfaces.cjs'));
  fs.copyFileSync(dataOnlyAssertSource, path.join(repo, 'apps', 'maine-cannabis', 'scripts', 'analytics', 'data-only-assert.cjs'));
  if (defaultDiffSuiteSource !== null) {
    fs.writeFileSync(path.join(repo, 'scripts', 'git', 'tests', 'pre-push-verify-default-diff-base.test.cjs'), defaultDiffSuiteSource);
  }
  if (governanceSuiteSource !== null) {
    fs.writeFileSync(path.join(repo, 'scripts', 'git', 'tests', 'pre-push-verify-governance.test.cjs'), governanceSuiteSource);
  }
  fs.writeFileSync(path.join(repo, 'package.json'), JSON.stringify({ workspaces: [] }));
  fs.writeFileSync(path.join(repo, 'scripts', 'fixture.mjs'), 'export const baseline = true;\n');
  git(['init', '--initial-branch=main'], repo);
  git(['config', 'user.name', 'MDG verifier fixture'], repo);
  git(['config', 'user.email', 'fixture@example.invalid'], repo);
  git(['add', '.'], repo);
  git(['commit', '-m', 'test: fixture baseline'], repo);
}

function configurePrivateOrigin(repo, remote) {
  git(['init', '--bare', remote]);
  git(['remote', 'add', 'origin', remote], repo);
  git(['push', '--set-upstream', 'origin', 'main'], repo);
  git(['fetch', 'origin', 'main:refs/remotes/origin/main'], repo);
  assert.equal(git(['rev-parse', 'origin/main'], repo).trim(), git(['rev-parse', 'HEAD'], repo).trim(),
    'fixture origin/main must equal its controlled baseline');
}

test('fixture sanitizer isolates private repos from hook-local Git config', () => {
  const declared = git(['rev-parse', '--local-env-vars']).trim().split(/\r?\n/).filter(Boolean).sort();
  const privateRepo = path.join(os.tmpdir(), `mdg-verify-config-isolation-${suffix}`);
  const injectedValue = `must-not-reach-fixture-${suffix}`;
  const inherited = {
    GIT_CONFIG: path.join(privateRepo, 'hook-local-config'),
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_PARAMETERS: "'fixture.hookleak=from-parameters'",
    GIT_CONFIG_KEY_0: 'fixture.hookleak',
    GIT_CONFIG_VALUE_0: injectedValue,
  };

  assert.equal(typeof sanitizeGitEnvironment, 'function', 'fixture runner must expose a Git-context sanitizer');
  assert.deepEqual([...GIT_LOCAL_CONTEXT].sort(), declared, 'fixture sanitizer must use Git\'s complete local-context set');

  const isolated = sanitizeGitEnvironment({ ...inherited });
  for (const name of Object.keys(inherited)) {
    assert.equal(isolated[name], undefined, `fixture sanitizer left ${name} inherited`);
  }

  try {
    writeVerifierFixture(privateRepo);
    const probe = spawnSync('git', ['config', '--get', 'fixture.hookleak'], {
      cwd: privateRepo,
      env: { ...process.env, ...isolated },
      encoding: 'utf8',
    });
    assert.equal(probe.status, 1, combinedOutput(probe));
    assert.notEqual(probe.stdout.trim(), injectedValue, 'hook-local config reached the private fixture');
  } finally {
    cleanup(privateRepo);
  }
});

test('default verifier checks both committed branch delta and live worktree changes', () => {
  const sourceBefore = rootSnapshot();
  try {
    writeVerifierFixture(fixtureRepo);
    configurePrivateOrigin(fixtureRepo, fixtureRemote);
    git(['checkout', '-b', fixtureBranch], fixtureRepo);

    fs.writeFileSync(path.join(fixtureRepo, committedFixture), 'export const committedFixture = true;\n');
    git(['add', committedFixture], fixtureRepo);
    git(['commit', '-m', 'test: committed verifier fixture'], fixtureRepo);

    const committedOnly = runVerifier(fixtureRepo);
    const committedOutput = combinedOutput(committedOnly);
    assert.equal(committedOnly.status, 0, committedOutput);
    assert.match(committedOutput, /auto-detected default diff base/);
    assert.match(committedOutput, new RegExp(committedFixture.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

    fs.writeFileSync(path.join(fixtureRepo, uncommittedFixture), 'export const = ;\n');
    const liveWorktree = runVerifier(fixtureRepo);
    const liveOutput = combinedOutput(liveWorktree);
    assert.equal(liveWorktree.status, 10, liveOutput);
    assert.match(liveOutput, new RegExp(uncommittedFixture.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  } finally {
    cleanup(fixtureRepo);
    cleanup(fixtureRemote);
    assert.deepEqual(rootSnapshot(), sourceBefore, 'private fixture must not mutate the source worktree or refs');
  }
});

test('default verifier blocks a clean committed branch when origin/main is unavailable', () => {
  try {
    writeVerifierFixture(noOriginRepo);
    fs.writeFileSync(path.join(noOriginRepo, 'scripts', 'fixture.mjs'), 'export const committedWithoutOrigin = true;\n');
    git(['add', 'scripts/fixture.mjs'], noOriginRepo);
    git(['commit', '-m', 'test: committed fixture delta'], noOriginRepo);

    const result = runVerifier(noOriginRepo);
    const output = combinedOutput(result);
    assert.equal(result.status, 3, output);
    assert.match(output, /origin\/main merge base/);
  } finally {
    cleanup(noOriginRepo);
  }
});

test('SCRIPTS.md does not instruct users to bypass the pre-push verifier', () => {
  const scriptsGuide = fs.readFileSync(path.join(ROOT, 'SCRIPTS.md'), 'utf8');
  assert.doesNotMatch(scriptsGuide, /git push --no-verify/);
});

test('CI runs the default-diff regression suite', () => {
  const ciWorkflow = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8');
  assert.match(ciWorkflow, /node scripts\/git\/tests\/pre-push-verify-default-diff-base\.test\.cjs/);
});

test('default-diff regression suite blocks verifier source changes when it fails', () => {
  const canary = `default-diff-source-canary-${suffix}`;
  const canaryRepo = path.join(os.tmpdir(), `mdg-verify-source-canary-${suffix}`);
  const canaryRemote = path.join(os.tmpdir(), `mdg-verify-source-canary-origin-${suffix}.git`);
  try {
    writeVerifierFixture(canaryRepo, {
      defaultDiffSuiteSource: `throw new Error(${JSON.stringify(canary)});\n`,
      governanceSuiteSource: 'process.exit(0);\n',
    });
    configurePrivateOrigin(canaryRepo, canaryRemote);
    git(['checkout', '-b', `test/verify-source-canary-${suffix}`], canaryRepo);
    fs.appendFileSync(path.join(canaryRepo, 'scripts', 'git', 'pre-push-verify.cjs'), '\n// source-canary trigger\n');
    git(['add', 'scripts/git/pre-push-verify.cjs'], canaryRepo);
    git(['commit', '-m', 'test: trigger default suite from verifier source'], canaryRepo);

    const result = runVerifier(canaryRepo);
    const output = combinedOutput(result);
    assert.equal(result.status, 16, output);
    assert.match(output, new RegExp(canary));
  } finally {
    cleanup(canaryRepo);
    cleanup(canaryRemote);
  }
});

test('default-diff regression suite blocks changes to the suite itself when it fails', () => {
  const canary = `default-diff-test-canary-${suffix}`;
  const canaryRepo = path.join(os.tmpdir(), `mdg-verify-test-canary-${suffix}`);
  const canaryRemote = path.join(os.tmpdir(), `mdg-verify-test-canary-origin-${suffix}.git`);
  const suitePath = path.join(canaryRepo, 'scripts', 'git', 'tests', 'pre-push-verify-default-diff-base.test.cjs');
  try {
    writeVerifierFixture(canaryRepo, { defaultDiffSuiteSource: 'process.exit(0);\n' });
    configurePrivateOrigin(canaryRepo, canaryRemote);
    git(['checkout', '-b', `test/verify-test-canary-${suffix}`], canaryRepo);
    fs.writeFileSync(suitePath, `throw new Error(${JSON.stringify(canary)});\n`);
    git(['add', 'scripts/git/tests/pre-push-verify-default-diff-base.test.cjs'], canaryRepo);
    git(['commit', '-m', 'test: trigger default suite from suite change'], canaryRepo);

    const result = runVerifier(canaryRepo);
    const output = combinedOutput(result);
    assert.equal(result.status, 16, output);
    assert.match(output, new RegExp(canary));
  } finally {
    cleanup(canaryRepo);
    cleanup(canaryRemote);
  }
});
