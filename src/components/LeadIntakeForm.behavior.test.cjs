// LeadIntakeForm.behavior.test.cjs — behavioral tests for the W13 incident
// containment. Unlike LeadIntakeForm.test.cjs (source-regex assertions), this
// file EXTRACTS the inline script and EXECUTES the isValidSuccessResponse
// validator and the fetch-handler branching against mocked fetch/DOM, proving
// the actual runtime behavior for every required case.
//
// Run with `node --test LeadIntakeForm.behavior.test.cjs` from the component
// directory. No astro build required.

'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, 'LeadIntakeForm.astro'), 'utf8');

// --- Extract the inline <script is:inline> body ---
const scriptMatch = source.match(/<script is:inline[^>]*>([\s\S]*?)<\/script>/);
assert.ok(scriptMatch, 'inline script block must exist');
const scriptBody = scriptMatch[1];

// --- Extract isValidSuccessResponse as a standalone function ---
const validatorMatch = scriptBody.match(/function isValidSuccessResponse\(data\) \{[\s\S]*?\n    \}/);
assert.ok(validatorMatch, 'isValidSuccessResponse must be defined in the inline script');
const validatorSrc = validatorMatch[0];

// Build a sandbox that exposes the validator for direct unit testing.
function makeValidator() {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(validatorSrc + '\nthis.isValidSuccessResponse = isValidSuccessResponse;', sandbox);
  return sandbox.isValidSuccessResponse;
}
const isValidSuccessResponse = makeValidator();

// ---------------------------------------------------------------------------
// isValidSuccessResponse — the contract validator (pure function)
// ---------------------------------------------------------------------------

test('validator: valid {ok:true,id:1,redirect:"/x"} → true', () => {
  assert.equal(isValidSuccessResponse({ ok: true, id: 1, redirect: '/download-checklist?success=true' }), true);
});

test('validator: valid {ok:true,id:42} without redirect → true', () => {
  assert.equal(isValidSuccessResponse({ ok: true, id: 42 }), true);
});

test('validator: empty object {} → false', () => {
  assert.equal(isValidSuccessResponse({}), false);
});

test('validator: null → false', () => {
  assert.equal(isValidSuccessResponse(null), false);
});

test('validator: undefined → false', () => {
  assert.equal(isValidSuccessResponse(undefined), false);
});

test('validator: {ok:false} → false', () => {
  assert.equal(isValidSuccessResponse({ ok: false, id: 1 }), false);
});

test('validator: {ok:true} without id → false', () => {
  assert.equal(isValidSuccessResponse({ ok: true }), false);
});

test('validator: {ok:true,id:0} → false (id must be positive)', () => {
  assert.equal(isValidSuccessResponse({ ok: true, id: 0 }), false);
});

test('validator: {ok:true,id:-5} → false', () => {
  assert.equal(isValidSuccessResponse({ ok: true, id: -5 }), false);
});

test('validator: {ok:true,id:1.5} → false (id must be integer)', () => {
  assert.equal(isValidSuccessResponse({ ok: true, id: 1.5 }), false);
});

test('validator: {ok:true,id:"1"} → false (id must be number)', () => {
  assert.equal(isValidSuccessResponse({ ok: true, id: '1' }), false);
});

test('validator: unsafe external redirect https://evil.com → false', () => {
  assert.equal(isValidSuccessResponse({ ok: true, id: 1, redirect: 'https://evil.com' }), false);
});

test('validator: protocol-relative redirect //evil.com → false', () => {
  assert.equal(isValidSuccessResponse({ ok: true, id: 1, redirect: '//evil.com' }), false);
});

test('validator: javascript: redirect → false', () => {
  assert.equal(isValidSuccessResponse({ ok: true, id: 1, redirect: 'javascript:alert(1)' }), false);
});

test('validator: empty-string redirect → false', () => {
  assert.equal(isValidSuccessResponse({ ok: true, id: 1, redirect: '' }), false);
});

test('validator: non-string redirect (number) → false', () => {
  assert.equal(isValidSuccessResponse({ ok: true, id: 1, redirect: 123 }), false);
});

test('validator: safe root-relative redirect "/" → true', () => {
  assert.equal(isValidSuccessResponse({ ok: true, id: 1, redirect: '/' }), true);
});

test('validator: backslash redirect /\\evil.com → false (WHATWG protocol-relative bypass)', () => {
  assert.equal(isValidSuccessResponse({ ok: true, id: 1, redirect: '/\\evil.com' }), false);
});

