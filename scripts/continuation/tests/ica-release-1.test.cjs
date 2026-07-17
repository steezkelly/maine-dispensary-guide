'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const vm = require('node:vm');
const test = require('node:test');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const APP = path.join(ROOT, 'apps', 'maine-cannabis', 'src');
const EDITORIAL = path.join(APP, 'data', 'continuation', 'editorial-next-steps.ts');
const ACTIONS = path.join(APP, 'data', 'continuation', 'contextual-actions.ts');
const EDITORIAL_COMPONENT = path.join(APP, 'components', 'continuation', 'EditorialNextStep.astro');
const ACTION_COMPONENT = path.join(APP, 'components', 'continuation', 'ContextualAction.astro');
const REGION_HUB = path.join(APP, 'components', 'RegionHubShell.astro');
const FIND_A_DISPENSARY = path.join(APP, 'pages', 'find-a-dispensary.astro');
const RESOURCES = path.join(APP, 'pages', 'resources.astro');
const LAYOUT = path.join(APP, 'layouts', 'Layout.astro');
const FUNNEL_SQL = path.join(ROOT, 'apps', 'maine-cannabis', 'docs', 'analytics', 'mdg-action-funnel-v1.sql');

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

function regionHubActionIds(source, guideHrefs) {
  const helper = source.match(/function regionHubActionId\([^)]*\)\s*(?::\s*string)?\s*\{[\s\S]*?\n\}/);
  assert.ok(helper, 'RegionHub must define one deterministic action-ID helper');
  const executable = helper[0].replace(/: string(?=\s*[,)]|\s*\{)/g, '');
  const regionHubActionId = vm.runInNewContext(`"use strict"; ${executable}; regionHubActionId`);
  return guideHrefs.flatMap((href) => [
    regionHubActionId(href, 'guide'),
    regionHubActionId(href, 'map'),
  ]);
}

test('RegionHub CTA IDs distinguish every guide destination and action type', () => {
  const source = read(REGION_HUB);
  assert.match(source, /data-cta-id=\{regionHubActionId\(g\.href, 'guide'\)\}/);
  assert.match(source, /data-cta-id=\{regionHubActionId\(g\.href, 'map'\)\}/);

  const ids = regionHubActionIds(source, [
    '/guides/alpha-dispensary-guide',
    '/guides/beta-dispensary-guide',
  ]);
  assertUnique(ids, 'multi-guide RegionHub CTA IDs');
  assert.notEqual(ids[0], ids[1], 'guide and map CTAs for one guide need distinct action IDs');
  assert.notEqual(ids[0], ids[2], 'different guide destinations cannot share an exposure bucket');
});

function findADispensaryActionIds(source, calls) {
  const helper = source.match(/function findADispensaryActionId\([^)]*\)\s*(?::\s*string)?\s*\{[\s\S]*?\n\}/);
  assert.ok(helper, 'find-a-dispensary must define one deterministic action-ID helper');
  const executable = helper[0].replace(/: string(?=\s*[,)]|\s*\{)/g, '');
  const findADispensaryActionId = vm.runInNewContext(`"use strict"; ${executable}; findADispensaryActionId`);
  return calls.map(({ identity, action, instance }) => findADispensaryActionId(identity, action, instance));
}

