const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function stripFrontmatter(source) {
  if (!source.startsWith('---')) return source;
  const close = source.indexOf('---', 3);
  return close === -1 ? source : source.slice(close + 3);
}

test('every CityGuide opening tag is closed in the same template', () => {
  const guidesDir = path.resolve(__dirname, '../../apps/maine-cannabis/src/pages/guides');
  const offenders = fs.readdirSync(guidesDir)
    .filter((name) => name.endsWith('.astro'))
    .filter((name) => {
      const body = stripFrontmatter(fs.readFileSync(path.join(guidesDir, name), 'utf8'));
      const opens = (body.match(/<CityGuide\b/g) || []).length;
      const closes = (body.match(/<\/CityGuide\s*>/g) || []).length;
      return opens !== closes;
    });
  assert.deepEqual(offenders, []);
});
