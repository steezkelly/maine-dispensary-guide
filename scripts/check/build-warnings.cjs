#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '../..');
const vercelOutput = path.join(projectRoot, '.vercel');

// Astro/Vercel can leave generated output behind; remove it so this check is repeatable.
fs.rmSync(vercelOutput, { recursive: true, force: true });

for (const rel of ['dist', path.join('.vercel', 'output')]) {
  fs.rmSync(path.join(projectRoot, rel), { recursive: true, force: true });
}

const result = spawnSync('npx', ['astro', 'build'], {
  cwd: projectRoot,
  encoding: 'utf8',
  env: { ...process.env, FORCE_COLOR: '0' },
  maxBuffer: 20 * 1024 * 1024,
});

const output = `${result.stdout || ''}${result.stderr || ''}`;
process.stdout.write(result.stdout || '');
process.stderr.write(result.stderr || '');

const warningPatterns = [
  /css-syntax-error/i,
  /Unexpected "<"/,
  /Unexpected "}"/,
];

const matchedWarnings = output
  .split(/\r?\n/)
  .filter((line) => warningPatterns.some((pattern) => pattern.test(line)));

if (result.status !== 0) {
  console.error(`\nAstro build failed with exit code ${result.status}.`);
  process.exit(result.status || 1);
}

if (matchedWarnings.length > 0) {
  console.error('\nBuild emitted CSS/HTML syntax warnings that must be fixed before shipping:');
  for (const line of matchedWarnings) console.error(`- ${line}`);
  process.exit(1);
}

console.log('Astro build completed with no CSS/HTML syntax warnings.');
