'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { extractTitle } = require('../regen-auto-related.cjs');

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
