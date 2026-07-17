'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const test = require('node:test');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const APP = path.join(ROOT, 'apps', 'maine-cannabis', 'src');
const EDITORIAL = path.join(APP, 'data', 'continuation', 'editorial-next-steps.ts');
const ACTIONS = path.join(APP, 'data', 'continuation', 'contextual-actions.ts');
const EDITORIAL_COMPONENT = path.join(APP, 'components', 'continuation', 'EditorialNextStep.astro');
const ACTION_COMPONENT = path.join(APP, 'components', 'continuation', 'ContextualAction.astro');
const LAYOUT = path.join(APP, 'layouts', 'Layout.astro');

const PILOT_ROUTES = [
  '/guides/maine-dispensary-license',
  '/guides/maine-cannabis-opt-in-tracker',
  '/guides/maine-cannabis-zoning-requirements',
  '/guides/maine-cannabis-site-selection',
  '/guides/maine-cannabis-inventory-management',
  '/guides/maine-metrc-compliance-guide',
  '/blog/best-maine-edibles-2026',
  '/blog/best-maine-dispensaries-2026',
  '/blog/maine-dispensary-gift-cards',
  '/guides/machias-dispensary-guide',
];

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function pageFile(route) {
  const clean = route.replace(/^\//, '').replace(/\/$/, '');
  const direct = path.join(APP, 'pages', `${clean}.astro`);
  if (fs.existsSync(direct)) return direct;
  return path.join(APP, 'pages', clean, 'index.astro');
}

function bundleModule(entry) {
  const built = esbuild.buildSync({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    write: false,
    logLevel: 'silent',
  });
  const filename = `${entry}.compiled.cjs`;
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(entry));
  mod._compile(built.outputFiles[0].text, filename);
  return mod.exports;
}

function assertUnique(values, label) {
  assert.equal(new Set(values).size, values.length, `${label} must be unique`);
}

test('typed registries expose one high-confidence mapping per exact pilot path', () => {
  const editorial = bundleModule(EDITORIAL);
  const actions = bundleModule(ACTIONS);

  assert.deepEqual(editorial.editorialNextSteps.map((item) => item.sourcePath).sort(), [...PILOT_ROUTES].sort());
  assert.deepEqual(actions.contextualActions.map((item) => item.sourcePath).sort(), [...PILOT_ROUTES].sort());
  assertUnique(editorial.editorialNextSteps.map((item) => item.id), 'editorial IDs');
  assertUnique(editorial.editorialNextSteps.map((item) => item.sourcePath), 'editorial source paths');
  assertUnique(actions.contextualActions.map((item) => item.id), 'action IDs');
  assertUnique(actions.contextualActions.map((item) => item.sourcePath), 'action source paths');

  for (const route of PILOT_ROUTES) {
    const next = editorial.getEditorialNextStep(route);
    const action = actions.getContextualAction(route);
    assert.equal(next?.confidence, 'high');
    assert.equal(action?.confidence, 'high');
    assert.equal(next?.sourcePath, route);
    assert.equal(action?.sourcePath, route);
    assert.ok(next.reason.trim().length >= 24, `${route} needs a useful editorial reason`);
    assert.ok(action.description.trim().length >= 24, `${route} needs a useful action description`);
  }

  assert.equal(editorial.getEditorialNextStep('/not-a-pilot'), undefined);
  assert.equal(actions.getContextualAction('/not-a-pilot'), undefined);
  assert.equal(editorial.getEditorialNextStep(`${PILOT_ROUTES[0]}/`), undefined, 'lookup must be exact');
});

test('all editorial destinations and contextual hrefs resolve to current routes', () => {
  const { editorialNextSteps } = bundleModule(EDITORIAL);
  const { contextualActions } = bundleModule(ACTIONS);
  const actionFamilies = new Set(['directory', 'calculator', 'download', 'lead_magnet', 'contact', 'dataset', 'affiliate']);

  for (const item of editorialNextSteps) {
    assert.match(item.destinationPath, /^\/(?!\/)/, `${item.id} must use an internal path`);
    assert.ok(fs.existsSync(pageFile(item.destinationPath)), `${item.id} destination missing: ${item.destinationPath}`);
    assert.ok(item.relationship);
  }
  for (const item of contextualActions) {
    assert.match(item.href, /^\/(?!\/)/, `${item.id} must use an internal path in release 1`);
    assert.ok(fs.existsSync(pageFile(item.href)), `${item.id} href missing: ${item.href}`);
    assert.ok(actionFamilies.has(item.actionFamily), `${item.id} action family invalid`);
    if (item.actionFamily === 'affiliate') assert.ok(item.disclosure?.trim(), `${item.id} requires disclosure`);
  }
});

