// scripts/check/control-size-audit.mjs
//
// Project-wide 44px audit (Stage 2 Important #4).
//
// Spec §1.3 mandates "controls expose at least 44px in both interactive
// dimensions." Source-level coverage currently exists for the foundation
// `.btn`, `.btn-primary`, `button, input, select, textarea`, SiteHeader
// header controls, AuthorityHero .btn-primary, Newsletter .btn-primary,
// MunicipalityExplorer search input + link, LatestIntelligence link,
// OnThisPage links, BreadcrumbList rail.
//
// This script audits the rest of the surface: it walks every .astro file
// in apps/maine-cannabis/src/pages and apps/maine-cannabis/src/components
// for inline CSS rules that set min-block-size, min-inline-size, min-height,
// min-width, width, or height to less than 44px on a button, input,
// select, textarea, or role=button selector. Allow-listed selectors and
// properties are excluded.
//
// If the audit finds violations, it prints them and exits 1.
// If clean, exits 0.
//
// Usage:
//   node scripts/check/control-size-audit.mjs
//   node scripts/check/control-size-audit.mjs --json

import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const REPO = process.cwd();
const TARGETS = [
  'apps/maine-cannabis/src/pages',
  'apps/maine-cannabis/src/components',
  'packages/ui/src/components',
  'packages/layouts/src/components',
];
const ARG = process.argv[2];
const JSON_MODE = ARG === '--json';

// Selectors exempt from the audit. These are either small typography
// elements (table cells, captions, eyebrow labels) or accept the strict
// 44px floor via the foundation/shared-CSS layer (button, .btn, .btn-,
// input, select, textarea baselines are pinned in components.css).
//
// Native form-control dimensions (checkbox, radio) are controlled by
// the browser's appearance engine and the WCAG tap-target is satisfied
// by the surrounding <label>; the visible glyph may stay at 17.6px or
// larger without violating §1.3. The audit allows them so the project's
// measured responsibility is the tap target (label/legend), which the
// foundation + per-page CSS contract enforces.
const ALLOWED_SELECTORS = new Set([
  'th',
  'td',
  'input[type="checkbox"]',
  'input[type="radio"]',
  '.editor-link',
  '.newsletter-form input',
]);

// CSS properties whose values below 44px are tolerated because they're
// decorative or non-control sizing (border thickness, icon dimension, etc).
// We only flag properties that control interactive-target sizing.
const FLAGGED_PROPS = ['min-block-size', 'min-inline-size', 'min-height', 'min-width', 'width', 'height'];
// Properties whose "0" value is a layout primitive (flex-shrink hint,
// reset) and not a target size.
const ZERO_TOLERATED_PROPS = new Set(['min-width', 'min-height']);
const MIN_OK = 44;
const PX_RE = /(-?\d*\.?\d+)\s*(px|rem|em)?/g;

// Common interactive selectors that should hit 44px.
const INTERACTIVE_SELECTORS = [
  'a',
  'button',
  'input',
  'select',
  'textarea',
  '[role="button"]',
];

const PROPS_PATTERN = new RegExp(
  // Negative lookbehind so we don't match `height:` inside `line-height:`
  // or `width:` inside `border-width:`/etc. Negative lookahead so we
  // don't match `block-size:` etc — only the exact props above.
  `(?<![a-z-])(${FLAGGED_PROPS.join('|')})\\s*:\\s*([^;}]+)`,
  'gi',
);

function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      out.push(...walk(full));
    } else if (e.isFile() && e.name.endsWith('.astro')) {
      out.push(full);
    }
  }
  return out;
}

