'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function assertResolvedInside(root, candidate) {
  if (!isInside(root, candidate)) throw new Error(`Resolved workspace path is outside active checkout: ${candidate}`);
  return candidate;
}

function gitRoot() {
  return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
}

function main() {
  const root = fs.realpathSync(gitRoot());
  const workspacePaths = [
    'packages/config',
    'packages/content-types',
    'packages/design-system',
    'packages/layouts',
    'packages/ui',
    'apps/maine-cannabis',
  ];
  for (const workspacePath of workspacePaths) {
    const resolved = fs.realpathSync(path.join(root, workspacePath));
    assertResolvedInside(root, resolved);
    console.log(`${workspacePath}=${resolved}`);
  }
  for (const output of ['dist', 'apps/maine-cannabis/dist', 'apps/maine-cannabis/.vercel/output']) {
    const outputPath = path.join(root, output);
    if (fs.existsSync(outputPath) && !process.argv.includes('--allow-existing-output')) {
      throw new Error(`Build output already exists in active worktree: ${outputPath}`);
    }
  }
}

if (require.main === module) main();

module.exports = { isInside, assertResolvedInside };
