const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const appRoot = resolve(__dirname, '..', '..');
const marketStatsSource = readFileSync(
  resolve(appRoot, 'pages/market-stats.astro'),
  'utf8',
);
const citeThisSource = readFileSync(
  resolve(appRoot, 'components/CiteThis.astro'),
  'utf8',
);

function openingLeadMailtoForm(source) {
  const match = source.match(/<LeadMailtoForm\b[\s\S]*?>/);
  assert.ok(match, 'market-stats should mount LeadMailtoForm');
  return match[0];
}

test('CiteThis remains the only owner of the canonical cite-this ID', () => {
  assert.equal(
    (citeThisSource.match(/\bid=["']cite-this["']/g) || []).length,
    1,
    'CiteThis.astro should own exactly one canonical id="cite-this"',
  );
  assert.equal(
    (marketStatsSource.match(/\bid=["']cite-this["']/g) || []).length,
    0,
    'market-stats should not wrap CiteThis in a duplicate cite-this ID',
  );
});

test('market-stats describes its video as a 60-second summary', () => {
  assert.match(marketStatsSource, /<figcaption>\s*Live 60-second summary\b/i);
  assert.doesNotMatch(marketStatsSource, /\b35-second summary\b/i);
});

test('market-stats mounts LeadMailtoForm with the supported data-request contract', () => {
  assert.match(
    marketStatsSource,
    /import\s+LeadMailtoForm\s+from\s+['"]\.\.\/components\/LeadMailtoForm\.astro['"];?/,
  );

  const mount = openingLeadMailtoForm(marketStatsSource);
  assert.match(mount, /\bformId=["']market-stats-data-request-form["']/);
  assert.match(mount, /\bleadTo=\{dataRequestLeadTo\}/);
  assert.match(mount, /\bleadSubject=\{dataRequestLeadSubject\}/);
  assert.match(mount, /\bleadBody=\{dataRequestLeadBody\}/);
  assert.match(mount, /\bformName=["']market_stats_data_request["']/);
  assert.match(
    mount,
    /\bsuccessPath=["']\/market-stats\?data-request=sent#data-request["']/,
  );
  assert.match(mount, /\btrackFields=\{\[\s*['"]request_type['"]\s*\]\}/);
  assert.doesNotMatch(mount, /\b(?:pageTitle|context)=/);

  assert.match(
    marketStatsSource,
    /const\s+dataRequestLeadTo\s*=\s*['"]press@mainedispensaryguide\.com['"]/,
  );
  assert.match(marketStatsSource, /const\s+dataRequestLeadSubject\s*=.*market stats data request.*\{request_type\}.*\{email\}/i);
  assert.match(marketStatsSource, /const\s+dataRequestLeadBody\s*=[\s\S]*?market-stats data request[\s\S]*?\{name\}[\s\S]*?\{email\}[\s\S]*?\{request_type\}[\s\S]*?\{message\}/i);
});

test('data-request form has the required fields and explicit mail-app handoff states', () => {
  const mountStart = marketStatsSource.indexOf('<LeadMailtoForm');
  const mountEnd = marketStatsSource.indexOf('</LeadMailtoForm>', mountStart);
  assert.ok(mountStart >= 0 && mountEnd > mountStart, 'LeadMailtoForm should have a closing tag');
  const formBody = marketStatsSource.slice(mountStart, mountEnd);

  assert.match(formBody, /<input\b(?=[^>]*\bname=["']name["'])(?![^>]*\brequired\b)[^>]*>/i);
  assert.match(formBody, /<input\b(?=[^>]*\btype=["']email["'])(?=[^>]*\bname=["']email["'])(?=[^>]*\brequired\b)[^>]*>/i);
  assert.match(
    formBody,
    /<select\b(?=[^>]*\bname=["']request_type["'])(?=[^>]*\brequired\b)[^>]*>/i,
    'request type must remain required',
  );
  assert.match(
    formBody,
    /<textarea\b(?=[^>]*\bname=["']message["'])(?=[^>]*\brequired\b)[^>]*>/i,
    'request message must remain required',
  );
  assert.match(formBody, /<option\s+value=["']underlying-data["']>\s*Underlying data\s*<\/option>/i);
  assert.match(formBody, /<option\s+value=["']source-clarification["']>\s*Source clarification\s*<\/option>/i);
  assert.match(formBody, /<option\s+value=["']press-question["']>\s*Press question\s*<\/option>/i);

  const successStart = marketStatsSource.indexOf('<div id="data-request-success"');
  const successEnd = marketStatsSource.indexOf('</div>', successStart);
  assert.ok(successStart >= 0 && successEnd > successStart, 'mail-handoff success state should exist');
  const successCopy = marketStatsSource.slice(successStart, successEnd);

  assert.match(marketStatsSource, /opens?\s+a pre-addressed message in your\s+mail app[^.]*review and send/i);
  assert.match(marketStatsSource, /id=["']data-request["']/);
  assert.match(marketStatsSource, /id=["']data-request-success["']/);
  assert.match(marketStatsSource, /mail app should have opened/i);
  assert.doesNotMatch(
    successCopy,
    /\b(?:email|request)\s+(?:was\s+)?(?:sent|delivered)\b/i,
    'the mail handoff must not claim completed delivery',
  );
  assert.match(
    marketStatsSource,
    /<a\s+href=["']mailto:press@mainedispensaryguide\.com["']>\s*press@mainedispensaryguide\.com\s*<\/a>/i,
    'the reader must see a direct press contact, not only a hidden form recipient',
  );
  assert.match(marketStatsSource, /href=["']#market-stats-data-request-form["'][^>]*>\s*Retry/i);
});

test('data-request form follows CiteThis and precedes methodology in article flow', () => {
  const citeThis = marketStatsSource.indexOf('<CiteThis');
  const dataRequest = marketStatsSource.indexOf('id="data-request"');
  const methodology = marketStatsSource.indexOf('id="methodology"');

  assert.ok(citeThis >= 0, 'CiteThis mount should exist');
  assert.ok(dataRequest > citeThis, 'data request should follow CiteThis');
  assert.ok(methodology > dataRequest, 'data request should precede methodology');
});