test('validator: control-char redirect /\\t//evil.com → false (browser strips control chars)', () => {
  assert.equal(isValidSuccessResponse({ ok: true, id: 1, redirect: '/\t//evil.com' }), false);
});

test('validator: newline redirect /\\n//evil.com → false', () => {
  assert.equal(isValidSuccessResponse({ ok: true, id: 1, redirect: '/\n//evil.com' }), false);
});

// ---------------------------------------------------------------------------
// Fetch-handler branching — behavioral proof via mocked fetch + DOM
// ---------------------------------------------------------------------------

// Build a minimal DOM/fetch harness that runs the submit handler end-to-end.
// We extract the whole IIFE and run it against a fake document/window, then
// dispatch a synthetic submit and assert on side effects.
function runSubmitHarness({ responseBody, responseOk = true, jsonThrows = false, endpoint = 'https://example.com/api/lead' }) {
  const events = [];          // captured gtag events
  const redirects = [];       // captured window.location.href assignments
  let appendedNode = null;    // node appended to the form (failure message)

  // Fake form element with the data-* attributes the handler reads.
  const formElements = [];
  const form = {
    id: 'test-form',
    elements: formElements,
    getAttribute(name) {
      const attrs = {
        'data-endpoint': endpoint,
        'data-lead-to': 'leads@example.com',
        'data-lead-subject': 'Lead',
        'data-lead-body': 'Body',
        'data-form-name': 'test_form',
        'data-success-path': '/success',
        'data-track-fields': 'stage',
      };
      return attrs[name] !== undefined ? attrs[name] : null;
    },
    appendChild(node) { appendedNode = node; },
    addEventListener(type, fn) { form._submitHandler = fn; },
  };

  // Fake window/document/crypto.
  const sandbox = {
    document: {
      getElementById: (id) => (id === 'test-form' ? form : null),
      referrer: '',
      createElement: (tag) => {
        const node = { tagName: tag, attrs: {}, textContent: '', hidden: false };
        node.setAttribute = (k, v) => { node.attrs[k] = v; };
        node.id = '';
        return node;
      },
    },
    window: {
      location: { href: 'https://mainedispensaryguide.com/download-checklist', pathname: '/download-checklist' },
      gtag: (kind, eventName, payload) => { events.push({ eventName, payload }); },
      crypto: { randomUUID: () => 'b78db437-757c-4c10-a497-50344c0feaea' },
    },
    setTimeout: (fn) => { Promise.resolve().then(() => fn()); },
    fetch: () => Promise.resolve({
      ok: responseOk,
      json: () => (jsonThrows ? Promise.reject(new Error('bad json')) : Promise.resolve(responseBody)),
    }),
    URL: URL,
  };
  // window.location.href setter capture
  Object.defineProperty(sandbox.window.location, 'href', {
    get() { return this._href || 'https://mainedispensaryguide.com/download-checklist'; },
    set(v) { this._href = v; redirects.push(v); },
    configurable: true,
  });
  sandbox.window.location.pathname = '/download-checklist';

  vm.createContext(sandbox);
  // Provide the formId define:vars binding the inline script expects.
  vm.runInContext('var formId = "test-form";', sandbox);
  vm.runInContext(scriptBody, sandbox);

  // Dispatch a synthetic submit. Provide email + consent so the handler proceeds.
  form.elements = [
    { name: 'email', value: 'test@example.com' },
    { name: 'consent', value: '1' },
    { name: 'website', value: '' },
    { name: 'stage', value: 'research' },
  ];
  form._submitHandler({ preventDefault() {} });

  // Return a promise that resolves after the fetch chain settles.
  return new Promise((resolve) => {
    setTimeout(() => resolve({ events, redirects, appendedNode, form }), 20);
  });
}

