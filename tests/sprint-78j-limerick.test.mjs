/**
 * tests/sprint-78j-limerick.test.mjs
 *
 * Sprint 78j — Limerick town-guide rewrite verification.
 *
 * Runs pre-deploy checks against
 * apps/maine-cannabis/src/pages/guides/limerick-dispensary-guide.astro
 * to confirm the 78j edit is in place before push.
 *
 * What this verifies (one assertion per check):
 *
 *   1. H1 contains "Founding Farmers" as the first non-tag token.
 *   2. H1 contains "Limerick Maine Dispensary".
 *   3. Frontmatter FAQPage JSON-LD has 5 Q's (parity with rendered
 *      <Faq> component — closes the schema-vs-rendered mismatch).
 *   4. Frontmatter FAQPage JSON-LD's first Q.name literally starts
 *      with "Founding Farmers" (matches dominant 156-imp search query).
 *   5. Frontmatter modifiedDate is "2026-07-10" (bumped from 2026-05-13).
 *   6. Address "16 Main Street" preserved (no fabricated change).
 *   7. Phone "(207) 315-5259" preserved (no fabricated change).
 *   8. Verifier names "Calvin Waters" + "Margaret Finch" present in
 *      footer (preserves the existing editor-pair attribution).
 *   9. Primary-source link "ffmaine.com" preserved.
 *
 * RED-GREEN TDD: this test was authored BEFORE the live-file edit.
 * Pre-edit it should fail checks 1, 3, 4, 5. Post-edit all 9 pass.
 *
 * Run: node tests/sprint-78j-limerick.test.mjs
 * Exit 0 = all 9 checks pass. Exit 1 = at least one fails.
 */

import fs from 'node:fs';
import path from 'node:path';

const REPO = '/home/steve/projects/maine-dispensary-guide';
const PAGE = path.join(REPO, 'apps/maine-cannabis/src/pages/guides/limerick-dispensary-guide.astro');

let pass = 0;
let fail = 0;
function check(label, ok) {
  const icon = ok ? '\u2713' : '\u2717';
  console.log(`  [${icon}] ${label}`);
  ok ? pass++ : fail++;
}

const src = fs.readFileSync(PAGE, 'utf8');

console.log(`Sprint 78j \u2014 limerick-dispensary-guide.astro verification`);
console.log('----------------------------------------------------------------');

// 1. H1 brand-leader first
const h1Match = src.match(/<h1[^>]*>([^<]+)<\/h1>/);
const h1 = h1Match ? h1Match[1].trim() : '';
check(
  `H1 leads with "Founding Farmers" (got: "${h1}")`,
  /^Founding Farmers\b/.test(h1)
);

// 2. H1 mentions Limerick Maine Dispensary
check(
  `H1 includes "Limerick Maine Dispensary" (got: "${h1}")`,
  h1.includes('Limerick Maine Dispensary')
);

// 3. FAQPage JSON-LD has 5 Q's (parity with rendered <Faq>)
const faqMatch = src.match(/faqPageJsonLd\s*=\s*JSON\.stringify\(/);
let qCount = 0;
let firstQName = '';
if (faqMatch) {
  // Walk the source character-by-character to find the matching `});`
  // (greedy regex stops at the first closing brace inside nested Q objects).
  const start = faqMatch.index + faqMatch[0].length;
  let depth = 0;
  let end = -1;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end !== -1) {
    const jsonText = src.slice(start, end + 1);
    try {
      const parsed = JSON.parse(jsonText);
      qCount = parsed.mainEntity?.length || 0;
      firstQName = parsed.mainEntity?.[0]?.name || '';
    } catch (err) {
      console.log(`  (JSON-LD parse failed at offset ${start}-${end}: ${err.message})`);
    }
  }
}
check(`Frontmatter FAQPage JSON-LD has exactly 5 Q's (got ${qCount})`, qCount === 5);

// 4. First FAQ Q matches dominant search query
check(
  `First FAQ Q.name starts with "Founding Farmers Limerick Maine" (got: "${firstQName}")`,
  /^Founding Farmers Limerick Maine/i.test(firstQName)
);

// 5. modifiedDate bumped
check(
  `Frontmatter modifiedDate is "2026-07-10"`,
  /modifiedDate:\s*['"]2026-07-10['"]/.test(src)
);

// 6. Address preserved
check(
  'Address "16 Main Street" preserved',
  /16 Main Street|16 Main St/.test(src)
);

// 7. Phone preserved
check(
  'Phone "(207) 315-5259" preserved',
  /207[.\- ]?315[.\- ]?5259|\(207\) 315-5259/.test(src)
);

// 8. Verifier names present
check(
  'Verifier name "Calvin Waters" + "Margaret Finch" present',
  /Calvin Waters/.test(src) && /Margaret Finch/.test(src)
);

// 9. ffmaine.com primary source preserved
check(
  'Primary source ffmaine.com preserved',
  /ffmaine\.com/.test(src)
);

// 10. faqPageJsonLd is actually rendered (closes a pre-existing
//     declared-but-unused-var bug — without this emission, the page
//     has zero FAQPage schema served to Google and 0% rich-result
//     eligibility).
check(
  'JSON-LD emission block for faqPageJsonLd present',
  /<script type="application\/ld\+json"[^>]*set:html=\{faqPageJsonLd\}/.test(src)
);

// 11. The rendered <Faq> component has withoutSchema=true — this
//     prevents the package's auto-emitted FAQPage JSON-LD from
//     duplicating the brand-leader schema this page now composes
//     explicitly. Without this, Google sees two FAQPage blocks on
//     one page with different Q1.name values.
check(
  'Rendered <Faq> uses withoutSchema={true} (closes duplicate-schema path)',
  /<Faq\b[^>]*\bwithoutSchema\b/.test(src)
);

console.log(`\n${pass} pass / ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
