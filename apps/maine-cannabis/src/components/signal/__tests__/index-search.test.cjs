'use strict';

/**
 * Verifies that /signal/ exposes the "no match" empty state contracted in
 * spec §6 ("No match: search returns a clear message without inventing
 * a municipality").
 *
 * Pure-DOM test: the script lives inline at the bottom of
 * /signal/, but is plain ES2017, so we can run it through new Function()
 * with a stub DOM and verify the contract behavior.
 */

const assert = require('node:assert/strict');
const { test } = require('node:test');

const fs = require('node:fs');
const path = require('node:path');

function loadIndexScript() {
  const src = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'pages', 'signal', 'index.astro'),
    'utf8',
  );
  const m = src.match(/<script is:inline>\s*\(function[\s\S]*?\}\)\(\);\s*<\/script>/);
  if (!m) throw new Error('inline search script not found in signal/index.astro');
  return m[0].replace(/^<script is:inline>/, '').replace(/<\/script>$/, '');
}

test('signal-index-search: empty state hidden on initial paint', () => {
  const doc = makeDoc({ q: '' });
  runScript(doc);
  assert.equal(doc.noMatch.hidden, true);
  assert.equal(visibleCards(doc).length, 11);
});

test('signal-index-search: "Portland" matches Portland and South Portland (substring)', () => {
  const doc = makeDoc({ q: 'Portland' });
  runScript(doc);
  var visible = visibleCards(doc);
  assert.equal(visible.length, 2);
  assert.match(visible[0].textContent, /Portland/);
  assert.match(visible[1].textContent, /South Portland/);
  assert.equal(doc.noMatch.hidden, true);
});

test('signal-index-search: "2300560545" geoid matches exactly Portland', () => {
  const doc = makeDoc({ q: '2300560545' });
  runScript(doc);
  var visible = visibleCards(doc);
  assert.equal(visible.length, 1);
  assert.match(visible[0].textContent, /Portland/);
});

test('signal-index-search: nonexistent city name → empty state visible', () => {
  const doc = makeDoc({ q: 'Springfield' });
  runScript(doc);
  assert.equal(doc.noMatch.hidden, false);
  assert.match(doc.noMatch.textContent, /No municipality matches/);
});

test('signal-index-search: status line updated when filter is active', () => {
  const doc = makeDoc({ q: 'Bangor' });
  runScript(doc);
  assert.match(doc.status.textContent, /1 of 11 cities match/);
});

test('signal-index-search: clearing the input hides the empty state and shows all', () => {
  const doc = makeDoc({ q: 'Springfield' });
  runScript(doc);
  assert.equal(doc.noMatch.hidden, false);
  doc.input.value = '';
  // Re-run apply() by firing an input event (script listens for 'input').
  doc.input.dispatchEvent({ type: 'input' });
  // At this point the input event handler called apply() with empty
  // q, so noMatch should be hidden again.
  assert.equal(doc.noMatch.hidden, true);
  assert.equal(doc.status.textContent, '');
});

// ---- helpers ----

function makeCardElement(id, haystack, geoid) {
  const card = {
    id,
    _attributes: {
      'data-municipality-card': '',
      'data-search-haystack': `${haystack} ${geoid}`.toLowerCase(),
    },
    _dataset: { 'municipality-card': '' },
    _style: { display: '' },
    _hidden: false,
    _searchHaystack: `${haystack} ${geoid}`.toLowerCase(),
    getAttribute(name) { return this._attributes[name] || null; },
    setAttribute(name, value) { this._attributes[name] = String(value); },
    get dataset() { return this._dataset; },
    get style() { return this._style; },
    get textContent() { return `${haystack} geoid ${geoid}`; },
    matches() { return false; },
  };
  return card;
}

function makeDoc({ q }) {
  const cardsData = [
    ['Portland', '2300560545'],
    ['South Portland', '2300571990'],
    ['Bangor', '2301902795'],
    ['Lewiston', '2300138740'],
    ['Auburn', '2300102060'],
    ['Augusta', '2301102100'],
    ['Waterville', '2301180740'],
    ['Sanford', '2303165725'],
    ['Brunswick', '2300508430'],
    ['Kittery', '2303137270'],
    ['Orono', '2301955565'],
  ];
  const cardList = cardsData.map((d, i) => makeCardElement('c' + i, d[0], d[1]));
  const input = {
    _value: q,
    listeners: [],
    get value() { return this._value; },
    set value(v) { this._value = String(v); },
    addEventListener(name, fn) { this.listeners.push({ name, fn }); },
    dispatchEvent(ev) {
      // Simulate the script's apply() running by clearing or keeping
      // cards. The actual implementation reads input.value; we don't
      // need to re-execute — the test reads post-script state.
      for (const l of this.listeners) if (l.name === ev.type) l.fn();
    },
  };
  const noMatch = {
    _hidden: true,
    _textContent: 'No municipality matches that search.',
    get textContent() { return this._textContent; },
    set hidden(v) { this._hidden = !!v; },
    get hidden() { return this._hidden; },
  };
  const status = {
    _textContent: '',
    get textContent() { return this._textContent; },
    set textContent(v) { this._textContent = String(v); },
  };
  const list = {
    querySelectorAll(sel) {
      // Test reads with: `[data-municipality-card]:not([style*="display: none"])`
      // Return all cards; the :not() filter is applied via .filter in the test.
      if (sel === '[data-municipality-card]' || /data-municipality-card/.test(sel)) return cardList;
      return [];
    },
  };
  return { input, list, noMatch, status, cards: cardList };
}

function runScript(doc) {
  const script = loadIndexScript();
  global.document = {
    getElementById(id) {
      if (id === 'signalMunicipalitySearch') return doc.input;
      if (id === 'signalMunicipalityList') return doc.list;
      if (id === 'signalNoMatch') return doc.noMatch;
      if (id === 'signalSearchStatus') return doc.status;
      return null;
    },
  };
  try {
    const factory = new Function(script);
    factory();
  } finally {
    delete global.document;
  }
}

function visibleCards(doc) {
  // Mirror the production-side filter: cards whose style.display is NOT 'none'.
  return doc.cards.filter((c) => c.style.display !== 'none');
}
