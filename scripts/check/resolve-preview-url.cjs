'use strict';

const { setTimeout: sleepFor } = require('node:timers/promises');

function isPreviewDeployment(deployment) {
  return String(deployment.environment || '').toLowerCase().startsWith('preview')
    || deployment.production_environment === false;
}

async function resolvePreviewUrl({
  repository,
  headSha,
  token,
  attempts = 12,
  retryMs = 10_000,
  fetchImpl = global.fetch,
  sleep = sleepFor,
}) {
  if (!repository || !headSha) {
    throw new Error('repository and headSha are required to resolve a Preview deployment');
  }
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new Error('attempts must be a positive integer');
  }

  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'github-actions-preview-url-resolver',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const api = async (path) => {
    const response = await fetchImpl(`https://api.github.com/repos/${repository}${path}`, { headers });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${path}`);
    return response.json();
  };

  let lastReason = `No Preview deployment found for ${headSha}`;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const deployments = await api(`/deployments?sha=${headSha}&per_page=20`);
    const previewDeployments = deployments.filter(isPreviewDeployment);

    for (const deployment of previewDeployments) {
      const statuses = await api(`/deployments/${deployment.id}/statuses`);
      const success = statuses.find((status) =>
        status.state === 'success' && (status.environment_url || status.target_url));
      if (success) return success.environment_url || success.target_url;
    }

    lastReason = previewDeployments.length === 0
      ? `No Preview deployment found for ${headSha}`
      : `No successful Preview deployment status found for ${headSha}`;
    if (attempt < attempts) await sleep(retryMs);
  }

  throw new Error(`${lastReason} after ${attempts} attempt(s)`);
}

if (require.main === module) {
  resolvePreviewUrl({
    repository: process.env.REPOSITORY,
    headSha: process.env.HEAD_SHA,
    token: process.env.GITHUB_TOKEN,
  }).then((url) => {
    process.stdout.write(`${url}\n`);
  }).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { isPreviewDeployment, resolvePreviewUrl };
