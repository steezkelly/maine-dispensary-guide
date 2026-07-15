const http = require('node:http');
const https = require('node:https');

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_GET_BODY_LIMIT_BYTES = 64 * 1024;
const FALLBACK_STATUSES = new Set([0, 403, 405, 501]);

function requestStatus(target, { method = 'HEAD', timeoutMs = DEFAULT_TIMEOUT_MS, bodyLimitBytes = DEFAULT_GET_BODY_LIMIT_BYTES } = {}) {
  return new Promise((resolve) => {
    const lib = target.startsWith('https:') ? https : http;
    let settled = false;

    function finish(result) {
      if (settled) return;
      settled = true;
      resolve({ method, ...result });
    }

    const req = lib.request(target, { method, timeout: timeoutMs }, (res) => {
      let bytesRead = 0;

      res.on('data', (chunk) => {
        bytesRead += chunk.length;
        if (method === 'GET' && bytesRead >= bodyLimitBytes) {
          res.destroy();
        }
      });

      res.on('end', () => {
        finish({ status: res.statusCode, location: res.headers.location || '' });
      });

      res.on('close', () => {
        finish({ status: res.statusCode, location: res.headers.location || '' });
      });
    });

    req.on('error', (err) => {
      finish({ status: 0, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      finish({ status: 0, error: 'timeout' });
    });

    req.end();
  });
}

function shouldFallbackToGet(result) {
  return FALLBACK_STATUSES.has(result.status) || result.error === 'timeout';
}

async function headOrGet(target, options = {}) {
  const head = await requestStatus(target, { ...options, method: 'HEAD' });
  if (!shouldFallbackToGet(head)) return head;

  const get = await requestStatus(target, { ...options, method: 'GET' });
  return {
    ...get,
    headStatus: head.status,
    headError: head.error,
    fallbackFrom: 'HEAD',
  };
}

async function runWithConcurrency(items, fn, limit) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

module.exports = {
  DEFAULT_GET_BODY_LIMIT_BYTES,
  DEFAULT_TIMEOUT_MS,
  FALLBACK_STATUSES,
  headOrGet,
  requestStatus,
  runWithConcurrency,
};
