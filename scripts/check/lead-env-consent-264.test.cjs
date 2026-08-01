'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '../..');
const read = (...parts) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');
const layoutPath = ['apps', 'maine-cannabis', 'src', 'layouts', 'Layout.astro'];
const consentPath = ['apps', 'maine-cannabis', 'src', 'components', 'CookieConsent.astro'];

function extractAnalyticsBootstrap(layout) {
  const sectionStart = layout.indexOf('<!-- Google Analytics GA4');
  const sectionEnd = layout.indexOf('<!--\n      Engagement instrumentation', sectionStart);
  assert.notEqual(sectionStart, -1, 'Layout must retain a dedicated analytics bootstrap section');
  assert.notEqual(sectionEnd, -1, 'analytics bootstrap must end before engagement instrumentation');
  const section = layout.slice(sectionStart, sectionEnd);
  const scriptStart = section.indexOf('<script');
  const bodyStart = section.indexOf('>', scriptStart) + 1;
  const bodyEnd = section.indexOf('</script>', bodyStart);
  assert.ok(scriptStart >= 0 && bodyStart > scriptStart && bodyEnd > bodyStart, 'analytics bootstrap must be an inline script');
  return section.slice(bodyStart, bodyEnd);
}

function runBootstrap({ savedConsent = null, dnt = null, gpc = false } = {}) {
  const layout = read(...layoutPath);
  const appendedScripts = [];
  const storage = new Map(savedConsent === null ? [] : [['consent:mdg', savedConsent]]);
  const document = {
    head: {
      appendChild(node) {
        appendedScripts.push(node);
      },
    },
    createElement(tagName) {
      return { tagName, async: false, src: '' };
    },
  };
  const window = {
    document,
    dataLayer: [],
    navigator: { doNotTrack: dnt, globalPrivacyControl: gpc },
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); },
    },
  };
  const context = vm.createContext({
    Date,
    analyticsId: 'G-TEST-CONTRACT',
    console,
    document,
    navigator: window.navigator,
    window,
  });
  vm.runInContext(extractAnalyticsBootstrap(layout), context, { filename: 'Layout.analytics-bootstrap.inline.js' });
  return { appendedScripts, storage, window };
}

test('Vercel lead route resolves upstream from a request-time environment variable without tracked Tailnet hostnames', () => {
  const config = JSON.parse(read('vercel.json'));
  const leadRoute = (config.routes || []).find((route) => route.src === '^/api/lead$');
  assert.deepEqual(leadRoute, {
    src: '^/api/lead$',
    dest: '${MDG_LEAD_WEBHOOK_URL}',
    env: ['MDG_LEAD_WEBHOOK_URL'],
  });
  assert.equal((config.rewrites || []).some((route) => route.source === '/api/lead'), false, 'the legacy public rewrite must be removed');
  const tailnetSuffix = ['ts', 'net'].join('.');
  assert.equal(read('vercel.json').includes(tailnetSuffix), false, 'vercel.json must not track the Funnel hostname');
  assert.equal(read('docs', 'runbooks', 'lead-intake-stage3.md').includes(tailnetSuffix), false, 'the operator runbook must not track the Funnel hostname');
});

test('analytics bootstrap is strict opt-in: no stored choice and explicit decline never inject Google telemetry', () => {
  const firstVisit = runBootstrap();
  assert.equal(firstVisit.appendedScripts.length, 0, 'first visit must not inject gtag.js');
  assert.equal(typeof firstVisit.window.__mdgAnalytics?.setConsent, 'function', 'bootstrap must expose a consent update seam');

  firstVisit.window.__mdgAnalytics.setConsent('denied');
  assert.equal(firstVisit.appendedScripts.length, 0, 'decline must not inject gtag.js');

  const declinedVisit = runBootstrap({ savedConsent: 'denied' });
  assert.equal(declinedVisit.appendedScripts.length, 0, 'stored decline must not inject gtag.js');
});

test('analytics bootstrap injects Google telemetry exactly once after explicit grant', () => {
  const browser = runBootstrap();
  browser.window.__mdgAnalytics.setConsent('granted');
  browser.window.__mdgAnalytics.setConsent('granted');
  assert.equal(browser.appendedScripts.length, 1, 'grant must load gtag.js once');
  assert.equal(browser.appendedScripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-TEST-CONTRACT');
});

test('DNT and Global Privacy Control override stored or subsequent grants', () => {
  for (const privacySignal of [{ dnt: '1' }, { dnt: 'yes' }, { gpc: true }]) {
    const browser = runBootstrap({ savedConsent: 'granted', ...privacySignal });
    assert.equal(browser.appendedScripts.length, 0, `privacy signal ${JSON.stringify(privacySignal)} must suppress stored consent`);
    browser.window.__mdgAnalytics.setConsent('granted');
    assert.equal(browser.appendedScripts.length, 0, `privacy signal ${JSON.stringify(privacySignal)} must suppress later grant`);
  }
});

test('Layout has no unconditional Vercel observability injection and CookieConsent delegates DNT-aware decisions to the bootstrap', () => {
  const layout = read(...layoutPath);
  const consent = read(...consentPath);
  assert.equal(/import\s+Analytics\s+from\s+['"]@vercel\/analytics\/astro['"]/.test(layout), false, 'Vercel Analytics must not render before consent');
  assert.equal(/import\s+SpeedInsights\s+from\s+['"]@vercel\/speed-insights\/astro['"]/.test(layout), false, 'Speed Insights must not render before consent');
  assert.equal(/<Analytics\b/.test(layout), false, 'Layout must not mount Vercel Analytics before consent');
  assert.equal(/<SpeedInsights\b/.test(layout), false, 'Layout must not mount Speed Insights before consent');
  assert.match(consent, /globalPrivacyControl/);
  assert.match(consent, /doNotTrack/);
  assert.match(consent, /__mdgAnalytics\.setConsent/);
});
