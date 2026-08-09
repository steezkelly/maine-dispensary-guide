const test = require('node:test');
const assert = require('node:assert/strict');
const { findStrayAutoRelatedDivs } = require('./astro7-autorelated-div-repair.cjs');

test('finds a stray div when AutoRelated is directly inside a section', () => {
  const source = '<section><p>Copy</p><AutoRelated currentPath="/x" /></div></section>';
  assert.deepEqual(findStrayAutoRelatedDivs(source), [52]);
});

test('preserves a valid div enclosing AutoRelated', () => {
  const source = '<section><div class="related"><AutoRelated currentPath="/x" /></div></section>';
  assert.deepEqual(findStrayAutoRelatedDivs(source), []);
});

test('ignores AutoRelated-looking text in style and script blocks', () => {
  const source = '<style>.x { content: "<AutoRelated /></div></section>" }</style><section><div><AutoRelated /></div></section><script>"<AutoRelated /></div></section>"</script>';
  assert.deepEqual(findStrayAutoRelatedDivs(source), []);
});
