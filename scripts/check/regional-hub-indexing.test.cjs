const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../..');
const pagesRoot = path.join(repoRoot, 'apps/maine-cannabis/src/pages');
const distRoot = path.join(repoRoot, 'dist');
const placeholderMarker = /editorial body placeholder/i;
const literalNoindex = /\bnoindex\s*=\s*\{true\}/;
const regionalHubSlugs = [
  'central-western-maine-cannabis-guide',
  'midcoast-waldo-northern-maine-cannabis-guide',
  'southern-maine-york-county-cannabis-guide',
];

function walkAstroFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkAstroFiles(absolute);
    return entry.isFile() && entry.name.endsWith('.astro') ? [absolute] : [];
  });
}

test('editorial placeholder pages fail closed with a literal noindex contract', () => {
  const placeholderPages = walkAstroFiles(pagesRoot)
    .map((file) => ({ file, source: fs.readFileSync(file, 'utf8') }))
    .filter(({ source }) => placeholderMarker.test(source));

  assert.ok(placeholderPages.length > 0, 'fixture must discover at least one editorial placeholder page');
  for (const { file, source } of placeholderPages) {
    assert.match(
      source,
      literalNoindex,
      `${path.relative(repoRoot, file)} contains editorial placeholder copy but is indexable`,
    );
  }
});

test('built placeholder hubs emit noindex and stay out of the sitemap', {
  skip: !fs.existsSync(path.join(distRoot, 'sitemap-0.xml')),
}, () => {
  const sitemap = fs.readFileSync(path.join(distRoot, 'sitemap-0.xml'), 'utf8');

  for (const slug of regionalHubSlugs) {
    const htmlPath = path.join(distRoot, 'guides', slug, 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    assert.match(html, /<meta name="robots" content="noindex">/);
    assert.doesNotMatch(sitemap, new RegExp(`/guides/${slug}(?:<|/)`));
  }
});
