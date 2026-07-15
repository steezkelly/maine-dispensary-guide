'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { resolvePreviewUrl } = require('./resolve-preview-url.cjs');

function jsonResponse(body) {
  return { ok: true, json: async () => body };
}

test('resolver waits for a delayed successful preview deployment for the requested SHA', async () => {
  let deploymentReads = 0;
  const sleeps = [];
  const fetchImpl = async (url) => {
    if (url.includes('/deployments?sha=abc123')) {
      deploymentReads += 1;
      return jsonResponse(deploymentReads === 1 ? [] : [
        { id: 99, environment: 'Preview', production_environment: false },
      ]);
    }
    if (url.includes('/deployments/99/statuses')) {
      return jsonResponse([
        { state: 'success', environment_url: 'https://preview.example.test' },
      ]);
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  const url = await resolvePreviewUrl({
    repository: 'owner/repo',
    headSha: 'abc123',
    token: 'test-token',
    attempts: 2,
    retryMs: 7,
    fetchImpl,
    sleep: async (ms) => sleeps.push(ms),
  });

  assert.equal(url, 'https://preview.example.test');
  assert.equal(deploymentReads, 2);
  assert.deepEqual(sleeps, [7]);
});

test('preview smoke workflow delegates deployment polling to the retrying resolver', () => {
  const workflow = fs.readFileSync(path.resolve(__dirname, '../../.github/workflows/ci.yml'), 'utf8');
  assert.match(workflow, /url="\$\(node scripts\/check\/resolve-preview-url\.cjs\)"/);
});
