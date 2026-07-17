const test = require('node:test');
const assert = require('node:assert');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const PAGE = resolve(
  __dirname,
  '..', '..',
  'pages/guides/portland-dispensary-guide.astro',
);
const AUTO_RELATED = resolve(__dirname, '..', 'AutoRelated.astro');
const ON_THIS_PAGE = resolve(__dirname, '..', 'OnThisPage.astro');
const CALLOUT = resolve(
  __dirname,
  '..', '..', '..', '..', '..',
  'packages/ui/src/components/Callout.astro',
);

const EXPECTED_HEADINGS = [
  ['Portland at a Glance', 'portland-at-a-glance'],
  ['The Portland Opportunity', 'the-portland-opportunity'],
  ['The Real Talk', 'the-real-talk'],
  ['Portland Market Data', 'portland-market-data'],
  ["Local X-Factor: Portland's Craft Consumer", 'local-x-factor-portlands-craft-consumer'],
  ["Portland's Competitive Landscape", 'portlands-competitive-landscape'],
  ['Local Regulations', 'local-regulations'],
  ['Best Locations in Portland', 'best-locations-in-portland'],
  ['Nearby Towns & Related Guides', 'nearby-towns-and-related-guides'],
  ['Next Steps', 'next-steps'],
  ['Frequently Asked Questions', 'frequently-asked-questions'],
  ['External Resources', 'external-resources'],
  ['See also: Maine dispensary guides nearby', 'see-also-maine-dispensary-guides-nearby'],
];

function getInvocation(source, name) {
  const invocation = source.match(new RegExp(`<${name}\\b[^>]*(?:/>|>)`));
  assert.ok(invocation, `Portland guide should mount ${name}`);
  return invocation[0];
}

function attribute(invocation, name) {
  return invocation.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1];
}

function headingText(html) {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

test('OnThisPage typed frontmatter begins with an opening Astro fence', () => {
  const source = readFileSync(ON_THIS_PAGE, 'utf8');
  assert.match(source, /^---\r?\n/, 'OnThisPage typed frontmatter must begin with an opening --- fence');
});

test('Portland rendered article heading contract covers literal and mounted component headings', () => {
  const page = readFileSync(PAGE, 'utf8');
  const autoRelated = readFileSync(AUTO_RELATED, 'utf8');
  const callout = readFileSync(CALLOUT, 'utf8');
  const literalHeadings = [...page.matchAll(/<h([23])\b([^>]*)>([\s\S]*?)<\/h\1>/g)].map((match) => ({
    position: match.index,
    level: Number(match[1]),
    label: headingText(match[3]),
    id: match[2].match(/\bid="([^"]+)"/)?.[1],
  }));

  const calloutInvocation = getInvocation(page, 'Callout');
  const calloutHeadingId = attribute(calloutInvocation, 'headingId');
  assert.strictEqual(
    calloutHeadingId,
    'the-real-talk',
    'Portland Callout invocation must set its semantic component heading ID',
  );
  assert.strictEqual(attribute(calloutInvocation, 'title'), 'The Real Talk');
  assert.match(callout, /headingId\?:\s*string/, 'Callout must expose optional headingId');
  assert.match(callout, /<h2\b[^>]*\bid=\{headingId\}[^>]*>\{title\}<\/h2>/, 'Callout H2 must render headingId');
  assert.match(callout, /<h3\b[^>]*\bid=\{headingId\}[^>]*>\{title\}<\/h3>/, 'Callout H3 must render headingId');
  assert.match(callout, /level\s*=\s*'h2'/, 'Portland titled Callout resolves to an H2 by default');

  const autoRelatedInvocation = getInvocation(page, 'AutoRelated');
  const autoRelatedHeadingId = attribute(autoRelatedInvocation, 'headingId');
  assert.strictEqual(
    autoRelatedHeadingId,
    'nearby-towns-and-related-guides',
    'Portland AutoRelated invocation must set its semantic component heading ID',
  );
  assert.strictEqual(attribute(autoRelatedInvocation, 'section'), 'City Guides');
  assert.match(autoRelated, /headingId\?:\s*string/, 'AutoRelated must expose optional headingId');
  assert.match(autoRelated, /<h2\b[^>]*\bid=\{headingId\}[^>]*>\{sectionTitle\}<\/h2>/, 'AutoRelated H2 must render headingId');
  assert.match(
    autoRelated,
    /section === 'City Guides' \? 'Nearby Towns & Related Guides'/,
    'Portland AutoRelated resolves to its City Guides heading',
  );

  const renderedHeadings = [
    ...literalHeadings,
    {
      position: page.indexOf(calloutInvocation),
      level: 2,
      label: 'The Real Talk',
      id: calloutHeadingId,
    },
    {
      position: page.indexOf(autoRelatedInvocation),
      level: 2,
      label: 'Nearby Towns & Related Guides',
      id: autoRelatedHeadingId,
    },
  ].sort((a, b) => a.position - b.position);

  assert.strictEqual(renderedHeadings.length, 13, 'Portland article must expose all 13 rendered H2/H3 headings');
  assert.deepStrictEqual(
    renderedHeadings.map(({ label, id }) => [label, id]),
    EXPECTED_HEADINGS,
    'the deferred Portland TOC contract must list every rendered heading in article order',
  );
  assert.ok(renderedHeadings.every(({ id }) => id), 'every rendered Portland H2/H3 requires an explicit ID');
  const ids = renderedHeadings.map(({ id }) => id);
  assert.strictEqual(new Set(ids).size, ids.length, 'rendered heading IDs must be unique');
  assert.ok(ids.every((id) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)), 'IDs must be stable lowercase kebab-case');
});
