'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function findPrimaryWorktree(cwd) {
  const output = execFileSync('git', ['-C', cwd, 'worktree', 'list', '--porcelain'], { encoding: 'utf8' });
  const candidates = output
    .split('\n\n')
    .map((block) => block.split('\n').find((line) => line.startsWith('worktree '))?.slice('worktree '.length))
    .filter(Boolean);
  return candidates.find((candidate) => {
    try {
      return fs.lstatSync(path.join(candidate, '.git')).isDirectory();
    } catch {
      return false;
    }
  }) || null;
}

function ensureWorktreeDependencies({ cwd, primaryWorktree = findPrimaryWorktree(cwd) }) {
  const root = path.resolve(cwd);
  if (!primaryWorktree || path.resolve(primaryWorktree) === root) {
    return { action: 'primary', target: path.join(root, 'node_modules', 'typescript') };
  }

  const primaryModules = path.join(path.resolve(primaryWorktree), 'node_modules');
  const source = path.join(primaryModules, 'typescript');
  const modules = path.join(root, 'node_modules');
  const target = path.join(modules, 'typescript');
  const tsserver = path.join(source, 'lib', 'tsserver.js');
  if (!fs.existsSync(tsserver)) return { action: 'unavailable', source, target };

  try {
    const modulesStat = fs.lstatSync(modules);
    if (modulesStat.isSymbolicLink()) {
      if (!fs.existsSync(modules) || fs.realpathSync(modules) === fs.realpathSync(primaryModules)) {
        fs.unlinkSync(modules);
        fs.mkdirSync(modules);
      } else {
        return { action: 'preserved', source, target };
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    fs.mkdirSync(modules, { recursive: true });
  }

  try {
    const stat = fs.lstatSync(target);
    if (stat.isSymbolicLink() && !fs.existsSync(target)) fs.unlinkSync(target);
    else return { action: 'preserved', source, target };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  fs.symlinkSync(source, target, 'dir');
  return { action: 'linked', source, target };
}

function main() {
  const quiet = process.argv.includes('--quiet');
  const result = ensureWorktreeDependencies({ cwd: process.cwd() });
  if (!quiet) {
    if (result.action === 'unavailable') {
      console.log(`TypeScript dependency source unavailable at ${result.source}; run npm ci in the primary checkout or this worktree.`);
    } else {
      console.log(`worktree dependencies: ${result.action}${result.source ? ` (${result.source})` : ''}`);
    }
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`worktree dependency bootstrap failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { ensureWorktreeDependencies, findPrimaryWorktree };