test('continuation components keep editorial and action slots distinct and crawlable', () => {
  const editorial = read(EDITORIAL_COMPONENT);
  const action = read(ACTION_COMPONENT);
  assert.match(editorial, /class="editorial-next-step"/);
  assert.match(editorial, /data-continuation-relationship/);
  assert.match(editorial, /data-cta-id=/);
  assert.match(editorial, /href=\{rule\.destinationPath\}/);
  assert.match(editorial, /prefers-reduced-motion: reduce/);
  assert.match(editorial, /editorial-next-step__link::after/);
  assert.match(action, /class="contextual-action__link btn"/);
  assert.match(action, /\.contextual-action \.contextual-action__link \{/);
  assert.match(action, /prefers-reduced-motion: reduce/);
  assert.match(action, /contextual-action__link::after/);
  assert.match(action, /data-action-family/);
  assert.match(action, /data-cta-id=/);
  assert.match(action, /href=\{rule\.href\}/);
  assert.doesNotMatch(editorial, /affiliate|lead_magnet|conversion/i, 'editorial slot must not carry commercial ranking metadata');
});

test('Layout defaults to legacy and renders pilot slots in the approved order', () => {
  const layout = read(LAYOUT);
  assert.match(layout, /continuationMode\?: 'legacy' \| 'pilot'/);
  assert.match(layout, /continuationMode = 'legacy'/);
  assert.match(layout, /<LegacyLeadCapture\s*\/>/);
  const editorialAt = layout.indexOf('<EditorialNextStep');
  const actionAt = layout.indexOf('<ContextualAction');
  const relatedAt = layout.indexOf('<AutoRelated', actionAt);
  assert.ok(editorialAt >= 0 && actionAt > editorialAt && relatedAt > actionAt, 'pilot order must be Editorial → Contextual → AutoRelated');
});

test('v1 action funnel preserves legacy reach and pairs every selection with an exposure', () => {
  const layout = read(LAYOUT);
  assert.match(layout, /function legacyCtaView\(target\)/);
  assert.match(layout, /send\('cta_view', \{/);
  assert.match(layout, /function exposeAction\(target\)/);
  assert.match(layout, /sendAction\('mdg_action_exposure', actionMetadata\(target\)\)/);
  const clickHandler = layout.slice(layout.indexOf("document.addEventListener('click'"));
  assert.ok(clickHandler.indexOf('exposeAction(target);') < clickHandler.indexOf("sendAction('mdg_action_select'"), 'selection must emit its paired exposure first');
});

test('v1 active attention requires 30 seconds of accumulated foreground time', () => {
  const layout = read(LAYOUT);
  assert.match(layout, /var foregroundElapsedMs = 0/);
  assert.match(layout, /function foregroundAttentionMs\(\)/);
  assert.match(layout, /foregroundAttentionMs\(\) < 30000/);
  assert.match(layout, /foregroundElapsedMs = foregroundAttentionMs\(\)/);
  assert.match(layout, /markActiveAttention\(\);\n\s*scheduleActiveAttention\(\);/);
  assert.doesNotMatch(layout, /visibilityState === 'visible'\) \{\n\s*markEngaged\('visibility_returned'\);\n\s*\}/, 'a visibility return must not directly mark active attention');
});

test('all pilot pages opt in and have exactly one Layout-owned discovery rail', () => {
  for (const route of PILOT_ROUTES) {
    const source = read(pageFile(route));
    assert.match(source, /continuationMode="pilot"/, `${route} must opt in`);
    assert.doesNotMatch(source, /import AutoRelated|<AutoRelated/, `${route} must not render a duplicate page-level discovery rail`);
    assert.doesNotMatch(
      source,
      /class="(?:further-reading|related-content)"/,
      `${route} must not retain a page-level manual discovery rail`,
    );
    assert.doesNotMatch(
      source,
      /<(?:section|div)[^>]*class="(?:related-guides|further-reading)"[^>]*>\s*<\/(?:section|div)>/,
      `${route} must not leave an empty legacy continuation wrapper`,
    );
    const layoutClose = source.lastIndexOf('</Layout>');
    if (layoutClose >= 0) {
      assert.equal(source.slice(layoutClose + '</Layout>'.length).trim(), '', `${route} must keep complete answer content inside Layout`);
    }
  }
  const legacy = read(pageFile('/guides/maine-cannabis-regulations'));
  assert.doesNotMatch(legacy, /continuationMode="pilot"/, 'non-pilot control must retain legacy default');
});

test('release-1 continuation surface excludes deferred architecture', () => {
  const source = [EDITORIAL, ACTIONS, EDITORIAL_COMPONENT, ACTION_COMPONENT]
    .map(read)
    .join('\n');
  for (const prohibited of ['localStorage', 'Math.random', 'journeyGraph', 'JourneyProgress', 'ContinueTask', 'Thompson']) {
    assert.equal(source.includes(prohibited), false, `${prohibited} is deferred`);
  }
});
