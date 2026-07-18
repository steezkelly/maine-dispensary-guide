const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readHero() {
  return fs.readFileSync(path.resolve(__dirname, '../AuthorityHero.astro'), 'utf8');
}

test('AuthorityHero renders one plain editorial authority section with the approved destinations', () => {
  const source = readHero();

  assert.match(source, /sectionId\?: string/);
  assert.match(source, /<section\s+id=\{sectionId\}[^>]*aria-labelledby=\{renderTitle \? 'authority-title' : undefined\}[^>]*aria-label=\{renderTitle \? undefined : title\}/);
  assert.match(source, /renderTitle\?: boolean/);
  assert.match(source, /renderTitle && <h1\s+id="authority-title">\{title\}<\/h1>/);
  assert.match(source, /href="\/guides"/);
  assert.match(source, /href="\/roi-calculator"/);
  assert.match(source, /data-cta-id=\{primaryCtaId\}/);
  assert.match(source, /data-cta-id=\{secondaryCtaId\}/);
  assert.match(source, /\.btn-primary\s*\{[^}]*min-block-size:\s*44px/);
  assert.match(source, /font-family:\s*var\(--font-serif\)/);
});