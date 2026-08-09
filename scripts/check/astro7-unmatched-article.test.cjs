const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('guide source does not close an article it does not open', () => {
  const guides = path.resolve(__dirname, '../../apps/maine-cannabis/src/pages/guides');
  const offenders = fs.readdirSync(guides)
    .filter((name) => name.endsWith('.astro'))
    .filter((name) => {
      const source = fs.readFileSync(path.join(guides, name), 'utf8');
      const opens = (source.match(/<article\b/g) || []).length;
      const closes = (source.match(/<\/article\s*>/g) || []).length;
      return opens !== closes;
    });
  assert.deepEqual(offenders, []);
});
