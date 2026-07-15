#!/usr/bin/env node
const assert = require('node:assert/strict');

const {
  normalizeChangedAstroPath,
  parseAstroDiagnosticBlocks,
  relevantAstroDiagnosticBlocks,
} = require('../pre-push-verify.cjs');

const changed = [
  'apps/maine-cannabis/src/pages/blog/index.astro',
];

const output = `
src/pages/guides/index.astro:12:5 - error ts(2322): Type 'number' is not assignable to type 'string'.

12 const guideTitle: string = 123;
       ~~~~~~~~~~

src/pages/blog/index.astro:7:3 - error ts(2339): Property 'missing' does not exist on type '{}'.

7  post.missing
   ~~~~~~~~~~~~

src/pages/blog/other.astro:3:1 - warning ts(6133): 'unused' is declared but its value is never read.

3 const unused = true;
  ~~~~~
`;

const normalized = normalizeChangedAstroPath('apps/maine-cannabis/src/pages/blog/index.astro');
assert.equal(normalized.repoRelative, 'apps/maine-cannabis/src/pages/blog/index.astro');
assert.equal(normalized.appRelative, 'src/pages/blog/index.astro');
assert.deepEqual(normalized.candidates, [
  'apps/maine-cannabis/src/pages/blog/index.astro',
  'src/pages/blog/index.astro',
]);

const blocks = parseAstroDiagnosticBlocks(output);
assert.equal(blocks.length, 3);

const relevant = relevantAstroDiagnosticBlocks(output, changed);
assert.equal(relevant.length, 1);
assert.match(relevant[0], /src\/pages\/blog\/index\.astro/);
assert.doesNotMatch(relevant[0], /src\/pages\/guides\/index\.astro/);
assert.doesNotMatch(relevant[0], /src\/pages\/blog\/other\.astro/);

console.log('pre-push astro diagnostic filtering regression: PASS');
