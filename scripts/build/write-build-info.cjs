'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const SHA_PATTERN = /^[0-9a-f]{40}$/i;

function normalizeGitSha(value) {
  const sha = String(value || '').trim();
  if (!SHA_PATTERN.test(sha)) throw new Error('A 40-character Git SHA is required for public build provenance');
  return sha.toLowerCase();
}

function resolveGitSha(root, env = process.env) {
  if (env.VERCEL_GIT_COMMIT_SHA) return normalizeGitSha(env.VERCEL_GIT_COMMIT_SHA);
  return normalizeGitSha(execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }));
}

function createBuildInfo({ gitSha, now = new Date(), env = process.env }) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error('A valid build timestamp is required');
  const normalizedSha = normalizeGitSha(gitSha);
  const info = {
    schemaVersion: 1,
    gitSha: normalizedSha,
    shortSha: normalizedSha.slice(0, 7),
    builtAt: now.toISOString(),
    environment: env.VERCEL_ENV || 'local',
  };
  if (env.VERCEL_DEPLOYMENT_ID) info.deploymentId = env.VERCEL_DEPLOYMENT_ID;
  return info;
}

function writeBuildInfo({ root, gitSha = resolveGitSha(root), now = new Date(), env = process.env }) {
  const output = path.join(root, 'apps', 'maine-cannabis', 'public', 'build-info.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(createBuildInfo({ gitSha, now, env }), null, 2)}\n`);
  return output;
}

function main() {
  const root = path.resolve(__dirname, '..', '..');
  const output = writeBuildInfo({ root });
  console.log(`Wrote public build provenance: ${output}`);
}

if (require.main === module) main();

module.exports = { createBuildInfo, resolveGitSha, writeBuildInfo };
