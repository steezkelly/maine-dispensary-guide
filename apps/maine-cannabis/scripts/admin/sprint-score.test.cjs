'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const scorePath = path.join(__dirname, 'sprint-score.cjs');

function loadCountHtmlPages(dist) {
  const source = fs
    .readFileSync(scorePath, 'utf8')
    .replace("const DIST = path.join(REPO, 'dist');", `const DIST = ${JSON.stringify(dist)};`)
    .replace(/main\(\);\s*$/, 'module.exports = { countHtmlPages };');
  const module = { exports: {} };
  vm.runInNewContext(source, {
    module,
    exports: module.exports,
    require,
    __dirname,
    __filename: scorePath,
    process,
    console,
  }, { filename: scorePath });
  return module.exports.countHtmlPages;
}

function writeRoute(dist, route, html) {
  const output = path.join(dist, ...route.split('/').filter(Boolean), 'index.html');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, html);
}

test('countHtmlPages excludes a rendered noindex route from sitemap-required pages', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-sprint-score-'));
  try {
    const dist = path.join(root, 'dist');
    writeRoute(dist, '/indexable', '<html><head></head><body>indexable</body></html>');
    writeRoute(dist, '/private', '<html><head><meta name="robots" content="noindex, nofollow"></head><body>private</body></html>');

    const countHtmlPages = loadCountHtmlPages(dist);
    assert.equal(countHtmlPages(), 1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('countHtmlPages recognizes noindex when robots attributes are reversed', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-sprint-score-'));
  try {
    const dist = path.join(root, 'dist');
    writeRoute(dist, '/indexable', '<html><head></head><body>indexable</body></html>');
    writeRoute(dist, '/private', '<html><head><meta content="noindex" name="robots"></head><body>private</body></html>');

    const countHtmlPages = loadCountHtmlPages(dist);
    assert.equal(countHtmlPages(), 1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
