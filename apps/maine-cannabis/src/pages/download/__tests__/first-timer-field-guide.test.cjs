// Regression: this landing page renders inside Layout's <main>, so a body-child
// hiding rule makes the entire page (including its H1) invisible.
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const PAGE = resolve(__dirname, '..', 'first-timer-field-guide.astro');

test('first-timer landing page does not hide the Layout shell', () => {
  const source = readFileSync(PAGE, 'utf8');

  assert.doesNotMatch(
    source,
    /:global\(body\s*>\s*\*:not\(\.landing-page\)/,
    'the page must not hide Layout children; .landing-page is nested inside Layout main',
  );
});
