'use strict';

/**
 * Regression tests for data-only assertion (Ticket 006 wiring perf).
 *
 * Run: node apps/maine-cannabis/scripts/analytics/test-data-only-assert.cjs
 *
 * Tests are NOT yet wired into `npm run verify:iterate` — they don't share
 * the existing test runner. The shared module is
 * `apps/maine-cannabis/scripts/analytics/data-only-assert.cjs` — used by both
 * this test and `scripts/git/pre-push-verify.cjs`. Drift between those
 * callers is the most common failure mode here.
 *
 * Test coverage:
 *   1. single-line data attribute addition: PASS
 *   2. multi-line tag where data-attr appears on a different line: PASS
 *   3. HTML comment + data-* attr: PASS
 *   4. spacing-only line: PASS
 *   5. non-data addition (e.g. text change): FAIL
 *   6. import statement addition: FAIL
 *   7. data-* attr removal (use of `-` not `+`): not exercised here (only +lines)
 *   8. hunk containing both a data-attr line AND a multi-line tag-open: PASS
 *   9. hunk containing ONLY tag-open-no-data lines (no data attr): FAIL
 *  10. multi-data-attr on a single minified line: PASS, attrsCount==N
 *  11. `>`-only line accepted
 *  12. JS block-comment context (`+ *     <!-- ... -->`)
 */

const { assertHunk, assertDiffText } = require('./data-only-assert.cjs');

const fixtures = [
    {
        name: '1. single-line data-* attr addition',
        expect_ok: true,
        expect_attrsCount: 1,
        hunk: [
            '+<details data-faq data-faq-id="faq-x-1">',
        ],
    },
    {
        name: '2. multi-line tag, data-attr on closing line',
        expect_ok: true,
        expect_attrsCount: 1,
        hunk: [
            '+<button type="button"',
            '+                  class="btn" data-cta-id="cta-x-1">',
        ],
    },
    {
        name: '3. comment + data-*',
        expect_ok: true,
        expect_attrsCount: 1,
        hunk: [
            '+<!-- analytics:faq-injected faq-id=x -->',
            '+<details data-faq data-faq-id="x-1">',
        ],
    },
    {
        name: '4. spacing-only line + data-*',
        expect_ok: true,
        expect_attrsCount: 1,
        hunk: [
            '+',
            '+<details data-faq data-faq-id="x-1">',
            '+',
        ],
    },
    {
        name: '5. text change (no data-*)',
        expect_ok: false,
        expect_attrsCount: 0,
        hunk: [
            '+Hello world, this is a body change that is not a data attribute.',
        ],
    },
    {
        name: '6. import statement addition',
        expect_ok: false,
        expect_attrsCount: 0,
        hunk: [
            "+import { foo } from './bar';",
        ],
    },
    {
        // The hunk has BOTH a tag-open-no-data line AND a data-attr line in the
        // same multi-line edit. Hunk-level fallback should pass it.
        name: '8. hunk with mixed data-attr + multi-line tag-open',
        expect_ok: true,
        expect_attrsCount: 1,
        hunk: [
            '+<button type="button"',
            '+                  class="btn" data-cta-id="cta-x-1">',
            '+                  aria-pressed="true">',
        ],
    },
    {
        name: '9. hunk with only tag-open-no-data lines',
        expect_ok: false,
        expect_attrsCount: 0,
        hunk: [
            '+<button type="button"',
            '+                  class="btn">',
        ],
    },
    {
        name: '10. minified line with multiple data-* attrs',
        expect_ok: true,
        expect_attrsCount: 3,
        hunk: [
            '+<details data-faq data-faq-id="x-1" data-cms-extra="extra"><summary data-q="q1">Q</summary></details>',
        ],
    },
    {
        // `>` line alone passes
        name: '11. closing-bracket-only line + data-*',
        expect_ok: true,
        expect_attrsCount: 1,
        hunk: [
            '+',
            '+>',
            '+<details data-faq data-faq-id="x-1">',
        ],
    },
    {
        // Anchor "-HTML comment ..." style multi-line with leading ` * ` (JS-doc-comment)
        name: '12. JS block-comment context',
        expect_ok: true,
        expect_attrsCount: 1,
        hunk: [
            '+ *     <!-- analytics:cta-injected id=cta-x-1 -->',
            '+<button type="button" class="btn" data-cta-id="cta-x-1">',
        ],
    },
    {
        // Multi-hunk scenario: assertDiffText handles @@ separators.
        name: '13. multi-hunk diff (two hunks, both data-only)',
        expect_ok: true,
        expect_attrsCount: 2,
        diffText: [
            '@@ -1,1 +1,1 @@',
            '+<details data-faq data-faq-id="hunk-1">',
            '@@ -10,1 +10,1 @@',
            '+<a href="#" data-cta-id="cta-hunk-2">',
        ].join('\n'),
    },
    {
        // Multi-hunk scenario: second hunk violates (non-data).
        name: '14. multi-hunk diff (second hunk violates)',
        expect_ok: false,
        expect_attrsCount: 1,
        diffText: [
            '@@ -1,1 +1,1 @@',
            '+<details data-faq data-faq-id="hunk-1">',
            '@@ -10,1 +10,1 @@',
            '+import { x } from "y";',
        ].join('\n'),
    },
];

function main() {
    let pass = 0, fail = 0;
    for (const f of fixtures) {
        let result;
        if (f.diffText) {
            result = assertDiffText(f.diffText);
        } else {
            result = assertHunk(f.hunk);
        }
        const okMatch = result.ok === f.expect_ok;
        const countMatch = result.attrsCount === f.expect_attrsCount;
        if (okMatch && countMatch) {
            console.log(`PASS  ${f.name}`);
            pass++;
        } else {
            console.log(`FAIL  ${f.name}`);
            console.log(`      expected: ok=${f.expect_ok}, attrsCount=${f.expect_attrsCount}`);
            console.log(`      actual:   ok=${result.ok}, attrsCount=${result.attrsCount}`);
            console.log(`      violations: ${JSON.stringify(result.violations.slice(0, 3))}`);
            fail++;
        }
    }
    console.log(`\n${pass}/${pass+fail} fixtures pass`);
    if (fail > 0) process.exit(1);
}

if (require.main === module) main();
