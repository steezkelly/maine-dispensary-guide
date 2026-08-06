'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright');

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

test('mobile drawer state is responsive and restores focus on close', () => {
  const drawer = header.match(/<div\s+class="nav-links"\s+id="navigation-menu"[^>]*>/)?.[0] || '';
  assert.doesNotMatch(drawer, /aria-hidden="true"/);
  assert.doesNotMatch(drawer, /\binert\b/);
  assert.match(header, /window\.matchMedia\(['"]\(max-width: 768px\)['"]\)/);
  assert.match(header, /mobileViewport\.addEventListener\(['"]change['"]/);
  assert.match(header, /navigationMenu\.setAttribute\(['"]aria-hidden['"]/);
  assert.match(header, /navigationMenu\.inert\s*=/);
  assert.match(header, /navigationMenu\.contains\(document\.activeElement\)/);
  assert.match(header, /mobileMenuTrigger\.focus\(\)/);
});

test('no-script mobile fallback exposes navigation without an open-only drawer', () => {
  const fallback = header.match(/<noscript>([\s\S]*?)<\/noscript>/)?.[1] || '';
  assert.match(fallback, /\.nav-toggle-label[^{]*\{[^}]*display:\s*none\s*!important/s);
  assert.match(fallback, /\.nav-toggle[^{]*\{[^}]*display:\s*none\s*!important/s);
  assert.match(fallback, /\.nav-links[^{]*\{[^}]*visibility:\s*visible\s*!important/s);
  assert.match(fallback, /\.nav-links[^{]*\{[^}]*pointer-events:\s*auto\s*!important/s);
  assert.match(fallback, /\.nav-links[^{]*\{[^}]*position:\s*static\s*!important/s);
});

test('no-script mobile fallback keeps static links visible and removes inert dropdown controls', () => {
  const fallback = header.match(/<noscript>([\s\S]*?)<\/noscript>/)?.[1] || '';
  assert.match(
    fallback,
    /\.nav-links\s+a\s*\{[^}]*opacity:\s*1\s*!important/s,
    'static navigation links must not retain the closed-drawer opacity',
  );
  assert.match(
    fallback,
    /\.nav-dropdown\s+\.dropbtn\s*\{[^}]*display:\s*none\s*!important/s,
    'no-script dropdown buttons must not remain invisible focus targets',
  );
  assert.match(
    fallback,
    /\.nav-dropdown\s+\.dropdown-content\s*,\s*#site-nav\s+\.nav-dropdown\s+\.dropdown-content\.multi-column\s*\{[^}]*display:\s*block\s*!important/s,
    'no-script fallback must override the collapsed dropdown content cascade',
  );
  assert.match(
    fallback,
    /\.nav-dropdown\s+\.dropdown-content\s*,\s*#site-nav\s+\.nav-dropdown\s+\.dropdown-content\.multi-column\s*\{[^}]*min-width:\s*0\s*!important[^}]*width:\s*100%\s*!important/s,
    'no-script fallback must reset desktop dropdown width constraints on mobile',
  );
});

test('no-script mobile fallback keeps every static link in the viewport flow', () => {
  const fallback = header.match(/<noscript>([\s\S]*?)<\/noscript>/)?.[1] || '';
  const staticNav = fallback.match(/#site-nav\s+\.nav-links\s*\{[^}]+\}/s)?.[0] || '';
  const staticDropdown = fallback.match(/#site-nav\s+\.nav-dropdown\s+\.dropdown-content[\s\S]*?\{[^}]+\}/s)?.[0] || '';

  assert.match(fallback, /#site-nav\s*\{[^}]*flex-wrap:\s*wrap\s*!important/s);
  assert.match(staticNav, /flex:\s*0\s+0\s+100%\s*!important/);
  assert.match(staticNav, /order:\s*3\s*!important/);
  assert.match(staticNav, /box-sizing:\s*border-box\s*!important/);
  assert.match(staticNav, /max-width:\s*100%\s*!important/);
  assert.match(staticNav, /align-items:\s*stretch\s*!important/);
  assert.match(staticDropdown, /position:\s*static\s*!important/);
  assert.match(staticDropdown, /inset:\s*auto\s*!important/);
  assert.match(staticDropdown, /left:\s*auto\s*!important/);
  assert.match(staticDropdown, /transform:\s*none\s*!important/);
  assert.match(staticDropdown, /max-width:\s*100%\s*!important/);
});

function startStaticServer(root) {
  return new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      const pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
      const relative = pathname === '/'
        ? 'index.html'
        : (path.extname(pathname) ? pathname : path.join(pathname, 'index.html'));
      const target = path.resolve(root, relative.replace(/^\/+/, ''));
      if (!target.startsWith(`${root}${path.sep}`) || !fs.existsSync(target)) {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, { 'content-type': path.extname(target) === '.css' ? 'text/css' : 'text/html' });
      fs.createReadStream(target).pipe(response);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

test('rendered no-script mobile navigation keeps every link inside the viewport', { timeout: 120_000 }, async (t) => {
  execFileSync('npm', ['--workspace', '@network/maine-cannabis', 'run', 'build'], { cwd: ROOT, stdio: 'pipe' });
  const dist = path.join(ROOT, 'apps/maine-cannabis/dist');
  assert.ok(fs.existsSync(path.join(dist, 'index.html')), 'workspace build must emit a homepage artifact');

  const server = await startStaticServer(dist);
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  t.after(() => context.close());
  const page = await context.newPage();
  const { port } = server.address();
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });

  const report = await page.evaluate(() => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    links: [...document.querySelectorAll('#navigation-menu a')].map((link) => {
      const rect = link.getBoundingClientRect();
      const style = getComputedStyle(link);
      link.focus();
      return {
        text: link.textContent.trim(), left: rect.left, right: rect.right,
        width: rect.width, height: rect.height, opacity: style.opacity,
        display: style.display, visibility: style.visibility,
        focused: document.activeElement === link,
      };
    }),
    controls: [...document.querySelectorAll('#navigation-menu button')].map((button) => {
      const style = getComputedStyle(button);
      return { display: style.display, visibility: style.visibility };
    }),
  }));

  assert.equal(report.documentWidth <= report.viewport, true, JSON.stringify(report));
  assert.equal(report.links.length, 70, JSON.stringify(report));
  for (const link of report.links) {
    assert.equal(link.opacity, '1', `transparent link: ${JSON.stringify(link)}`);
    assert.notEqual(link.display, 'none', `display:none link: ${JSON.stringify(link)}`);
    assert.notEqual(link.visibility, 'hidden', `hidden link: ${JSON.stringify(link)}`);
    assert.equal(link.width > 0 && link.height > 0 && link.focused, true, `inaccessible link: ${JSON.stringify(link)}`);
    assert.equal(link.left >= 0 && link.right <= report.viewport, true, `out-of-viewport link: ${JSON.stringify(link)}`);
  }
  for (const control of report.controls) {
    assert.equal(control.display === 'none' || control.visibility === 'hidden', true, `exposed no-JS control: ${JSON.stringify(control)}`);
  }
});
