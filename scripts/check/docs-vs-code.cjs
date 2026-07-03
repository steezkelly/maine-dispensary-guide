#!/usr/bin/env node
/**
 * check-docs-vs-code.cjs
 *
 * Lint that catches the "docs claim 6 checks but CI runs 3" class. Scans
 * the AGENTS.md, MDG_AGENT_HANDBOOK.md, PROJECT_STATE.md, and Hub for
 * any check name that's mentioned as "runs in CI" or "runs in pre-push"
 * but isn't actually wired in either the pre-push gate or the CI workflow.
 *
 * Usage:
 *   node scripts/content/check-docs-vs-code.cjs
 *
 * Exit codes:
 *   0  no docs-vs-code drift
 *   1  one or more drift findings
 *
 * What this catches: the senior review flagged that the docs claimed
 * check:hrefs, check:build-warnings, check:content-health,
 * check:content-health-regression, check:sitemap-xml, and Playwright
 * smoke ran in CI — but CI was only running 3 of them. This script
 * would have caught the drift at lint time.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Resolve repo root from this script's location (scripts/check/) up two
// levels. This makes the lint cwd-independent — it works whether invoked
// from the repo root via `node` or from the workspace via `npm --workspace run`.
const REPO = path.resolve(__dirname, '..', '..');
const PRE_PUSH = path.join(REPO, 'scripts/git/pre-push-verify.cjs');
const CI = path.join(REPO, '.github/workflows/ci.yml');

// Canonical list of checks that should be wired in the pre-push gate
// or CI workflow. Defined here, not in the docs — the docs are what
// we're linting.
const CANONICAL_CHECKS = [
  { name: 'check:hrefs', label: 'hrefs / malformed-hrefs' },
  { name: 'check-content-health-regression.cjs', label: 'content-health regression' },
  { name: 'check:content-health', label: 'content-health' },
  { name: 'check:content-health:regression', label: 'content-health regression (npm)' },
  { name: 'check:content-health:test', label: 'content-health test' },
  { name: 'check:build-warnings', label: 'build-warnings' },
  { name: 'check:sitemap-xml', label: 'sitemap-xml' },
  { name: 'check:sitemap-postprocess', label: 'sitemap-postprocess' },
  { name: 'smoke-200', label: 'smoke-200' },
  { name: 'smoke-img-200', label: 'smoke-img-200' },
  { name: 'pre-push', label: 'pre-push gate (esbuild + astro check)' },
  // astro check is the typecheck step in package.json; not a separate
  // npm script but the CI step that runs it
  { name: 'astro check', label: 'astro check / typecheck' },
  // smoke tests are referenced as Playwright in some docs; the
  // actual CI step is "smoke-test-production" which runs npx playwright test
  { name: 'playwright', label: 'Playwright smoke tests' },
];

// Docs to scan. Excludes: BOT_COLLABORATION_HUB.md (historical, would
// generate hundreds of false positives), archive/, research notes.
const DOCS_TO_SCAN = [
  'AGENTS.md',
  'MDG_AGENT_HANDBOOK.md',
  'PROJECT_STATE.md',
  'HANDOVER_ADDENDUM_LINUX_MINT.md',
  'docs/SENIOR_REVIEW_2026-07-02.md',
  'docs/YMYL_TAXES_2026_REWRITE_INTENT_2026-07-02.md',
  'docs/PASSDOWN-2026-05-13.md',
  'docs/PASSDOWN-2026-06-01.md',
];

function fileExists(p) { try { return fs.statSync(p).isFile(); } catch { return false; } }

function readDoc(p) {
  if (!fileExists(p)) return null;
  return fs.readFileSync(p, 'utf8');
}

function getWiredChecks() {
  // Read the actual gate and CI to learn what checks are wired.
  const wired = new Set();
  if (fileExists(PRE_PUSH)) {
    const text = fs.readFileSync(PRE_PUSH, 'utf8');
    for (const { name } of CANONICAL_CHECKS) {
      if (text.includes(name)) wired.add(name);
    }
  }
  if (fileExists(CI)) {
    const text = fs.readFileSync(CI, 'utf8');
    for (const { name } of CANONICAL_CHECKS) {
      if (text.includes(name)) wired.add(name);
    }
  }
  return wired;
}

function findClaimsInDoc(text, file) {
  // Heuristic: look for sentences that name a check + "runs" or "passes" or
  // "wired" or "in CI" or "in pre-push". We want to flag claims about
  // checks that exist as npm scripts but aren't wired.
  const findings = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { name, label } of CANONICAL_CHECKS) {
      // Pattern: "check:foo runs in CI" or "the pre-push gate runs check:foo"
      // or "check:foo step" or "check:foo passes"
      // We only flag the positive-claim patterns, not the negative ones.
      const claimPatterns = [
        new RegExp(`\\b${name.replace(/[:.]/g, '\\$&')}\\b.*\\b(runs?|wires?|fires?|executes?)\\b`, 'i'),
        new RegExp(`\\b(runs?|wires?|fires?|executes?)\\b.*\\b${name.replace(/[:.]/g, '\\$&')}\\b`, 'i'),
        new RegExp(`the\\s+${name.replace(/[:.]/g, '\\$&')}\\s+(step|pass|check|gates?)\\b`, 'i'),
        new RegExp(`\\b${name.replace(/[:.]/g, '\\$&')}\\s+(pass|step|gate)\\b`, 'i'),
      ];
      for (const re of claimPatterns) {
        if (re.test(line)) {
          findings.push({ file, line: i + 1, check: name, text: line.trim() });
          break;
        }
      }
    }

    // Also catch any `check:<name>` claim — even for names not in our
    // canonical list. If the doc claims "check:foo runs in CI" but
    // check:foo doesn't exist in the verify surface, that's drift too.
    // This is the "I made up a check name and claimed it runs" class.
    const checkNameMatches = line.matchAll(/\bcheck:([a-z][a-z0-9-]+)\b/gi);
    for (const m of checkNameMatches) {
      const claimed = 'check:' + m[1];
      if (CANONICAL_CHECKS.some((c) => c.name === claimed)) continue;
      // Skip if the line is in a code fence (markdown ```) — those
      // don't make claims, they show examples.
      const beforeLine = lines.slice(Math.max(0, i - 20), i).join('\n');
      if (/```/.test(beforeLine) && (beforeLine.match(/```/g).length % 2) === 1) continue;
      findings.push({
        file, line: i + 1, check: claimed, text: line.trim(),
        note: 'check name not in canonical list',
      });
    }
  }
  return findings;
}

function main() {
  const wired = getWiredChecks();
  const wiredList = CANONICAL_CHECKS.filter((c) => wired.has(c.name));
  const unwiredList = CANONICAL_CHECKS.filter((c) => !wired.has(c.name));

  console.log('── Wired checks (in pre-push gate or CI workflow)');
  for (const c of wiredList) console.log(`  ✓ ${c.name}`);
  console.log('');
  console.log('── Documented-but-not-wired checks (lint target)');
  for (const c of unwiredList) console.log(`  ! ${c.name}`);

  let findings = 0;
  console.log('');
  console.log('── Scanning docs for unverified claims');
  for (const docPath of DOCS_TO_SCAN) {
    const text = readDoc(docPath);
    if (!text) continue;
    const claims = findClaimsInDoc(text, docPath);
    for (const c of claims) {
      if (wired.has(c.check)) continue; // claim matches actual code, OK
      console.log(`  ✗ ${docPath}:${c.line}: claims "${c.check}" runs, but it is not wired`);
      console.log(`      ${c.text.slice(0, 120)}${c.text.length > 120 ? '…' : ''}`);
      findings++;
    }
  }

  console.log('');
  if (findings === 0) {
    console.log(`✅ No docs-vs-code drift. All claims match the actual verify surface.`);
    process.exit(0);
  } else {
    console.log(`❌ ${findings} docs-vs-code drift finding(s). Either wire the missing check,`);
    console.log(`   or remove the claim from the doc.`);
    process.exit(1);
  }
}

try {
  main();
} catch (e) {
  console.error('check-docs-vs-code crashed:', e.message);
  process.exit(2);
}