test('find-a-dispensary CTA IDs distinguish repeated guide and OCP cards', () => {
  const source = read(FIND_A_DISPENSARY);
  assert.match(source, /data-cta-id=\{findADispensaryActionId\(guide\.href, 'guide',/);
  assert.match(source, /data-cta-id=\{findADispensaryActionId\(guide\.href, 'map',/);
  assert.match(source, /data-cta-id=\{findADispensaryActionId\(city\.n, 'ocp-map',/);
  assert.match(source, /data-cta-id=\{findADispensaryActionId\(city\.n, 'ocp-search',/);

  const ids = findADispensaryActionIds(source, [
    { identity: '/guides/alpha-dispensary-guide', action: 'guide', instance: 'region-a-0' },
    { identity: '/guides/alpha-dispensary-guide', action: 'map', instance: 'region-a-0' },
    { identity: '/guides/beta-dispensary-guide', action: 'guide', instance: 'region-a-1' },
    { identity: '/guides/beta-dispensary-guide', action: 'map', instance: 'region-a-1' },
    { identity: 'Alpha, ME', action: 'ocp-map', instance: 'ocp-0' },
    { identity: 'Alpha, ME', action: 'ocp-search', instance: 'ocp-0' },
    { identity: 'Beta, ME', action: 'ocp-map', instance: 'ocp-1' },
    { identity: 'Beta, ME', action: 'ocp-search', instance: 'ocp-1' },
    { identity: '/guides/alpha-dispensary-guide', action: 'guide', instance: 'region-b-0' },
  ]);
  assertUnique(ids, 'repeated find-a-dispensary card CTA IDs');
});

function resourcesVendorActionIds(source, names) {
  const helper = source.match(/function resourcesVendorActionId\([^)]*\)\s*(?::\s*string)?\s*\{[\s\S]*?\n\}/);
  assert.ok(helper, 'resources must define one deterministic vendor action-ID helper');
  const executable = helper[0].replace(/: string(?=\s*[,)]|\s*\{)/g, '');
  const resourcesVendorActionId = vm.runInNewContext(`"use strict"; ${executable}; resourcesVendorActionId`);
  return names.map((name) => resourcesVendorActionId(name));
}

test('resources vendor Request Intro controls have distinct action IDs', () => {
  const source = read(RESOURCES);
  assert.match(source, /data-cta-id=\{resourcesVendorActionId\(vendor\.name\)\}/);
  assert.doesNotMatch(source, /data-cta-id="cta-inline-resources-01"/);

  const ids = resourcesVendorActionIds(source, [
    'Tammie Snow, Esq.',
    'Bernstein Shur',
    'BerryDunn',
    'Macpage',
  ]);
  assertUnique(ids, 'resources vendor CTA IDs');
});

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
  assert.match(layout, /recordQualifyingActivity/);
  assert.match(layout, /hasRecentQualifyingActivity\(\)/);
  assert.match(layout, /same_site_source_path/);
  assert.match(layout, /markActiveAttention\(\);\n\s*scheduleActiveAttention\(\);/);
  assert.doesNotMatch(layout, /visibilityState === 'visible'\) \{\n\s*markEngaged\('visibility_returned'\);\n\s*\}/, 'a visibility return must not directly mark active attention');
});

test('required CI provisions Chromium before the browser-backed continuation contract', () => {
  const workflow = read(path.join(ROOT, '.github', 'workflows', 'ci.yml'));
  const buildJob = workflow.slice(workflow.indexOf('  build:'), workflow.indexOf('  deploy-preview:'));
  const chromiumInstall = buildJob.indexOf('npx playwright install chromium --with-deps');
  const continuationTest = buildJob.indexOf('run: npm run test:continuation');

  assert.ok(chromiumInstall >= 0, 'the required build job must provision Chromium');
  assert.ok(continuationTest > chromiumInstall, 'the browser-backed continuation contract must run after Chromium is provisioned');
});

test('funnel SQL joins active attention only to the same-site source path', () => {
  const sql = read(FUNNEL_SQL);
  assert.match(sql, /same_site_source_path AS source_path/);
  assert.match(sql, /'source_destination_outcome' AS reporting_grain/);
  assert.match(sql, /'unattributable_to_individual_cta' AS outcome_attribution/);
  assert.match(sql, /LEFT JOIN attention att USING \(source_path, destination_path\)/);
  assert.doesNotMatch(sql, /att\.source_path = e\.source_path AND att\.destination_path = s\.destination_path/, 'destination outcomes must not be duplicated onto CTA rows');
  assert.match(sql, /r'\^https\?:\/\/\(www\\\.\)\?'/, 'BigQuery raw regex needs one escaping backslash');
  assert.doesNotMatch(sql, /www\\\\\./, 'BigQuery raw regex must not double-escape www.');
});

test('GA4 configuration is queued before deferred CTA instrumentation can emit events', () => {
  const layout = read(LAYOUT);
  const configAt = layout.indexOf("window.gtag('config', analyticsId);");
  const instrumentationAt = layout.indexOf('--- v1 action exposure/select');
  assert.ok(configAt >= 0 && configAt < instrumentationAt, 'the gtag stub must queue config before CTA events');
  assert.equal(layout.indexOf("window.gtag('config', analyticsId);", configAt + 1), -1, 'deferred script load must not queue a second config');
});

test('GA4 starts its async client fetch before a first CTA can navigate away', () => {
  const layout = read(LAYOUT);
  const loaderAt = layout.indexOf('function loadGtag()');
  const firstLoadAt = layout.indexOf('loadGtag();', loaderAt);
  assert.ok(loaderAt >= 0 && firstLoadAt > loaderAt, 'GA4 bootstrap must start its client fetch immediately');
  assert.doesNotMatch(layout, /requestIdleCallback\(loadGtag/, 'CTA delivery cannot wait for an idle callback');
  assert.doesNotMatch(layout, /window\.addEventListener\('load'.*loadGtag/, 'CTA delivery cannot wait for the page load event');
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

function analyticsScript() {
  const source = read(LAYOUT);
  const analyticsMarker = source.indexOf('--- v1 action exposure/select');
  const start = source.indexOf('(function () {', source.lastIndexOf('<script is:inline>', analyticsMarker));
  const end = source.indexOf('</script>', start);
  assert.ok(start >= 0 && end > start, 'Layout must contain the v1 analytics inline script');
  return source.slice(start, end);
}

function eventNames(events) {
  return events.map((event) => event[1]);
}

test('v1 browser instrumentation preserves native actions and enforces dwell, activity, and canonical paths', async (t) => {
  const http = require('node:http');
  const { chromium } = require('playwright');
  const script = analyticsScript();
  const events = [];
  const submits = [];
  const server = http.createServer((request, response) => {
    const noIo = new URL(request.url, 'http://localhost').searchParams.has('no-io');
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(`<!doctype html><html><head><title>Instrument test</title></head><body data-page-type="test">
      <a id="pre-dwell" data-cta-id="cta-inline-pre-dwell" href="/destination?campaign=test#native-link">Pre dwell</a>
      <a id="hidden-dwell" data-cta-id="cta-inline-hidden-dwell" href="#hidden-link">Hidden dwell</a>
      <form id="native-form" action="#submitted"><button data-cta-id="cta-inline-submit" type="submit">Submit</button></form>
      <script>
        window.gtag = (...args) => window.__recordGtag(args);
        window.__ioInstances = [];
        ${noIo ? 'delete window.IntersectionObserver;' : `window.IntersectionObserver = class {
          constructor(callback) { this.callback = callback; window.__ioInstances.push(this); }
          observe() {} unobserve() {}
          trigger(target, isIntersecting, intersectionRatio) { this.callback([{ target, isIntersecting, intersectionRatio }]); }
        };`}
        document.querySelector('#native-form').addEventListener('submit', function (event) {
          window.__recordSubmit(event.defaultPrevented); event.preventDefault();
        });
      </script>
      <script>${script}</script>
    </body></html>`);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;

  const browser = await chromium.launch({ headless: true });
  t.after(async () => { await browser.close(); });
  const page = await browser.newPage();
  await page.exposeBinding('__recordGtag', (_source, args) => events.push(args));
  await page.exposeBinding('__recordSubmit', (_source, defaultPrevented) => submits.push(defaultPrevented));
  await page.clock.install({ time: new Date('2026-07-17T00:00:00Z') });

  // A pre-dwell click without IntersectionObserver emits exposure before select,
  // strips query/hash from its canonical path, and does not block navigation.
  await page.goto(`${origin}/fixture?no-io`);
  await page.click('#pre-dwell');
  assert.deepEqual(eventNames(events).slice(0, 3), ['mdg_action_exposure', 'cta_view', 'mdg_action_select']);
  assert.equal(events[2][2].destination_path, '/destination');
  await page.waitForURL(`${origin}/destination?campaign=test#native-link`);

  // Hiding the tab cancels an in-flight 750 ms dwell rather than emitting it.
  events.length = 0;
  await page.goto(`${origin}/fixture`);
  await page.evaluate(() => {
    const target = document.querySelector('#hidden-dwell');
    window.__ioInstances[0].trigger(target, true, 0.75);
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.fastForward(800);
  assert.equal(eventNames(events).includes('mdg_action_exposure'), false, 'backgrounded dwell must not create an exposure');

  // A CTA that remained qualified while hidden restarts its dwell timer on
  // return even when IntersectionObserver emits no additional callback.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.fastForward(800);
  assert.equal(eventNames(events).includes('mdg_action_exposure'), true, 'visible qualifying CTA must resume dwell after tab return');

  // Delegated analytics never cancels native form submission.
  await page.goto(`${origin}/fixture?no-io`);
  await page.click('button[type="submit"]');
  assert.deepEqual(submits, [false], 'instrumentation must not prevent native form submission');

  // Thirty seconds of passive foreground time is insufficient; a recent keyboard
  // action qualifies the already-accumulated foreground threshold. The same-site
  // referrer path is normalized for the SQL funnel join.
  events.length = 0;
  await page.goto(`${origin}/source?ignored=query#fragment`);
  await page.goto(`${origin}/fixture`, { referer: `${origin}/source?ignored=query#fragment` });
  await page.clock.fastForward(30_000);
  assert.equal(eventNames(events).includes('mdg_active_attention'), false, 'passive foreground time is not active attention');
  await page.dispatchEvent('body', 'keydown');
  await page.clock.fastForward(1);
  const attention = events.find((event) => event[1] === 'mdg_active_attention');
  assert.ok(attention, 'recent keyboard activity after foreground threshold must qualify attention');
  assert.equal(attention[2].same_site_source_path, '/source');
});
