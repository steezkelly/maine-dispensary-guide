// tests/axe-accessibility.spec.ts
// Free WCAG 2.1 A + AA + best-practice audit via local axe-core.
//
// MDG's CSP (`script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com
// https://www.google-analytics.com`) blocks `page.addScriptTag({ url })` to any CDN, AND
// blocks injected `<script src=…>` from being executed by the browser even when
// served by Playwright's `route()` handler. The workaround used here:
//   1. Read the bundled `node_modules/axe-core/axe.min.js` source in Node.
//   2. Use `page.addInitScript` to register it on every new document as `window.axe`.
//      `addInitScript` runs in the page's main world with full eval, so the CSP
//      does not block the script source — it's treated as if it were inline JS.
//   3. In the test body, call `page.evaluate(() => window.axe.run(…))` and capture
//      per-impact violation counts and full rule detail for the parent summary.

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

interface AxeNode {
  target: string[] | string;
  html: string;
  failureSummary?: string;
}

interface AxeViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical' | null;
  description: string;
  help: string;
  helpUrl: string;
  tags: string[];
  nodes: AxeNode[];
}

interface AxeResult {
  violations: AxeViolation[];
}

const PAGES = [
  '/roi-calculator',
  '/guides/maine-cannabis-regulations',
  '/guides/fryeburg-dispensary-guide',
  '/guides/maine-dispensary-license',
  '/about/authors',
  '/for-journalists',
  '/cite',
  '/site-health',
];

const WCAG_TAG_RE = /^wcag(\d)(\d{2})(?:(\w+))?$/;

function wcagFromTags(tags: string[]): string {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const t of tags) {
    const m = t.match(WCAG_TAG_RE);
    if (!m) continue;
    const lvl = m[3];
    const criterion = `${m[1]}.${m[2]}`;
    const key = lvl ? `${criterion} (${lvl})` : criterion;
    if (!seen.has(key)) {
      seen.add(key);
      ordered.push(key);
    }
  }
  return ordered.join(', ') || '—';
}

// Resolve axe-core source once from a known-absolute path. Tests run via
// Playwright from the repo root, so axe-core lives at node_modules/axe-core.
const AXE_CANDIDATES = [
  resolve(process.cwd(), 'node_modules', 'axe-core', 'axe.min.js'),
];
const AXE_PATH = AXE_CANDIDATES.find((p) => existsSync(p))!;

test.describe('WCAG accessibility audit (axe-core, local)', () => {
  test.setTimeout(120_000);

  for (const path of PAGES) {
    test(`${path} — collect WCAG 2.1 A+AA violations`, async ({ page }, testInfo) => {
      // Pre-install axe-core on the page via addInitScript so it is available
      // on every navigation, before MDG's other scripts run.
      const axeSource = readFileSync(AXE_PATH, 'utf8');
      // Wrap the IIFE with an explicit assignment so we can detect success
      // and verify the source actually ran, even if `window.axe` is later
      // re-named by other MDG scripts.
      const initSource = `${axeSource};\nwindow.__axeReady = typeof window.axe;\n`;
      await page.addInitScript({
        content: initSource,
      });

      const url = process.env.PREVIEW_URL || 'https://mainedispensaryguide.com';
      await page.goto(url + path, { waitUntil: 'networkidle' });

      const result = await page.evaluate(async () => {
        const ready = (window as any).__axeReady;
        // @ts-ignore — injected by addInitScript
        if (typeof (window as any).axe === 'undefined') {
          return {
            violations: [] as AxeViolation[],
            error: `axe was not injected (window.__axeReady=${ready}; keys-with-axe=${Object.keys(window).filter(k => /axe/i.test(k)).join(',') || 'none'})`,
          };
        }
        const r = await (window as any).axe.run({
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
          resultTypes: ['violations'],
        });
        return r as { violations: AxeViolation[] };
      });

      if ('error' in result) {
        throw new Error(`axe injection failed on ${path}: ${result.error}`);
      }

      const counts = { critical: 0, serious: 0, moderate: 0, minor: 0, total: result.violations.length };
      const lines: string[] = [];
      const impactOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 } as const;
      const sorted = [...result.violations].sort((a, b) => {
        return impactOrder[a.impact || 'minor'] - impactOrder[b.impact || 'minor'];
      });

      for (const v of sorted) {
        const nodes = v.nodes.length;
        if (v.impact && Object.prototype.hasOwnProperty.call(counts, v.impact)) {
          (counts as any)[v.impact] += nodes;
        }
        const firstTarget = v.nodes[0]?.target;
        lines.push(
          `  [${(v.impact || 'unknown').toUpperCase()}] ${v.id} — ${v.help}\n` +
            `      WCAG: ${wcagFromTags(v.tags)}\n` +
            `      Nodes: ${nodes}\n` +
            `      Selector (first): ${Array.isArray(firstTarget) ? firstTarget.join(' ') : firstTarget}\n` +
            `      HTML (first): ${(v.nodes[0]?.html || '').slice(0, 220)}\n` +
            `      Fix URL: ${v.helpUrl}\n` +
            `      Why: ${v.description}`,
        );
      }

      const block = [
        `\n=== ${path} ===`,
        `URL: ${url}${path}`,
        `Counts: critical=${counts.critical} serious=${counts.serious} moderate=${counts.moderate} minor=${counts.minor} (unique-rules=${counts.total})`,
        ...lines,
      ].join('\n');

      process.stdout.write(block + '\n');

      await testInfo.attach('axe-report', {
        body: JSON.stringify({ path, url, counts, violations: result.violations }, null, 2),
        contentType: 'application/json',
      });

      // Soft assertion: surface critical/serious in stdout + attachment, but
      // let the test pass with the report attached. The parent audit table is
      // built from the attached JSON reports — this is a read-only audit, not
      // a regression gate.
      if (counts.critical > 0 || counts.serious > 0) {
        process.stdout.write(
          `  >>> AUDIT FINDING on ${path}: critical=${counts.critical} serious=${counts.serious}\n`,
        );
      }
    });
  }
});
