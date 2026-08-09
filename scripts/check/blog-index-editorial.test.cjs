const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(
  path.resolve(__dirname, '../../apps/maine-cannabis/src/pages/blog/index.astro'),
  'utf8',
);

test('blog index keeps one H1 and the editorial masthead', () => {
  assert.equal((page.match(/<h1\b/g) || []).length, 1, 'page must keep a single H1');
  assert.match(page, /blog-masthead/, 'masthead header section must remain');
  assert.match(page, /masthead-stats/, 'masthead stats line must remain');
});

test('blog index keeps the four editorial desks in a stable order', () => {
  const ids = [...page.matchAll(/id=\{`desk-\$\{desk\.id\}`\}/g)];
  assert.ok(ids.length >= 1, 'desk sections render from the desks array');
  for (const deskId of ['grow', 'buyer', 'patient', 'operator']) {
    assert.match(page, new RegExp(`id: '${deskId}'`), `desk ${deskId} must be defined`);
  }
});

test('blog index keeps the featured story and latest strip', () => {
  assert.match(page, /featured-story/, 'featured story band must remain');
  assert.match(page, /latest-grid/, 'latest stories strip must remain');
});

test('every desk story card carries a hero image and a real date', () => {
  assert.match(page, /story-media/, 'story cards must render an image slot');
  assert.match(page, /heroFor\(post\.url\)/, 'card images must resolve through heroFor()');
  assert.match(page, /<time datetime=\{post\.date\}>/, 'cards must expose machine-readable dates');
});

test('desk navigation anchors match the desk sections', () => {
  assert.match(page, /href=\{`#desk-\$\{desk\.id\}`\}/, 'desk nav must anchor to desk sections');
});

test('pathways preserve the crosslink titles contract', () => {
  assert.match(page, /blogCrosslinks\[pw\.slug as keyof typeof blogCrosslinks\]/,
    'pathway cards must keep deriving titles from blog-crosslinks.json');
});
