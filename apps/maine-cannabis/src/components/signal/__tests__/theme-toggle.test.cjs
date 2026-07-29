'use strict';

/**
 * Tests for the Dark mode / Light mode toggle on Signal pages.
 *
 * The toggle MUST set data-theme='dark' on .signal-scope (the root
 * that owns the scoped CSS), NOT on documentElement. Setting it on
 * documentElement would silently break the dark-mode rules because
 * SignalLayout.astro uses `.signal-scope[data-theme="dark"]` as the
 * selector.
 */

const assert = require('node:assert/strict');
const { test } = require('node:test');

const fs = require('node:fs');
const path = require('node:path');
const SCRIPT = fs.readFileSync(
  path.join(__dirname, '..', 'workspace-client.js'),
  'utf8',
);

function loadWorkspaceWithDom() {
  // Minimal DOM stub — extends the standard makeDoc() used by
  // workspace.test.cjs but with a `.signal-scope` element wired up
  // and a single [data-theme-toggle] button.
  const handlers = {};
  const elements = new Map();
  function el(id, dataset = {}, attrs = {}) {
    const e = {
      id,
      _classList: [],
      _classes: new Set(),
      dataset: { ...dataset },
      attributes: { ...attrs },
      _textContent: '',
      _innerHTML: '',
      _tag: 'div',
      children: [],
      // Methods needed by this test only.
      getAttribute(name) {
        if (this.attributes[name] !== undefined) return this.attributes[name];
        if (this.dataset[name] !== undefined) return this.dataset[name];
        return null;
      },
      setAttribute(name, value) {
        this.attributes[name] = String(value);
      },
      get textContent() { return this._textContent; },
      set textContent(v) { this._textContent = String(v); },
      get innerHTML() { return this._innerHTML; },
      set innerHTML(v) { this._innerHTML = String(v); },
      matches(sel) { return sel === `#${this.id}`; },
      addEventListener(name, fn) {
        (handlers['el:' + this.id + ':' + name] = handlers['el:' + this.id + ':' + name] || []).push(fn);
      },
      click() {
        const fns = handlers['el:' + this.id + ':click'] || [];
        for (const fn of fns) fn();
      },
      focus() {},
      closest(sel) { return null; },
      appendChild(c) { this.children.push(c); },
      contains(o) { return o === this || this.children.includes(o) || this.children.some((c) => c.contains?.(o)); },
      querySelector(sel) { return null; },
      querySelectorAll(sel) { return []; },
    };
    Object.defineProperty(e, 'classList', {
      get() { return this._classList; },
      set(v) { this._classList = v; },
    });
    return e;
  }
  const scope = el('signalScope', {}, { class: 'signal-scope' });
  const toggleBtn = el('themeBtn', {}, { 'data-theme-toggle': '' });
  // Stack child-iteration: workspace-client does doc.querySelectorAll('[data-theme-toggle]').
  const document = {
    _readyState: 'complete',
    addEventListener(name, fn) { (handlers['doc:' + name] = handlers['doc:' + name] || []).push(fn); },
    querySelector(sel) {
      if (sel === '.signal-scope') return scope;
      if (sel === '#subjectName') return null;
      return null;
    },
    querySelectorAll(sel) {
      if (sel === '[data-theme-toggle]') return [toggleBtn];
      return [];
    },
  };
  const factory = new Function('window', `${SCRIPT}\nreturn window.MDG_SIGNAL;`);
  return { window: { MDG_SIGNAL: factory({ document }) }, toggleBtn, scope };
}

test('theme toggle: clicking sets data-theme=dark on .signal-scope, NOT on documentElement', () => {
  const ctx = loadWorkspaceWithDom();
  // Pre-condition: no data-theme set anywhere on the scope.
  assert.equal(ctx.scope.getAttribute('data-theme'), null);
  ctx.toggleBtn.click();
  assert.equal(ctx.scope.getAttribute('data-theme'), 'dark');
  assert.equal(ctx.toggleBtn.getAttribute('aria-pressed'), 'true');
  // Button label flips so the click again says "Light mode".
  assert.equal(ctx.toggleBtn.textContent, 'Light mode');
});

test('theme toggle: second click flips back to light', () => {
  const ctx = loadWorkspaceWithDom();
  ctx.toggleBtn.click();
  ctx.toggleBtn.click();
  assert.equal(ctx.scope.getAttribute('data-theme'), 'light');
  assert.equal(ctx.toggleBtn.getAttribute('aria-pressed'), 'false');
  assert.equal(ctx.toggleBtn.textContent, 'Dark mode');
});

test('theme toggle: no-op when .signal-scope is absent', () => {
  // Build a DOM stub WITHOUT a .signal-scope element; toggle should not throw.
  const handlers = {};
  const document = {
    _readyState: 'complete',
    addEventListener(name, fn) {},
    querySelector(sel) { return null; },
    querySelectorAll(sel) {
      if (sel === '[data-theme-toggle]') return [{
        id: 'b', dataset: {}, attributes: { 'data-theme-toggle': '' },
        addEventListener(name, fn) {},
        click() {},
        getAttribute(name) { return null; },
        setAttribute(name, value) {},
        get textContent() { return ''; }, set textContent(v) {},
      }];
      return [];
    },
  };
  // The point is just that init() does not throw when .signal-scope is missing.
  // The click handler is attached but the theme update is a no-op.
  assert.doesNotThrow(() => new Function('window', `${SCRIPT}\nreturn window.MDG_SIGNAL;`)({ document }));
});
