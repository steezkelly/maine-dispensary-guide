/**
 * signal-css-reachability.test.cjs
 *
 * Regression guard for the dark spot that cost the MDG Signal slice
 * 3 design rounds: the SignalLayout's <style> block was scoped by
 * default, but the slotted page content (cards, grids, pills, links)
 * carries a DIFFERENT (or no) data-astro-cid — so the scoped selectors
 * silently failed to apply and the page rendered with raw browser
 * defaults (borderless cards, raw blue links). Only a visual
 * screenshot caught it. The fix is to make the layout's <style>
 * `is:global` (safe because every selector is namespaced under the
 * unique `.signal-scope` root).
 *
 * This test reads the built /signal/index.html and asserts that the
 * CSS selectors that the page elements depend on are actually present
 * in the inline <style> block — without an `[data-astro-cid-*]`
 * attribute selector that would prevent them from matching page content.
 *
 * If a future Astro version changes how scoped-CSS rewriting works, or
 * someone accidentally drops the `is:global` on SignalLayout.astro,
 * this test fails fast instead of shipping a broken visual surface.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');

const STATIC_DIR = path.resolve(__dirname, '../../../.vercel/output/static');
const INDEX_HTML = path.join(STATIC_DIR, 'signal', 'index.html');
const PORTLAND_HTML = path.join(STATIC_DIR, 'signal', 'portland', 'index.html');

function findInlineStyle(html) {
  const m = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
  if (!m) return '';
  return m.join('\n');
}

test('signal-css-reachability: /signal/index.html exists and is non-empty', () => {
  assert.ok(fs.existsSync(INDEX_HTML), `missing ${INDEX_HTML} — run npm run build first`);
  const html = fs.readFileSync(INDEX_HTML, 'utf8');
  assert.ok(html.length > 10000, 'index.html is suspiciously small; build may be incomplete');
});

test('signal-css-reachability: SignalLayout CSS selectors are NOT scoped (no astro-cid attribute selectors)', () => {
  const css = findInlineStyle(fs.readFileSync(INDEX_HTML, 'utf8'));
  // Find every selector chain that starts with .signal-scope and has a
  // [data-astro-cid-*] attribute in the chain. Those would silently
  // fail to match slotted page content (the original scoped-CSS bug).
  //
  // Note: only flag selectors inside the .signal-scope namespace. Other
  // components (e.g. RelatedSignal.astro) have their own scoped CSS
  // that works because all their elements get the same cid.
  const scopedLines = css
    .split(/(?<=\})\s*/) // split on rule boundaries
    .filter((rule) => {
      if (!rule.includes('.signal-scope')) return false;
      return /\[data-astro-cid-[a-z0-9]+\]/.test(rule);
    });
  assert.deepEqual(
    scopedLines,
    [],
    `Found scoped-CSS attribute selectors in .signal-scope — these will silently fail to match slotted page content.\n` +
      `Offending rules:\n${scopedLines.join('\n')}\n\n` +
      `Fix: ensure SignalLayout.astro's <style> block uses \`is:global\`.`
  );
});

test('signal-css-reachability: critical selectors are present in the inline CSS', () => {
  const css = findInlineStyle(fs.readFileSync(INDEX_HTML, 'utf8'));
  // The page's cards, pills, links, tables, and topbar all depend on
  // these selectors. If any are missing, the corresponding element
  // rendered without design and the page looks broken.
  const required = [
    '.signal-scope .card',
    '.signal-scope .state-pill',
    '.signal-scope .grid',
    '.signal-scope a',
    '.signal-scope table',
    '.signal-scope .topbar',
    '.signal-scope .button',
    '.signal-scope .button.preview',
    '.signal-scope .bar',
    '.signal-scope .drawer',
  ];
  for (const sel of required) {
    assert.ok(
      css.includes(sel),
      `selector ${JSON.stringify(sel)} missing from inline CSS — the corresponding element will render unstyled`
    );
  }
});

test('signal-css-reachability: Preview buttons (proposed_paid) use outlined style, not filled', () => {
  // The Preview watchlist / Preview change alert buttons must NOT look
  // like primary CTAs. The .button.preview selector's background and
  // color must be DIFFERENT from the .button.primary (which uses
  // --spruce as background).
  const css = findInlineStyle(fs.readFileSync(INDEX_HTML, 'utf8'));
  const previewRule = css.match(/\.signal-scope\s+\.button\.preview\s*\{([^}]*)\}/);
  assert.ok(previewRule, '.button.preview rule missing');
  const body = previewRule[1];
  // If the rule is the OLD filled style, it'll have `background: var(--bronze)`
  // (bronze as the background) and `color: #fff`. The fix is to use
  // a low-opacity bronze tint with bronze text.
  assert.ok(
    /color-mix.*var\(--bronze\)/.test(body) || /background:\s*var\(--bronze\)/.test(body) === false,
    'Preview button should use a color-mix() bronze tint, not a solid bronze background'
  );
  // Bronze text, not white text
  assert.match(body, /color:\s*var\(--bronze\)/, 'Preview button text should be bronze, not white');
});

test('signal-css-reachability: /signal/portland/ also has reachable CSS', () => {
  // Guard against the case where the index page is fine but the
  // municipality page template breaks the CSS contract.
  assert.ok(fs.existsSync(PORTLAND_HTML), 'portland page missing');
  const css = findInlineStyle(fs.readFileSync(PORTLAND_HTML, 'utf8'));
  // Same as above: only flag selectors in the .signal-scope namespace
  const scopedLines = css
    .split(/(?<=\})\s*/)
    .filter((rule) => {
      if (!rule.includes('.signal-scope')) return false;
      return /\[data-astro-cid-[a-z0-9]+\]/.test(rule);
    });
  assert.deepEqual(
    scopedLines,
    [],
    'portland page has scoped-CSS selectors that will silently fail to match slotted content'
  );
  // The comparison table has special mobile rules — make sure they're present
  assert.ok(
    css.includes('#comparisonTable'),
    'comparison-table specific CSS missing — mobile overflow handling will break'
  );
});
