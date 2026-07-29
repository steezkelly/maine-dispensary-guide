'use strict';

/**
 * Tests for the SignalWorkspace component script. Restores dark-spot
 * #4 from the 2026-07-23 self-critique:
 *   - the "Add peer" button was previously a no-op (only fired a
 *     gtag event)
 *   - the alert preview showed a single static copy rather than the
 *     prototype's three selectable conditions (license-count change,
 *     source refresh, data-state change)
 *
 * Drives the real workspace-client.js against a minimal DOM stub so
 * we can verify behavior without booting Playwright.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const SCRIPT = fs.readFileSync(
  path.join(__dirname, '..', 'workspace-client.js'),
  'utf8',
);

function matches(e, sel) {
  if (!sel) return false;
  // Compound attribute selectors: split on `][`-style boundaries. A
  // selector that contains any `[` is treated as attribute-based.
  if (sel.indexOf('[') !== -1) {
    const parts = sel.match(/\[([^\]]+)\]/g) || [];
    if (parts.length === 0) return false;
    for (const part of parts) {
      const m = part.match(/^\[data-([\w-]+)(?:=(?:"([^"]*)"|([^\]]+)))?\]$/);
      if (!m) return false;
      const attrName = 'data-' + m[1];
      const wantValue = m[2] !== undefined ? m[2] : m[3];
      if (wantValue === undefined) {
        if (!Object.prototype.hasOwnProperty.call(e.dataset, m[1])) return false;
      } else {
        const actual = e.getAttribute(attrName);
        if (actual !== wantValue) return false;
      }
    }
    return true;
  }
  if (sel.startsWith('#')) return e.id === sel.slice(1);
  if (sel.startsWith('.')) return e._classes.has(sel.slice(1));
  return e._tag === sel;
}

function makeDoc() {
  const handlers = {};
  const elements = new Map();

  function makeEl(id, dataset = {}, attrs = {}) {
    const el = {
      id,
      dataset: { ...dataset },
      attributes: { ...attrs },
      _tag: attrs._tag || 'div',
      _textContent: attrs._textContent || '',
      _innerHTML: attrs._innerHTML || '',
      _classes: new Set(attrs._classes || []),
      classList: {
        add(c) { el._classes.add(c); },
        remove(c) { el._classes.delete(c); },
        contains(c) { return el._classes.has(c); },
        toggle(c, on) {
          if (on === undefined) {
            if (el._classes.has(c)) el._classes.delete(c);
            else el._classes.add(c);
            return el._classes.has(c);
          }
          if (on) el._classes.add(c);
          else el._classes.delete(c);
        },
      },
      style: {},
      addEventListener(name, fn) {
        (handlers[id + ':' + name] = handlers[id + ':' + name] || []).push(fn);
      },
      dispatchEvent(name, event = {}) {
        (handlers[id + ':' + name] || []).forEach((fn) => fn(event));
      },
      get textContent() { return this._textContent; },
      set textContent(v) { this._textContent = v; },
      get innerHTML() { return this._innerHTML; },
      set innerHTML(v) { this._innerHTML = v; },
      focus() { el._focused = true; },
      getAttribute(name) {
        if (this.attributes[name] !== undefined) return this.attributes[name];
        const stripped = name.replace(/^data-/, '');
        if (this.dataset[stripped] !== undefined) return this.dataset[stripped];
        const camel = stripped.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        return this.dataset[camel] !== undefined ? this.dataset[camel] : null;
      },
      setAttribute(name, value) { this.attributes[name] = value; },
      querySelector(sel) {
        for (const e of elements.values()) if (e !== el && matches(e, sel)) return e;
        return null;
      },
      querySelectorAll(sel) {
        const out = [];
        for (const e of elements.values()) if (e !== el && matches(e, sel)) out.push(e);
        return out;
      },
      closest(sel) { return null; },
    };
    elements.set(id, el);
    return el;
  }

  const document = {
    _readyState: 'complete',
    addEventListener(name, fn) {
      (handlers['doc:' + name] = handlers['doc:' + name] || []).push(fn);
    },
    body: makeEl('body'),
    documentElement: makeEl('html'),
    getElementById: (id) => elements.get(id),
    querySelector(sel) {
      for (const e of elements.values()) if (matches(e, sel)) return e;
      return null;
    },
    querySelectorAll(sel) {
      const out = [];
      for (const e of elements.values()) if (matches(e, sel)) out.push(e);
      return out;
    },
  };

  const window = {
    document,
    location: { pathname: '/signal/portland/' },
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
  };

  return { document, window, elements, makeEl, handlers };
}

function loadWorkspace(ctx) {
  const factory = new Function('window', `${SCRIPT}\nreturn window.MDG_SIGNAL;`);
  return factory(ctx.window);
}

test('loadWorkspace returns the API', () => {
  const ctx = makeDoc();
  const api = loadWorkspace(ctx);
  assert.ok(api, 'API must be returned');
  assert.equal(typeof api.applyAlertCondition, 'function');
  assert.equal(typeof api.openDrawer, 'function');
  assert.equal(typeof api.swapPeer, 'function');
  assert.equal(typeof api.showToast, 'function');
});

test('selecting an alert condition updates #alertCopy and toggles .active + aria-pressed', () => {
  const ctx = makeDoc();
  ctx.makeEl('subjectName', {}, { _textContent: 'Bangor' });
  const copy = ctx.makeEl('alertCopy', {}, {});
  const licenseBtn = ctx.makeEl('cond-license', { 'signal-alert-condition': 'license' }, {});
  const refreshBtn = ctx.makeEl('cond-refresh', { 'signal-alert-condition': 'refresh' }, { 'data-default': 'true' });
  const dataBtn = ctx.makeEl('cond-data', { 'signal-alert-condition': 'data' }, {});

  loadWorkspace(ctx);

  // After init: the [data-default="true"] button should have been activated
  // and #alertCopy should be populated.
  assert.equal(refreshBtn._classes.has('active'), true, 'init should activate default condition');
  assert.match(copy._textContent, /newer verified source release/, 'init should write alert copy');

  ctx.window.MDG_SIGNAL.applyAlertCondition({ condition: 'license', subject: 'Bangor' });
  assert.match(copy._textContent, /old and new license counts/);
  assert.equal(licenseBtn._classes.has('active'), true);
  assert.equal(refreshBtn._classes.has('active'), false);
  assert.equal(licenseBtn.attributes['aria-pressed'], 'true');

  ctx.window.MDG_SIGNAL.applyAlertCondition({ condition: 'data', subject: 'Bangor' });
  assert.match(copy._textContent, /data-state changes/);
  assert.equal(dataBtn._classes.has('active'), true);
});

test('opening the evidence drawer sets aria-hidden=false and fires toast copy', () => {
  const ctx = makeDoc();
  ctx.makeEl('evidenceDrawer', {}, { _classes: ['drawer'] });
  const toast = ctx.makeEl('toast');
  loadWorkspace(ctx);

  ctx.window.MDG_SIGNAL.openDrawer('evidenceDrawer', 'source_open');
  const drawer = ctx.elements.get('evidenceDrawer');
  assert.equal(drawer.attributes['aria-hidden'], 'false');
  assert.equal(drawer._classes.has('open'), true);
  assert.match(toast._textContent, /read-only/);
  assert.equal(toast.attributes['data-visible'], 'true');
});

test('swapPeer replaces the third peer row data and innerHTML when not already shown', () => {
  const ctx = makeDoc();
  const peerA = ctx.makeEl('peer-row-0', { peer: 'south-portland' }, {});
  const peerB = ctx.makeEl('peer-row-1', { peer: 'waterville' }, {});
  const peerC = ctx.makeEl('peer-row-2', { peer: 'bangor' }, {});
  for (const r of [peerA, peerB, peerC]) {
    const tds = [
      { _ih: '', set innerHTML(v) { this._ih = v; }, get innerHTML() { return this._ih || ''; } },
      { _ih: '', set innerHTML(v) { this._ih = v; }, get innerHTML() { return this._ih || ''; } },
      { _ih: '', set innerHTML(v) { this._ih = v; }, get innerHTML() { return this._ih || ''; } },
    ];
    r._cachedTds = tds;
    r.querySelectorAll = (sel) => (sel === 'td' ? tds : []);
  }
  loadWorkspace(ctx);

  ctx.window.MDG_SIGNAL.swapPeer({ slug: 'lewiston', city: 'Lewiston', licenses: 8, density: 2.09 });
  assert.equal(peerC.getAttribute('data-peer'), 'lewiston');
  // cells[0].innerHTML was set by the script; read from the cached td array.
  const tds = peerC._cachedTds;
  assert.match(tds[0]._ih, /Lewiston/, 'first cell of last peer row should now link to Lewiston');
  assert.equal(tds[1].textContent, '8');
  assert.equal(tds[2].textContent, '2.09');
});

test('swapPeer is a no-op when the picked municipality is already a peer', () => {
  const ctx = makeDoc();
  ctx.makeEl('peer-row-0', { peer: 'south-portland' }, {});
  const peerC = ctx.makeEl('peer-row-2', { peer: 'bangor' }, {});
  loadWorkspace(ctx);
  ctx.window.MDG_SIGNAL.swapPeer({ slug: 'south-portland', city: 'South Portland', licenses: 11, density: 4.08 });
  assert.equal(peerC.getAttribute('data-peer'), 'bangor', 'peer C must not change when pick is already shown');
});

test('showToast sets textContent + data-visible=true and is idempotent', () => {
  const ctx = makeDoc();
  const toast = ctx.makeEl('toast');
  loadWorkspace(ctx);
  ctx.window.MDG_SIGNAL.showToast('Preview only — first call');
  assert.equal(toast._textContent, 'Preview only — first call');
  assert.equal(toast.attributes['data-visible'], 'true');
  ctx.window.MDG_SIGNAL.showToast('Preview only — second call');
  assert.equal(toast._textContent, 'Preview only — second call');
});
