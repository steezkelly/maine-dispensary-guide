const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const suffix = `${process.pid}-${Date.now()}`;
const fixtureWorktree = path.join(os.tmpdir(), `mdg-verify-default-diff-${suffix}`);
const noOriginRepo = path.join(os.tmpdir(), `mdg-verify-no-origin-${suffix}`);
const fixtureBranch = `test/verify-default-diff-${suffix}`;
const committedFixture = `scripts/__verify-default-committed-${suffix}.mjs`;
const uncommittedFixture = `scripts/__verify-default-uncommitted-${suffix}.mjs`;
const verifierSource = path.join(ROOT, 'scripts', 'git', 'pre-push-verify.cjs');
const releaseSurfacesSource = path.join(ROOT, 'scripts', 'git', 'release-governance-surfaces.cjs');
const dataOnlyAssertSource = path.join(ROOT, 'apps', 'maine-cannabis', 'scripts', 'analytics', 'data-only-assert.cjs');
const fixtureVerifier = path.join(fixtureWorktree, 'scripts', 'git', 'pre-push-verify.cjs');
const verifierArgs = [
  'scripts/git/pre-push-verify.cjs',
  '--skip-sitemap-postprocess',
  '--skip-docs-vs-code',
  '--skip-compressed-frontmatter',
  '--skip-hero-image-naming',
  '--skip-autoRelated-freshness',
];

function git(args, cwd = ROOT) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

function runVerifier(cwd) {
  return spawnSync('node', verifierArgs, { cwd, encoding: 'utf8' });
}

test('default verifier checks both committed branch delta and live worktree changes', () => {
  try {
    git(['worktree', 'add', '-b', fixtureBranch, fixtureWorktree, 'origin/main']);
    fs.copyFileSync(verifierSource, fixtureVerifier);
    git(['config', 'user.name', 'MDG verifier fixture'], fixtureWorktree);
    git(['config', 'user.email', 'fixture@example.invalid'], fixtureWorktree);

    fs.writeFileSync(path.join(fixtureWorktree, committedFixture), 'export const committedFixture = true;\n');
    git(['add', committedFixture], fixtureWorktree);
    git(['commit', '-m', 'test: committed verifier fixture'], fixtureWorktree);

    const committedOnly = runVerifier(fixtureWorktree);
    const committedOutput = (committedOnly.stdout || '') + (committedOnly.stderr || '');
    assert.equal(committedOnly.status, 0, committedOutput);
    assert.match(committedOutput, /auto-detected default diff base/);
    assert.match(committedOutput, new RegExp(committedFixture.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

    fs.writeFileSync(path.join(fixtureWorktree, uncommittedFixture), 'export const = ;\n');
    const liveWorktree = runVerifier(fixtureWorktree);
    const liveOutput = (liveWorktree.stdout || '') + (liveWorktree.stderr || '');
    assert.equal(liveWorktree.status, 10, liveOutput);
    assert.match(liveOutput, new RegExp(uncommittedFixture.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  } finally {
    try { git(['worktree', 'remove', '--force', fixtureWorktree]); } catch {}
    try { git(['branch', '-D', fixtureBranch]); } catch {}
  }
});

test('default verifier blocks a clean committed branch when origin/main is unavailable', () => {
  try {
    fs.mkdirSync(path.join(noOriginRepo, 'scripts', 'git'), { recursive: true });
    fs.mkdirSync(path.join(noOriginRepo, 'apps', 'maine-cannabis', 'scripts', 'analytics'), { recursive: true });
    fs.writeFileSync(path.join(noOriginRepo, 'package.json'), JSON.stringify({ workspaces: [] }));
    fs.copyFileSync(verifierSource, path.join(noOriginRepo, 'scripts', 'git', 'pre-push-verify.cjs'));
    fs.copyFileSync(releaseSurfacesSource, path.join(noOriginRepo, 'scripts', 'git', 'release-governance-surfaces.cjs'));
    fs.copyFileSync(dataOnlyAssertSource, path.join(noOriginRepo, 'apps', 'maine-cannabis', 'scripts', 'analytics', 'data-only-assert.cjs'));
    fs.writeFileSync(path.join(noOriginRepo, 'scripts', 'fixture.mjs'), 'export const baseline = true;\n');
    git(['init', '--initial-branch=main'], noOriginRepo);
    git(['config', 'user.name', 'MDG verifier fixture'], noOriginRepo);
    git(['config', 'user.email', 'fixture@example.invalid'], noOriginRepo);
    git(['add', '.'], noOriginRepo);
    git(['commit', '-m', 'test: fixture baseline'], noOriginRepo);
    fs.writeFileSync(path.join(noOriginRepo, 'scripts', 'fixture.mjs'), 'export const committedWithoutOrigin = true;\n');
    git(['add', 'scripts/fixture.mjs'], noOriginRepo);
    git(['commit', '-m', 'test: committed fixture delta'], noOriginRepo);

    const result = runVerifier(noOriginRepo);
    const output = (result.stdout || '') + (result.stderr || '');
    assert.equal(result.status, 3, output);
    assert.match(output, /origin\/main merge base/);
  } finally {
    fs.rmSync(noOriginRepo, { recursive: true, force: true });
  }
});

test('SCRIPTS.md does not instruct users to bypass the pre-push verifier', () => {
  const scriptsGuide = fs.readFileSync(path.join(ROOT, 'SCRIPTS.md'), 'utf8');
  assert.doesNotMatch(scriptsGuide, /git push --no-verify/);
});
