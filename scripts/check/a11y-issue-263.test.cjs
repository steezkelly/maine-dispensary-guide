'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

const theme = read('apps/maine-cannabis/src/styles/theme-2026.css');
const globals = read('apps/maine-cannabis/src/styles/globals.css');
const homepage = read('apps/maine-cannabis/src/pages/index.astro');
const header = read('apps/maine-cannabis/src/components/SiteHeader.astro');

test('dark theme article links have an explicit dark-mode cascade rule', () => {
  const darkLinkRules = theme.match(/html\[data-theme="dark"\][^{]+\{[^}]+\}/gs) || [];
  assert.ok(
    darkLinkRules.some((rule) => /(?:\.article-content|\.guide-content)\s+a/.test(rule) && /color:\s*var\(--color-link\)/.test(rule)),
    'dark-mode article/guide links must explicitly resolve to the dark link token',
  );
  assert.match(theme, /html\[data-theme="dark"\][^{]+\{[^}]*color:\s*var\(--color-link\)\s*!important/s);
  assert.match(
    theme,
    /html\[data-theme="dark"\][^{]+:hover[^ {]*[^}]*color:\s*var\(--color-link-hover\)\s*!important/s,
    'dark-mode prose-link hover must resolve to the dark hover token',
  );
  assert.doesNotMatch(theme, /transition:\s*color\s+\.18s/);
});

test('focused skip link leaves the sr-only clipping state', () => {
  const focusRule = globals.match(/\.skip-link:focus\s*\{[^}]+\}/s)?.[0] || '';
  assert.match(focusRule, /position:\s*fixed/);
  assert.match(focusRule, /width:\s*auto/);
  assert.match(focusRule, /height:\s*auto/);
  assert.match(focusRule, /padding:\s*1rem/);
  assert.match(focusRule, /clip:\s*auto/);
  assert.match(focusRule, /overflow:\s*visible/);
});

test('homepage uses Layout\'s single main landmark', () => {
  assert.doesNotMatch(homepage, /<main\s+class="homepage-editorial"/);
  assert.match(homepage, /<(?:div|section)\s+class="homepage-editorial"/);
});

test('mobile menu trigger exposes and synchronizes expanded state', () => {
  const trigger = header.match(/<label\s+for="nav-toggle"[^>]*id="mobile-menu-trigger"[^>]*>/)?.[0] || '';
  assert.match(trigger, /role="button"/);
  assert.match(trigger, /tabindex="0"/);
  assert.match(trigger, /aria-controls="navigation-menu"/);
  assert.match(trigger, /aria-expanded="false"/);
  assert.match(header, /navToggle\.addEventListener\(['"]change['"]/);
  assert.match(header, /setAttribute\(['"]aria-expanded['"]/);
  assert.match(header, /navToggle\.click\(\)/);
});
