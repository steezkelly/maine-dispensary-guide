const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(
  path.resolve(__dirname, '../../apps/maine-cannabis/src/pages/blog/index.astro'),
  'utf8',
);

test('blog index is driven by the generated blog-index.json, not a hardcoded list', () => {
  assert.match(page, /import\s+blogIndex\s+from\s+['"]\.\.\/\.\.\/data\/blog-index\.json['"]/,
    'page must consume the build-generated blog index');
  assert.doesNotMatch(page, /url:\s*'\/blog\/how-much-weed/,
    'page must not keep a hardcoded posts array');
});

test('generated index stays healthy: posts exist, all have heroes and dates', () => {
  const generated = JSON.parse(fs.readFileSync(
    path.resolve(__dirname, '../../apps/maine-cannabis/src/data/blog-index.json'),
    'utf8',
  ));
  assert.ok(generated.items.length >= 53, 'blog index shrank unexpectedly');
  for (const item of generated.items) {
    assert.ok(item.title, `missing title: ${item.slug}`);
    assert.ok(item.date, `missing date: ${item.slug}`);
    assert.ok(item.heroImage, `missing heroImage: ${item.slug}`);
  }
});

test('the dispensary-license companion stays linked for internal equity', () => {
  assert.match(page, /\/guides\/maine-dispensary-license/,
    'the /guides/maine-dispensary-license companion must remain on the blog index');
});

test('blog index keeps one H1 and the plain-language masthead', () => {
  assert.equal((page.match(/<h1\b/g) || []).length, 1, 'page must keep a single H1');
  assert.match(page, /blog-masthead/, 'masthead header section must remain');
  assert.match(page, /guides &amp; articles|guides & articles/,
    'masthead stats must use plain language, not jargon');
  assert.match(page, /term-tip/, 'editorial terms must carry an explanatory tooltip');
});

test('blog index keeps the four topics in a stable order', () => {
  for (const topicId of ['grow', 'buyer', 'patient', 'operator']) {
    assert.match(page, new RegExp(`id: '${topicId}'`), `topic ${topicId} must be defined`);
  }
});

test('blog index keeps the featured story and an explicit Latest section', () => {
  assert.match(page, /featured-story/, 'featured story band must remain');
  assert.match(page, /latest-strip/, 'latest articles strip must remain');
  assert.match(page, /Latest articles/, 'the Latest section needs a plain-language heading');
});

test('every story card carries a hero image and a real date', () => {
  assert.match(page, /story-media/, 'story cards must render an image slot');
  assert.match(page, /hero640\(post\.hero\)/, 'card images must resolve through hero640()');
  assert.match(page, /<time datetime=\{post\.date\}>/, 'cards must expose machine-readable dates');
});

test('topic navigation anchors match the topic sections', () => {
  assert.match(page, /href=\{`#topic-\$\{topic\.id\}`\}/, 'topic nav must anchor to topic sections');
});

test('pathways preserve the crosslink titles contract', () => {
  assert.match(page, /blogCrosslinks\[pw\.slug as keyof typeof blogCrosslinks\]/,
    'pathway cards must keep deriving titles from blog-crosslinks.json');
});