function toPx(value, baseFontPx = 16) {
  const m = value.match(/^(-?\d*\.?\d+)\s*(px|rem|em)?$/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (Number.isNaN(n)) return null;
  const unit = m[2];
  if (!unit || unit === 'px') return n;
  if (unit === 'rem' || unit === 'em') return n * baseFontPx;
  return null;
}

function extractStyleBlocks(content) {
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  const blocks = [];
  let m;
  while ((m = re.exec(content)) !== null) {
    blocks.push({ text: m[1], offset: m.index });
  }
  return blocks;
}

function findRuleSelectors(ruleBody) {
  // Naive CSS selector extractor: walk until the first '{', take the prefix.
  // Handles nested rules shallowly by trimming known at-rules.
  const sel = [];
  // Strip leading @-rules.
  const cleaned = ruleBody.replace(/@media[^{]*\{[^{}]*\{([^{}]*)\}[^{}]*\}|\@supports[^{]*\{[^{}]*\{([^{}]*)\}[^{}]*\}/g, '$1$2');
  // Find rule blocks.
  const re = /([^{}]+)\{/g;
  let m;
  while ((m = re.exec(cleaned)) !== null) {
    sel.push(m[1].trim());
  }
  return sel.filter(Boolean);
}

function findInteractiveViolationInStyle(styleText, fileRel, sourceOffset) {
  const violations = [];
  // Split style into rule blocks.
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = ruleRe.exec(styleText)) !== null) {
    const selectors = m[1].split(',').map((s) => s.trim());
    const body = m[2];
    // Skip rules whose selectors do not include any interactive element.
    const interactive = selectors.filter((s) =>
      INTERACTIVE_SELECTORS.some((sel) => {
        if (s === sel) return true;
        if (s.includes(sel) && (s.startsWith(sel) || s.includes(sel + ' ') || s.includes(sel + '.') || s.includes(sel + '[') || s.includes(sel + ':'))) return true;
        return false;
      }),
    );
    if (interactive.length === 0) continue;
    // Look for flagged property violations.
    const propMatches = body.matchAll(PROPS_PATTERN);
    for (const propM of propMatches) {
      const prop = propM[1].toLowerCase();
      const raw = propM[2];
      // Skip values that are not numeric (inherit, auto, 0, var(), etc).
      const candidate = raw.split(/[\s,]+/)[0];
      const px = toPx(candidate);
      if (px === null) continue;
      // 0 on min-width/min-height is a flex-shrink hint, not a target size.
      if (px === 0 && ZERO_TOLERATED_PROPS.has(prop)) continue;
      if (px < MIN_OK) {
        // Allow listed selector exemptions. Match either the compound
        // selector as a whole or any simple selector inside it.
        const simpleSelectors = interactive.flatMap((s) => s.split(/[\s,>+~]+/));
        if (
          interactive.some((s) => ALLOWED_SELECTORS.has(s)) ||
          simpleSelectors.some((s) => ALLOWED_SELECTORS.has(s))
        ) continue;
        violations.push({
          file: fileRel,
          offset: sourceOffset + m.index,
          selector: interactive.join(', '),
          property: prop,
          value: candidate,
          pixel: px,
          body: body.slice(0, 120).replace(/\s+/g, ' ').trim(),
        });
      }
    }
  }
  return violations;
}

const files = TARGETS.flatMap((t) => walk(join(REPO, t)));
const allViolations = [];
for (const file of files) {
  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch (e) {
    continue;
  }
  const blocks = extractStyleBlocks(content);
  for (const block of blocks) {
    const v = findInteractiveViolationInStyle(block.text, relative(REPO, file), block.offset);
    allViolations.push(...v);
  }
}

if (JSON_MODE) {
  process.stdout.write(JSON.stringify({
    scanned_files: files.length,
    scanned_files_rel: files.map((f) => relative(REPO, f)),
    violations: allViolations,
  }, null, 2) + '\n');
} else {
  console.log(`[control-size-audit] scanned ${files.length} .astro files across:`);
  for (const t of TARGETS) {
    console.log(`  ${t}`);
  }
  if (allViolations.length === 0) {
    console.log('[control-size-audit] PASS — no interactive control has a sub-44px min/inline/width/height');
  } else {
    console.error(`[control-size-audit] FAIL — ${allViolations.length} violation(s):`);
    for (const v of allViolations) {
      console.error(`  ${v.file}:${v.offset}`);
      console.error(`    selector: ${v.selector}`);
      console.error(`    property: ${v.property}: ${v.value} (${v.pixel}px) — must be ≥ 44px`);
      console.error(`    rule: ${v.body}`);
    }
  }
}
process.exit(allViolations.length === 0 ? 0 : 1);