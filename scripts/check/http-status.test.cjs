const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const { headOrGet, runWithConcurrency } = require('./lib/http-status.cjs');

function withServer(handler) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(handler);
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((res, rej) => server.close((err) => err ? rej(err) : res())),
      });
    });
  });
}

test('headOrGet returns HEAD result when status is definitive', async () => {
  const seen = [];
  const server = await withServer((req, res) => {
    seen.push(req.method);
    res.writeHead(200).end();
  });

  try {
    const result = await headOrGet(server.url + '/ok');
    assert.equal(result.status, 200);
    assert.equal(result.method, 'HEAD');
    assert.deepEqual(seen, ['HEAD']);
  } finally {
    await server.close();
  }
});

test('headOrGet falls back to capped GET for ambiguous HEAD statuses', async () => {
  const seen = [];
  const server = await withServer((req, res) => {
    seen.push(req.method);
    if (req.method === 'HEAD') {
      res.writeHead(405).end();
      return;
    }
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('x'.repeat(1024));
  });

  try {
    const result = await headOrGet(server.url + '/head-blocked', { bodyLimitBytes: 32 });
    assert.equal(result.status, 200);
    assert.equal(result.method, 'GET');
    assert.equal(result.headStatus, 405);
    assert.equal(result.fallbackFrom, 'HEAD');
    assert.deepEqual(seen, ['HEAD', 'GET']);
  } finally {
    await server.close();
  }
});

test('runWithConcurrency preserves item order', async () => {
  const results = await runWithConcurrency([3, 2, 1], async (item) => item * 2, 2);
  assert.deepEqual(results, [6, 4, 2]);
});
