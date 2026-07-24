'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { formatReport, ratio, KEY_EVENTS, RATIO_EVENTS, BASELINE_EVENTS, ALL_EVENTS } = require('./ga4-key-event-digest.cjs');

test('ratio handles zero and non-finite denominators', () => {
  assert.equal(ratio(0, 0), '0.0%');
  assert.equal(ratio(5, 0), '0.0%');
  assert.equal(ratio(1, 4), '25.0%');
  assert.equal(ratio(3, 7, ), '42.9%');
});

test('ratio event list reflects the live key-event configuration', () => {
  assert.deepEqual(KEY_EVENTS, ['lead_capture', 'mdg_action_select', 'mdg_partner_referral']);
  assert.ok(RATIO_EVENTS.includes('cta_view'));
  assert.ok(RATIO_EVENTS.includes('mdg_active_attention'));
  assert.ok(BASELINE_EVENTS.includes('page_view'));
  for (const e of KEY_EVENTS) assert.ok(!RATIO_EVENTS.includes(e), `${e} must be in key bucket only`);
  for (const e of RATIO_EVENTS) assert.ok(!KEY_EVENTS.includes(e), `${e} must be in ratio bucket only`);
  for (const e of BASELINE_EVENTS) assert.ok(!KEY_EVENTS.includes(e), `${e} must be in baseline bucket only`);
  for (const e of ALL_EVENTS) assert.ok(KEY_EVENTS.includes(e) || RATIO_EVENTS.includes(e) || BASELINE_EVENTS.includes(e));
});

test('formatReport renders every key ratio in percent form with one decimal', () => {
  const totals = [
    { dimensions: { eventName: 'mdg_action_exposure' }, metrics: { eventCount: 500, totalUsers: 100, sessions: 120 } },
    { dimensions: { eventName: 'mdg_action_select' }, metrics: { eventCount: 25, totalUsers: 20, sessions: 22 } },
    { dimensions: { eventName: 'mdg_partner_referral' }, metrics: { eventCount: 5, totalUsers: 5, sessions: 5 } },
    { dimensions: { eventName: 'lead_capture' }, metrics: { eventCount: 1, totalUsers: 1, sessions: 1 } },
    { dimensions: { eventName: 'cta_view' }, metrics: { eventCount: 200, totalUsers: 80, sessions: 100 } },
    { dimensions: { eventName: 'mdg_active_attention' }, metrics: { eventCount: 60, totalUsers: 30, sessions: 40 } },
    { dimensions: { eventName: 'page_engaged' }, metrics: { eventCount: 80, totalUsers: 50, sessions: 60 } },
    { dimensions: { eventName: 'page_view' }, metrics: { eventCount: 1000, totalUsers: 400, sessions: 500 } },
    { dimensions: { eventName: 'session_start' }, metrics: { eventCount: 600, totalUsers: 400, sessions: 600 } },
    { dimensions: { eventName: 'click' }, metrics: { eventCount: 30, totalUsers: 20, sessions: 22 } },
  ];
  const out = formatReport({
    totals,
    byKeyEventPage: [],
    outbound: [],
    channels: [],
    keyEventPages: [],
    from: '2026-07-01',
    to: '2026-07-07',
  });
  assert.match(out, /## 1\. Key-event totals/);
  assert.match(out, /## 2\. Ratio events/);
  assert.match(out, /## 3\. Baseline events/);
  assert.match(out, /## 4\. Conversion ratios/);
  assert.match(out, /\(selection rate\): 5\.0%/);
  assert.match(out, /\(referral rate\): 20\.0%/);
  assert.match(out, /\(capture rate\): 20\.0%/);
  assert.match(out, /\(overall capture rate\): 0\.1%/);
  assert.match(out, /\(CTA density per pageview\): 20\.0%/);
});

test('formatReport emits 0.0% for every ratio when denominators are zero', () => {
  const totals = ALL_EVENTS.map((eventName) => ({ dimensions: { eventName }, metrics: { eventCount: 0, totalUsers: 0, sessions: 0 } }));
  const out = formatReport({ totals, byKeyEventPage: [], outbound: [], channels: [], keyEventPages: [], from: '2026-07-01', to: '2026-07-07' });
  for (const line of [
    /\(selection rate\): 0\.0%/,
    /\(referral rate\): 0\.0%/,
    /\(capture rate\): 0\.0%/,
    /\(overall capture rate\): 0\.0%/,
    /\(CTA density per pageview\): 0\.0%/,
  ]) {
    assert.match(out, line, `ratio line missing: ${line}`);
  }
});

test('formatReport does not embed raw URL, link text, or pseudonymous identifier values', () => {
  const totals = ALL_EVENTS.map((eventName) => ({ dimensions: { eventName }, metrics: { eventCount: 1, totalUsers: 1, sessions: 1 } }));
  const out = formatReport({
    totals,
    byKeyEventPage: [],
    outbound: [],
    channels: [],
    keyEventPages: [{ dimensions: { pagePath: '/foo' }, metrics: { eventCount: 1 } }],
    from: '2026-07-01',
    to: '2026-07-07',
  });
  // The privacy boundary section documents what is excluded; check that
  // no actual data values leak into the report tables.
  for (const forbidden of ['mailto:', 'https://dispensary.example/menu', 'link_text', 'href=']) {
    assert.equal(out.includes(forbidden), false, `digest must not contain ${forbidden}`);
  }
});
