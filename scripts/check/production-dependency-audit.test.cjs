const test = require('node:test');
const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../..');

function copyCleanWorkspace(destination) {
  fs.cpSync(repoRoot, destination, {
    recursive: true,
    filter(source) {
      const relative = path.relative(repoRoot, source);
      if (!relative) return true;
      return !relative.split(path.sep).some((part) => (
        part === '.git' || part === 'node_modules' || part === 'dist' || part === '.vercel'
      ));
    },
  });
}

test('root and app manifests both declare googleapis as development tooling', () => {
  const rootPackage = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  const appPackage = JSON.parse(fs.readFileSync(
    path.join(repoRoot, 'apps/maine-cannabis/package.json'),
    'utf8',
  ));

  assert.equal(rootPackage.devDependencies.googleapis, '^173.0.0');
  assert.equal(appPackage.devDependencies.googleapis, '^173.0.0');
  assert.equal(rootPackage.dependencies?.googleapis, undefined);
  assert.equal(appPackage.dependencies?.googleapis, undefined);
});

test('offline GSC tooling resolves after a clean app-workspace development install', () => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-production-dependency-audit-'));
  const cache = path.join(sandbox, 'npm-cache');

  try {
    copyCleanWorkspace(path.join(sandbox, 'repo'));
    const cwd = path.join(sandbox, 'repo');
    childProcess.execFileSync('npm', [
      'ci', '--workspace', '@network/maine-cannabis', '--include=dev', '--ignore-scripts', '--cache', cache,
    ], { cwd, stdio: 'pipe' });

    const resolution = childProcess.execFileSync('node', [
      '-e', "process.stdout.write(require.resolve('googleapis'))",
    ], {
      cwd: path.join(cwd, 'apps/maine-cannabis'),
      encoding: 'utf8',
    }).trim();

    assert.match(resolution, /node_modules[/\\]googleapis[/\\]/);
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});

test('CI blocks critical production audit findings and runs the clean-install regression', () => {
  const workflow = fs.readFileSync(path.join(repoRoot, '.github/workflows/ci.yml'), 'utf8');

  assert.match(workflow, /npm audit --omit=dev --audit-level=critical/);
  assert.match(workflow, /node --test scripts\/check\/production-dependency-audit\.test\.cjs/);
});
