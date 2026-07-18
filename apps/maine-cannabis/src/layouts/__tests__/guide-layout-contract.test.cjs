const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../../../..');
const layoutPath = path.join(root, 'apps/maine-cannabis/src/layouts/Layout.astro');
const componentsPath = path.join(root, 'apps/maine-cannabis/src/styles/components.css');
const globalsPath = path.join(root, 'apps/maine-cannabis/src/styles/globals.css');

const layout = fs.readFileSync(layoutPath, 'utf8');
const components = fs.readFileSync(componentsPath, 'utf8');
const allStyles = components + '\n' + fs.readFileSync(globalsPath, 'utf8');

test('shared styles provide a guide-layout grid that collapses on small viewports', () => {
  assert.match(allStyles, /\.guide-layout\s*\{[\s\S]*?display:\s*grid[\s\S]*?\}/, 'shared CSS must define .guide-layout as grid');
  assert.match(
    allStyles,
    /\.guide-layout[\s\S]{0,400}?grid-template-columns:\s*[^;]+;/,
    '.guide-layout must declare grid-template-columns for the desktop reading shell',
  );
  assert.match(
    allStyles,
    /\.guide-content\s*\{[\s\S]*?min-width:\s*0[\s\S]*?\}/,
    '.guide-content must allow its children to shrink so wide tables cannot overflow the column',
  );
  assert.match(
    allStyles,
    /@media\s*\(max-width:\s*[\d.]+(?:rem|px)[^)]*\)[\s\S]*?\.guide-layout\s*\{[\s\S]*?grid-template-columns:\s*1fr[\s\S]*?\}/,
    '.guide-layout must collapse to a single column on small viewports',
  );
});

test('Layout mounts the guide sidebar as an aside outside the article element', () => {
  const layoutExcerpt = layout.slice(layout.indexOf('isGuide'));
  assert.match(
    layoutExcerpt,
    /<div\s+class="guide-layout">\s*<div\s+class="guide-content">[\s\S]*?<\/div>\s*<aside\s+class="guide-sidebar-container"[^>]*aria-label="[^"]+"/,
    'Layout must wrap the article column and the sidebar aside inside a guide-layout grid',
  );
  const articleStart = layoutExcerpt.indexOf('class="guide-content"');
  const sidebarStart = layoutExcerpt.indexOf('class="guide-sidebar-container"');
  assert.ok(articleStart >= 0 && sidebarStart > articleStart, 'sidebar must render after the article column');
});
