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

function discoverWorkspacePaths(root) {
  const { workspaces } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (!Array.isArray(workspaces)) throw new Error('package.json workspaces must be an array');
  return workspaces.flatMap((pattern) => {
    if (!pattern.endsWith('/*')) throw new Error(`Unsupported workspace pattern: ${pattern}`);
    const directory = path.join(root, pattern.slice(0, -2));
    return fs.readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.posix.join(pattern.slice(0, -2).replaceAll('\\', '/'), entry.name))
      .sort();
  });
}

function existsOrSymlink(candidate) {
  try {
    fs.lstatSync(candidate);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

function gitRoot() {
  return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
}

function main() {
  const root = fs.realpathSync(gitRoot());
  const workspacePaths = discoverWorkspacePaths(root);
  for (const workspacePath of workspacePaths) {
    const resolved = fs.realpathSync(path.join(root, workspacePath));
    assertResolvedInside(root, resolved);
    console.log(`${workspacePath}=${resolved}`);
  }
  for (const output of ['dist', 'apps/maine-cannabis/dist', 'apps/maine-cannabis/.vercel/output']) {
    const outputPath = path.join(root, output);
    if (existsOrSymlink(outputPath) && !process.argv.includes('--allow-existing-output')) {
      throw new Error(`Build output already exists in active worktree: ${outputPath}`);
    }
  }
}

if (require.main === module) main();

module.exports = { isInside, assertResolvedInside, discoverWorkspacePaths, existsOrSymlink };
