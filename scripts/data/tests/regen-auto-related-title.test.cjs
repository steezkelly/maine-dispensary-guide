'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { extractTitle, isConcretePageUrl } = require('../regen-auto-related.cjs');

test('excludes parameterized Astro route templates from related-page data', () => {
    assert.equal(isConcretePageUrl('/software/[slug]'), false);
    assert.equal(isConcretePageUrl('/cite/[...rest]'), false);
});

test('keeps concrete static routes in related-page data', () => {
    assert.equal(isConcretePageUrl('/software'), true);
    assert.equal(isConcretePageUrl('/software/aiq'), true);
});

const cases = [
    {
        name: 'compliance self-assessment',
        title: 'Free Maine Dispensary Compliance Self-Assessment',
    },
    {
        name: 'METRC reconciliation checklist',
        title: 'Free METRC Monthly Reconciliation Checklist for Maine Dispensaries',
    },
];

for (const fixture of cases) {
    test(`extracts a multiline Layout title for ${fixture.name}`, () => {
        const source = `---\nconst unrelated = true;\n---\n<Layout\n  title="${fixture.title}"\n  description="Fixture"\n>\n  <p>No h1 fallback</p>\n</Layout>\n`;
        assert.equal(extractTitle(source, 'const unrelated = true;'), fixture.title);
    });
}

test('decodes HTML entities in h1 fallback', () => {
    const source = `---\n---\n<h1>Is Cannabis Legal in Maine? Yes &amp; Here&#39;s Why</h1>\n`;
    assert.equal(extractTitle(source, ''), "Is Cannabis Legal in Maine? Yes & Here's Why");
});

test('prefers the page h1 over nested frontmatter object titles', () => {
    const fm = `const posts = [\n  { title: 'How Much Weed Can You Buy in Maine?' },\n];`;
    const source = `---\n${fm}\n---\n<main><h1>Maine Cannabis Blog</h1></main>\n`;
    assert.equal(extractTitle(source, fm), 'Maine Cannabis Blog');
});
