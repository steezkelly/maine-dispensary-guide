'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, 'LeadFormTracker.astro'), 'utf8');
const scriptMatch = source.match(/<script is:inline[^>]*>([\s\S]*?)<\/script>/);
assert.ok(scriptMatch, 'LeadFormTracker must contain an inline browser script');
const scriptBody = scriptMatch[1];

function submitTrackedForm() {
  const events = [];
  const handlers = [];
  const form = {
    elements: {
      namedItem(name) {
        return ({ stage: { value: 'research' } })[name] || null;
      },
    },
    addEventListener(type, handler) {
      if (type === 'submit') handlers.push(handler);
    },
  };
  const sandbox = {
    document: {
      readyState: 'complete',
      querySelectorAll(selector) {
        assert.equal(selector, '.tracked-form');
        return [form];
      },
      addEventListener() {},
    },
    window: {
      location: { pathname: '/contact' },
      gtag(_kind, eventName, payload) {
        events.push({ eventName, payload });
      },
    },
  };

  vm.createContext(sandbox);
  vm.runInContext('var formSelector = ".tracked-form"; var formName = "contact"; var trackFields = ["stage"];', sandbox);
  vm.runInContext(scriptBody, sandbox);
  for (const handler of handlers) handler({});
  return events;
}

test('Formspree submit records an attempt but never claims a verified lead capture', () => {
  const events = submitTrackedForm();
  assert.deepEqual(events.map((event) => event.eventName), [
    'lead_form_start',
    'lead_form_submission_attempt',
  ]);
  assert.equal(events.some((event) => event.eventName === 'lead_capture'), false);
  assert.deepEqual(JSON.parse(JSON.stringify(events[1].payload)), {
    form_name: 'contact',
    page_path: '/contact',
    transport_type: 'beacon',
    transport: 'formspree',
    stage: 'research',
  });
});
