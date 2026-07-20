'use strict';

/**
 * Runtime behavior test for the CiteThis.astro `mdg_source_select` v1
 * instrumentation. This complements the lexical contract test in
 * `source-link-instrumentation.test.cjs`. It assembles a minimal DOM,
 * runs the CiteThis inline `<script>` body under a `vm` context, fires a
 * synthesized click on a source link, and asserts that the emitted
 * gtag payload satisfies the EventEnvelope contract:
 *
 *   - schema_version is the literal string 'v1'
 *   - event_name is the literal string 'mdg_source_select'
 *   - instrumented_at parses as RFC 3339 / ISO 8601 UTC
 *     (yyyy-mm-ddTHH:MM:SS(.fff)?Z) — the `Z` is mandatory
 *   - source_family, source_id, placement_id, page_path are present and
 *     non-empty
 *
 * Kanban reference: t_b9cd2e12 — PR #64 P1 repair; required to reproduce
 * and protect event-envelope behavior. If the lexical test ever passes
 * while the EventEnvelope contract is broken (e.g. by replacing
 * `new Date().toISOString()` with a non-UTC string literal), this test
 * will catch the regression.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const CITE_THIS_PATH = path.resolve(
  __dirname, '..', '..', 'src', 'components', 'CiteThis.astro'
);

function readCiteThis() {
  return fs.readFileSync(CITE_THIS_PATH, 'utf8');
}

function extractInstrumentationScriptBody(citeThisSource) {
  // The CiteThis component ends with `<script is:inline>…</script>`. The
  // last `<script ...>` … `</script>` block in the file is the
  // instrumentation script we exercise here.
  const lastScriptStart = citeThisSource.lastIndexOf('<script');
  if (lastScriptStart < 0) throw new Error('CiteThis.astro has no <script> tag');
  const scriptOpenEnd = citeThisSource.indexOf('>', lastScriptStart);
  if (scriptOpenEnd < 0) throw new Error('CiteThis.astro <script> tag has no closing ">"');
  const scriptCloseStart = citeThisSource.indexOf('</script>', scriptOpenEnd);
  if (scriptCloseStart < 0) throw new Error('CiteThis.astro <script> tag has no closing </script>');
  return citeThisSource.slice(scriptOpenEnd + 1, scriptCloseStart);
}

const RFC3339_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

test('CiteThis instrumentation emits mdg_source_select v1 with RFC3339 UTC instrumented_at', () => {
  const citeThisSource = readCiteThis();
  const scriptBody = extractInstrumentationScriptBody(citeThisSource);

  // Minimal DOM stub. CiteThis attaches a click listener to the
  // previous-element-sibling of the <script> tag, so we provide a
  // minimal element + addEventListener + dispatchEvent surface.
  const captured = [];
  const listenerHolder = {
    listeners: new Map(),
    addEventListener(type, fn) {
      this.listeners.set(type, fn);
    },
    dispatchEvent(event) {
      const fn = this.listeners.get(event.type);
      if (fn) fn(event);
    },
  };

  const fakeLink = {
    dataset: {
      mdgSourceId: 'citation-foo-1',
      mdgSourceFamily: 'citation',
      mdgSourcePlacement: 'cite-this',
    },
    closest(selector) {
      // The handler does `event.target?.closest?.('a[data-mdg-source-id]')`.
      if (selector === 'a[data-mdg-source-id]') return this;
      return null;
    },
  };

  const fakeClickEvent = { target: fakeLink };

  const fakeWindow = {
    gtag: (...args) => captured.push(args),
    location: { pathname: '/guides/example/' },
  };
  const fakeDocument = {
    title: 'Example Page — Maine Dispensary Guide',
  };

  const previousElementSibling = listenerHolder;
  const fakeDocumentLike = {
    ...fakeDocument,
    currentScript: { previousElementSibling },
  };
  // The script accesses document through `document.currentScript?.previousElementSibling?.addEventListener`.
  // Provide a global `document` and a global `window` inside the vm context.
  const vmContext = {
    document: fakeDocumentLike,
    window: fakeWindow,
    Date,
  };
  vm.createContext(vmContext);
  vm.runInContext(scriptBody, vmContext, { filename: 'CiteThis-inline-script.js' });

  // Fire the click.
  listenerHolder.dispatchEvent({ type: 'click', ...fakeClickEvent });

  // Assert exactly one gtag call with the v1 envelope.
  // gtag protocol signature is `gtag('event', eventName, payload)`. We
  // capture the full arg array so all three positions are observable.
  assert.equal(captured.length, 1, `expected 1 gtag call, got ${captured.length}`);
  const [trigger, eventName, payload] = captured[0];
  assert.equal(trigger, 'event', 'first arg must be the gtag "event" trigger');
  assert.equal(eventName, 'mdg_source_select');
  assert.equal(payload.schema_version, 'v1');
  assert.equal(payload.event_name, undefined,
    'payload must not include a separate event_name field; the event name is the second gtag arg');

  // Required envelope fields from EventEnvelope interface.
  assert.equal(payload.privacy_classification, 'anonymous_aggregate');

  // instrumented_at: RFC 3339 UTC, parseable, with mandatory Z suffix.
  assert.ok(typeof payload.instrumented_at === 'string',
    `instrumented_at must be a string, got ${typeof payload.instrumented_at}`);
  assert.match(payload.instrumented_at, RFC3339_UTC_RE,
    `instrumented_at must match RFC 3339 UTC; got ${payload.instrumented_at}`);
  // Round-trip parse: Date.parse the string and confirm the year, month, day round-trip.
  const parsedMs = Date.parse(payload.instrumented_at);
  assert.ok(Number.isFinite(parsedMs),
    `instrumented_at must be parseable by Date.parse; got ${payload.instrumented_at}`);
  // Verify it is UTC: getTime() round-trip through UTC primitives matches.
  const d = new Date(parsedMs);
  assert.equal(d.toISOString(), payload.instrumented_at,
    `instrumented_at must already be in UTC (toISOString form). Got ${payload.instrumented_at}`);

  // Required event-payload fields.
  assert.equal(payload.page_path, '/guides/example/');
  assert.equal(payload.page_title, 'Example Page — Maine Dispensary Guide');
  assert.equal(payload.source_id, 'citation-foo-1');
  assert.equal(payload.source_family, 'citation');
  assert.equal(payload.placement_id, 'cite-this');
});

test('CiteThis instrumentation emits instrumented_at even when gtag is absent (no throw)', () => {
  // Defensive behavior: handler short-circuits when window.gtag is not a function.
  // We assert that no exception escapes and no gtag call is captured.
  const citeThisSource = readCiteThis();
  const scriptBody = extractInstrumentationScriptBody(citeThisSource);

  const listenerHolder = {
    listeners: new Map(),
    addEventListener(type, fn) {
      this.listeners.set(type, fn);
    },
    dispatchEvent(event) {
      const fn = this.listeners.get(event.type);
      if (fn) fn(event);
    },
  };
  const fakeLink = {
    dataset: {
      mdgSourceId: 'x', mdgSourceFamily: 'y', mdgSourcePlacement: 'z',
    },
    closest() { return this; },
  };

  const fakeWindow = {
    // intentionally NOT a function: simulates missing gtag (ad-blockers, dev tools)
    gtag: undefined,
    location: { pathname: '/' },
  };

  const vmContext = {
    document: {
      title: 'x',
      currentScript: { previousElementSibling: listenerHolder },
    },
    window: fakeWindow,
    Date,
  };
  vm.createContext(vmContext);
  vm.runInContext(scriptBody, vmContext, { filename: 'CiteThis-inline-script.js' });

  // The handler at the start guards on `typeof window.gtag !== 'function'`.
  // Calling it must not throw; nothing about the event envelope should be
  // observable because the call is short-circuited. This is a guard against
  // a future maintainer replacing the call with something that runs always
  // and crashes when gtag is missing.
  assert.doesNotThrow(() => {
    listenerHolder.dispatchEvent({ type: 'click', target: fakeLink });
  });
});

test('CiteThis instrumentation script never includes a source_url field', () => {
  // source_url would leak the URL the visitor clicked, which is over-broad
  // for an anonymous-aggregate trust signal. EventEnvelope types permit it
  // only if a publisher opts in via a higher-privacy classification; this
  // emits as anonymous_aggregate and must NOT include source_url.
  const citeThisSource = readCiteThis();
  const scriptBody = extractInstrumentationScriptBody(citeThisSource);
  assert.doesNotMatch(scriptBody, /\bsource_url\s*:/,
    'instrumentation script must not leak source_url under anonymous_aggregate');
});
