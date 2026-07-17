'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const layoutsDirectory = path.resolve(__dirname, '..');
const layout = fs.readFileSync(path.join(layoutsDirectory, 'Layout.astro'), 'utf8');
const revealScriptMatch = layout.match(/\/\/ Scroll handler for header effects, progress bar, and back-to-top[\s\S]*?(\(function\(\) \{[\s\S]*?^\s*\}\)\(\);)/m);

assert.ok(revealScriptMatch, 'Layout must retain the inline reveal script');

function createClassList() {
  const classes = new Set();
  return {
    add: (...names) => names.forEach((name) => classes.add(name)),
    remove: (...names) => names.forEach((name) => classes.delete(name)),
    contains: (name) => classes.has(name),
    toggle: (name, force) => {
      if (force === undefined ? !classes.has(name) : force) classes.add(name);
      else classes.delete(name);
    },
  };
}

function createRevealElement(tagName) {
  return {
    tagName,
    classList: createClassList(),
    style: {},
  };
}

function runRevealScript({ IntersectionObserver, includeObserver = false } = {}) {
  const revealElements = ['MAIN', 'ARTICLE', 'SECTION', 'ASIDE'].map(createRevealElement);
  const timeouts = [];
  const documentElement = {
    classList: createClassList(),
    scrollTop: 0,
    scrollHeight: 0,
    clientHeight: 0,
  };
  const document = {
    body: { scrollTop: 0 },
    documentElement,
    getElementById: () => null,
    querySelectorAll: (selector) => {
      assert.equal(selector, '.reveal', 'the real script must select reveal elements');
      return revealElements;
    },
  };
  const window = {
    matchMedia: () => ({ matches: false }),
    addEventListener: () => {},
    scrollTo: () => {},
    scrollY: 0,
    setTimeout: (callback, delay) => {
      timeouts.push({ callback, delay });
      return timeouts.length;
    },
  };

  if (includeObserver) window.IntersectionObserver = IntersectionObserver;

  vm.runInNewContext(revealScriptMatch[1], { document, window, IntersectionObserver });

  return { documentElement, revealElements, timeouts };
}

function assertAllSemanticRevealsVisible(revealElements) {
  for (const element of revealElements) {
    assert.equal(element.classList.contains('visible'), true, `${element.tagName} reveal must be visible`);
  }
}

test('missing IntersectionObserver fails open for every semantic reveal element', () => {
  const result = runRevealScript();

  assertAllSemanticRevealsVisible(result.revealElements);
  assert.equal(result.documentElement.classList.contains('reveal-enhanced'), false);
  assert.equal(result.timeouts.length, 0, 'no observer fallback timer is needed without an observer');
});

test('a throwing IntersectionObserver constructor recovers visibility for every semantic reveal element', () => {
  class ThrowingIntersectionObserver {
    constructor() {
      throw new Error('observer construction failed');
    }
  }

  const result = runRevealScript({
    IntersectionObserver: ThrowingIntersectionObserver,
    includeObserver: true,
  });

  assertAllSemanticRevealsVisible(result.revealElements);
  assert.equal(result.documentElement.classList.contains('reveal-enhanced'), false);
});

test('the finite observer fallback reveals every semantic section that never intersects', () => {
  class NeverIntersectingObserver {
    observe() {}
    unobserve() {}
  }

  const result = runRevealScript({
    IntersectionObserver: NeverIntersectingObserver,
    includeObserver: true,
  });

  assert.equal(result.documentElement.classList.contains('reveal-enhanced'), true);
  assert.equal(result.timeouts.length, 1, 'the script must schedule exactly one reveal fallback');
  assert.equal(Number.isFinite(result.timeouts[0].delay), true, 'the reveal fallback delay must be finite');
  assert.equal(result.timeouts[0].delay >= 0, true, 'the reveal fallback delay must not be negative');

  result.timeouts[0].callback();
  assertAllSemanticRevealsVisible(result.revealElements);
});