test('behavior: empty 200 (jsonThrows) → failure message, no redirect, no lead_capture', async () => {
  const { events, redirects, appendedNode } = await runSubmitHarness({ responseBody: null, jsonThrows: true });
  assert.ok(appendedNode, 'a failure message node must be appended');
  assert.equal(appendedNode.attrs['role'], 'alert');
  assert.match(appendedNode.textContent, /couldn[\u2019']t confirm/);
  assert.equal(redirects.length, 0, 'must NOT redirect');
  const leadCapture = events.filter((e) => e.eventName === 'lead_capture');
  assert.equal(leadCapture.length, 0, 'must NOT fire lead_capture');
});

test('behavior: malformed JSON 200 → failure, no redirect, no lead_capture', async () => {
  const { events, redirects, appendedNode } = await runSubmitHarness({ responseBody: null, jsonThrows: true });
  assert.ok(appendedNode);
  assert.equal(redirects.length, 0);
  assert.equal(events.filter((e) => e.eventName === 'lead_capture').length, 0);
});

test('behavior: {} 200 → failure, no redirect, no lead_capture', async () => {
  const { events, redirects, appendedNode } = await runSubmitHarness({ responseBody: {} });
  assert.ok(appendedNode);
  assert.equal(redirects.length, 0);
  assert.equal(events.filter((e) => e.eventName === 'lead_capture').length, 0);
});

test('behavior: {ok:false} → failure, no redirect, no lead_capture', async () => {
  const { events, redirects, appendedNode } = await runSubmitHarness({ responseBody: { ok: false, id: 1 } });
  assert.ok(appendedNode);
  assert.equal(redirects.length, 0);
  assert.equal(events.filter((e) => e.eventName === 'lead_capture').length, 0);
});

test('behavior: {ok:true} without id → failure', async () => {
  const { events, redirects, appendedNode } = await runSubmitHarness({ responseBody: { ok: true } });
  assert.ok(appendedNode);
  assert.equal(redirects.length, 0);
  assert.equal(events.filter((e) => e.eventName === 'lead_capture').length, 0);
});

test('behavior: {ok:true,id:0} → failure', async () => {
  const { events, redirects, appendedNode } = await runSubmitHarness({ responseBody: { ok: true, id: 0 } });
  assert.ok(appendedNode);
  assert.equal(redirects.length, 0);
  assert.equal(events.filter((e) => e.eventName === 'lead_capture').length, 0);
});

test('behavior: unsafe external redirect → failure, no redirect', async () => {
  const { events, redirects, appendedNode } = await runSubmitHarness({
    responseBody: { ok: true, id: 1, redirect: 'https://evil.com' },
  });
  assert.ok(appendedNode);
  assert.equal(redirects.length, 0, 'must NOT navigate to unsafe redirect');
  assert.equal(events.filter((e) => e.eventName === 'lead_capture').length, 0);
});

test('behavior: valid {ok:true,id:1,redirect:"/download-checklist?success=true"} → analytics + redirect', async () => {
  const { events, redirects, appendedNode } = await runSubmitHarness({
    responseBody: { ok: true, id: 1, redirect: '/download-checklist?success=true' },
  });
  assert.equal(appendedNode, null, 'no failure message');
  assert.equal(events.filter((e) => e.eventName === 'lead_capture').length, 1, 'lead_capture fires once');
  assert.deepEqual(redirects, ['/download-checklist?success=true'], 'redirects to returned path');
});

test('behavior: valid response without redirect → configured success path', async () => {
  const { events, redirects, appendedNode } = await runSubmitHarness({
    responseBody: { ok: true, id: 7 },
  });
  assert.equal(appendedNode, null, 'no failure message');
  assert.equal(events.filter((e) => e.eventName === 'lead_capture').length, 1);
  assert.deepEqual(redirects, ['/success'], 'falls back to data-success-path');
});

test('behavior: lead_form_start fires on intent before fetch resolves', async () => {
  const { events } = await runSubmitHarness({ responseBody: { ok: true, id: 1 } });
  const starts = events.filter((e) => e.eventName === 'lead_form_start');
  assert.equal(starts.length, 1, 'lead_form_start fires exactly once on intent');
});

test('behavior: non-2xx → mailto fallback is measured without claiming a verified capture', async () => {
  const { events, redirects } = await runSubmitHarness({ responseBody: null, responseOk: false });
  assert.ok(redirects.some((r) => r.startsWith('mailto:')), 'non-2xx opens mailto fallback');
  assert.equal(events.filter((event) => event.eventName === 'lead_mailto_open').length, 1);
  assert.equal(events.filter((event) => event.eventName === 'lead_capture').length, 0);
});

test('behavior: mailto path records an open signal but never a verified lead capture', async () => {
  const { events, redirects } = await runSubmitHarness({ responseBody: null, endpoint: '' });
  assert.ok(redirects.some((r) => r.startsWith('mailto:')), 'mailto path opens the client');
  assert.deepEqual(events.map((event) => event.eventName), [
    'lead_form_start',
    'lead_mailto_open',
  ]);
  assert.equal(events.some((event) => event.eventName === 'lead_capture'), false);
});
