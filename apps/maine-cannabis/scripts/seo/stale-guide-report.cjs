#!/usr/bin/env node
'use strict';
/**
 * apps/maine-cannabis/scripts/seo/stale-guide-report.cjs
 *
 * Read-only report that ranks MDG guide + blog pages by recency gap × GSC
 * impression volume. Uses a TWO-TIER freshness model:
 *
 *   - Time-sensitive pages (slug matches TIME_SENSITIVE_SLUG_PATTERNS, e.g.
 *     *-2026, *psilocybin*, *conditional-license*, *edibles-compliance*,
 *     *staffing-licensing*, *ld-1840*, *regulations*, *opt-in-tracker*,
 *     *license-denied*, *schedule-iii*, *280e*, *extraction-licensing*,
 *     *school-buffer*, *zoning-requirements*, *caregiver-trade-show*) use
 *     a 30-day threshold by default.
 *   - Evergreen pages use a 90-day threshold by default.
 *
 * Rationale: the original 90-day flat threshold came from WhiteSpark 2026
 * review-velocity data, which is about GBP *reviews*, not content recency.
 * Time-sensitive MDG pages (taxes, events, ld-1840, psilocybin) drift
 * visibly in 30-45 days and Google's query-dependent freshness score
 * penalises them sooner. Evergreen city guides tolerate 90+ days.
 *
 * Source for impressions: a GSC CSV exported via the OpenSEO MCP (see the
 * sibling runbook for the exact procedure). Source for modifiedDate: the
 * `const article = { ... modifiedDate: "YYYY-MM-DD" ... }` block in each
 * Astro page's frontmatter-style prelude.
 *
 * Integration task: t_e88b0645
 *
 * Usage:
 *   node stale-guide-report.cjs --help
 *   node stale-guide-report.cjs --gsc-csv ./gsc-last-28d.csv --json
 *   node stale-guide-report.cjs --gsc-csv ./gsc-last-28d.csv --md
 *   node stale-guide-report.cjs --gsc-csv ./gsc-last-28d.csv --limit 10 --md
 *   node stale-guide-report.cjs --threshold-mode time-sensitive --limit 20 --md
 *   node stale-guide-report.cjs --evergreen-days 120 --time-sensitive-days 45
 *
 * Exit codes:
 *   0 success
 *   2 usage / argument error
 *   1 file-not-found / parse error
 */

const fs = require('node:fs');
const path = require('node:path');

// ---- configuration ---------------------------------------------------------

const TODAY = '2026-07-21'; // operator-pinned; see runbook
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SOURCES = [
  { kind: 'guides', dir: path.join('apps', 'maine-cannabis', 'src', 'pages', 'guides') },
  { kind: 'blog',   dir: path.join('apps', 'maine-cannabis', 'src', 'pages', 'blog') },
];
const SKIP_FILENAMES = new Set([
  'index.astro',
  'all-cities.astro',
  'all-guides.astro',
]);
const MOD_DATE_RE = /modifiedDate\s*:\s*"(\d{4}-\d{2}-\d{2})"/;
const TITLE_RE = /<h1[^>]*>([\s\S]*?)<\/h1>/;
const SITE_HOSTS = [
  'https://mainedispensaryguide.com',
  'http://mainedispensaryguide.com',
];

// Two-tier threshold model (replaces the flat 90-day card-mandated threshold).
// Rationale lives in the runbook and the 2026-07-21 stale-guide baseline audit:
//   - "Time-sensitive" pages (year in slug, regulatory keywords, events) are
//     the AI-Overview / ChatGPT citation targets. They drift visibly in 30-45
//     days, and Google's query-dependent freshness score penalises them
//     sooner than evergreen guides.
//   - "Evergreen" pages (city guides, caregiver how-to, retail-flow guides)
//     tolerate 90+ days. WhiteSpark 2026 review-velocity data — which the
//     90-day threshold originally came from — applies to *reviews*, not
//     *content*, so the evergreen bar is set deliberately longer.
//
// Override at the command line with --evergreen-days / --time-sensitive-days.
const EVERGREEN_DAYS_DEFAULT = 90;
const TIME_SENSITIVE_DAYS_DEFAULT = 30;

// Substring match on the slug (lowercased) for the "time-sensitive" tier.
// Keep this list short and high-signal; an over-broad list will mark
// every guide as time-sensitive and erode the tier's signal.
const TIME_SENSITIVE_SLUG_PATTERNS = [
  /2026/,                              // year in title: "events-2026", "taxes-2026", etc.
  /psilocybin/,
  /conditional-license/,
  /staffing-licensing/,
  /edibles-compliance/,
  /ld-1840/,                           // explicit bill number
  /regulations/,
  /opt-in-tracker/,
  /license-denied/,
  /schedule-iii/,
  /280e/,
  /extraction-licensing/,
  /school-buffer/,
  /zoning-requirements/,
  /caregiver-trade-show/,
];

// ---- argv ------------------------------------------------------------------

function parseArgs(argv) {
  const out = {
    help: false, json: false, md: false, limit: null, gscCsv: './gsc-last-28d.csv',
    thresholdMode: 'both',
    evergreenDays: EVERGREEN_DAYS_DEFAULT,
    timeSensitiveDays: TIME_SENSITIVE_DAYS_DEFAULT,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--json') out.json = true;
    else if (a === '--md') out.md = true;
    else if (a === '--limit') {
      const v = argv[++i];
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1) throw new Error(`--limit must be a positive integer, got "${v}"`);
      out.limit = n;
    } else if (a === '--gsc-csv') {
      out.gscCsv = argv[++i];
      if (!out.gscCsv) throw new Error('--gsc-csv requires a path argument');
    } else if (a === '--today') {
      const v = argv[++i];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error(`--today must be YYYY-MM-DD, got "${v}"`);
      out.today = v;
    } else if (a === '--threshold-mode') {
      const v = argv[++i];
      if (!['evergreen', 'time-sensitive', 'both'].includes(v)) {
        throw new Error(`--threshold-mode must be one of evergreen|time-sensitive|both, got "${v}"`);
      }
      out.thresholdMode = v;
    } else if (a === '--evergreen-days') {
      const v = argv[++i];
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1) throw new Error(`--evergreen-days must be a positive integer, got "${v}"`);
      out.evergreenDays = n;
    } else if (a === '--time-sensitive-days') {
      const v = argv[++i];
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1) throw new Error(`--time-sensitive-days must be a positive integer, got "${v}"`);
      out.timeSensitiveDays = n;
    } else {
      throw new Error(`unknown argument: ${a}`);
    }
  }
  return out;
}

function printHelp() {
  process.stdout.write(`stale-guide-report.cjs — rank MDG guides by impressions × recency gap

USAGE
  node stale-guide-report.cjs [--gsc-csv <path>] [--json|--md] [--limit N] [--help]
                              [--threshold-mode <mode>] [--evergreen-days N]
                              [--time-sensitive-days N]

OPTIONS
  --gsc-csv <path>          Path to the GSC CSV export (default: ./gsc-last-28d.csv)
  --json                    Emit a JSON object (default if neither --json nor --md is set)
  --md                      Emit a markdown table
  --limit N                 Keep only the top N rows after filter+sort
  --threshold-mode <mode>   One of evergreen|time-sensitive|both (default: both)
  --evergreen-days N        Override the evergreen threshold (default: ${EVERGREEN_DAYS_DEFAULT})
  --time-sensitive-days N   Override the time-sensitive threshold (default: ${TIME_SENSITIVE_DAYS_DEFAULT})
  --today YYYY-MM-DD        Override the operator-pinned replay date (default: ${TODAY})
  --help                    Print this help and exit 0

FILTER
  Default: two-tier, no overlap.
    Time-sensitive pages  (slug matches TIME_SENSITIVE_SLUG_PATTERNS, e.g. *-2026, *psilocybin*,
                            *conditional-license*, *edibles-compliance*, *staffing-licensing*,
                            *ld-1840*, *regulations*, *opt-in-tracker*, *license-denied*,
                            *schedule-iii*, *280e*, *extraction-licensing*, *school-buffer*,
                            *zoning-requirements*, *caregiver-trade-show*):
      kept if impressions_28d > 50 AND days_since_modified > ${TIME_SENSITIVE_DAYS_DEFAULT}
    Evergreen pages  (everything else):
      kept if impressions_28d > 50 AND days_since_modified > ${EVERGREEN_DAYS_DEFAULT}

  --threshold-mode evergreen filters to evergreen pages only;
  --threshold-mode time-sensitive filters to time-sensitive pages only.

  Sort by impressions_28d descending within each tier.

EXIT CODES
  0  success
  1  file/parse error
  2  usage error
`);
}

// Classify a slug as "time-sensitive" or "evergreen" using the substring
// patterns above. Returns the tier name. Pattern list is intentionally
// short — false negatives (an actually-time-sensitive page misclassified as
// evergreen) are recoverable on the next operator review; false positives
// (an evergreen page marked time-sensitive) erode the tier's signal.
function classifyTier(slug) {
  const lower = slug.toLowerCase();
  for (const re of TIME_SENSITIVE_SLUG_PATTERNS) {
    if (re.test(lower)) return 'time-sensitive';
  }
  return 'evergreen';
}

// ---- helpers ---------------------------------------------------------------

function parseCsvLine(line) {
  // Minimal CSV parser: no embedded commas in any field per our schema.
  return line.split(',');
}

function loadGsc(csvPath) {
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 1) throw new Error(`empty GSC CSV: ${csvPath}`);
  const header = parseCsvLine(lines[0]);
  const expected = ['page', 'clicks', 'impressions', 'ctr', 'position'];
  for (let i = 0; i < expected.length; i += 1) {
    if (header[i] !== expected[i]) {
      throw new Error(`unexpected GSC CSV header at column ${i}: got "${header[i]}", expected "${expected[i]}"`);
    }
  }
  const out = new Map(); // guides/<route> or blog/<route> -> aggregated row
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 5) continue;
    const [page, clicks, impressions, ctr, position] = cols;
    const routeKey = pathToRouteKey(page);
    if (!routeKey) continue;
    const row = {
      page: canonicalPageUrl(page),
      clicks: Number(clicks),
      impressions: Number(impressions),
      ctr: Number(ctr),
      position: Number(position),
    };
    const prior = out.get(routeKey);
    if (!prior) {
      out.set(routeKey, row);
      continue;
    }

    // GSC can report slash and slash-less variants as separate page rows.
    // Aggregate them into the one local source route instead of silently
    // letting the last CSV row win.
    const clicksTotal = prior.clicks + row.clicks;
    const impressionsTotal = prior.impressions + row.impressions;
    out.set(routeKey, {
      page: prior.page,
      clicks: clicksTotal,
      impressions: impressionsTotal,
      ctr: impressionsTotal > 0 ? clicksTotal / impressionsTotal : 0,
      position: impressionsTotal > 0
        ? ((prior.position * prior.impressions) + (row.position * row.impressions)) / impressionsTotal
        : 0,
    });
  }
  return out;
}

// Map a GSC page URL to its local route key. Keeping the guides/blog prefix
// prevents a same-named guide and blog page from overwriting one another.
function pathToRouteKey(pageUrl) {
  if (!pageUrl) return null;
  for (const host of SITE_HOSTS) {
    if (!pageUrl.startsWith(`${host}/`)) continue;
    let tail = pageUrl.slice(`${host}/`.length);
    tail = stripTrailingSlash(tail);
    if (!tail.startsWith('guides/') && !tail.startsWith('blog/')) return null;
    return tail;
  }
  return null;
}

function canonicalPageUrl(pageUrl) {
  return pageUrl.endsWith('/') ? pageUrl.slice(0, -1) : pageUrl;
}

function stripTrailingSlash(s) {
  return s.endsWith('/') ? s.slice(0, -1) : s;
}

function walkPages(root, kind, out, sourceRoot = root) {
  if (!fs.existsSync(root)) return out;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === 'admin') continue;
      walkPages(path.join(root, entry.name), kind, out, sourceRoot);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.astro')) continue;
    if (SKIP_FILENAMES.has(entry.name)) continue;
    const full = path.join(root, entry.name);
    const slug = entry.name.replace(/\.astro$/, '');
    const relativeRoute = path.relative(sourceRoot, full).replace(/\\/g, '/').replace(/\.astro$/, '');
    out.push({ full, slug, kind, routeKey: `${kind}/${relativeRoute}` });
  }
  return out;
}

function readArticle(file) {
  const src = fs.readFileSync(file, 'utf8');
  const dateMatch = src.match(MOD_DATE_RE);
  if (!dateMatch) return { modifiedDate: null };
  const titleMatch = src.match(TITLE_RE);
  const title = titleMatch ? stripTags(titleMatch[1]).trim() : null;
  return { modifiedDate: dateMatch[1], title };
}

function stripTags(s) {
  return s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function daysBetween(fromYmd, toYmd) {
  const a = Date.parse(`${fromYmd}T00:00:00Z`);
  const b = Date.parse(`${toYmd}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86400000);
}

// ---- main ------------------------------------------------------------------

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`error: ${err.message}\n`);
    process.exit(2);
  }

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!args.json && !args.md) args.json = true;
  const today = args.today || TODAY;

  // Resolve GSC CSV (relative to cwd if not absolute)
  const csvPath = path.resolve(process.cwd(), args.gscCsv);
  if (!fs.existsSync(csvPath)) {
    process.stderr.write(`error: GSC CSV not found at ${csvPath}\n`);
    process.exit(1);
  }
  let gsc;
  try {
    gsc = loadGsc(csvPath);
  } catch (err) {
    process.stderr.write(`error: failed to parse ${csvPath}: ${err.message}\n`);
    process.exit(1);
  }

  // Walk pages
  const files = [];
  for (const src of SOURCES) {
    walkPages(path.resolve(REPO_ROOT, src.dir), src.kind, files);
  }

  // Build report rows
  const rows = [];
  let skippedNoDate = 0;
  let skippedNoGsc = 0;
  let skippedLowImp = 0;
  let skippedFresh = 0;
  let skippedTier = 0;
  for (const f of files) {
    const meta = readArticle(f.full);
    if (!meta.modifiedDate) {
      skippedNoDate += 1;
      continue;
    }
    const daysOld = daysBetween(meta.modifiedDate, today);
    if (daysOld === null) {
      skippedNoDate += 1;
      continue;
    }
    const tier = classifyTier(f.slug);
    if (args.thresholdMode !== 'both' && tier !== args.thresholdMode) {
      skippedTier += 1;
      continue;
    }
    const threshold = tier === 'time-sensitive' ? args.timeSensitiveDays : args.evergreenDays;
    if (daysOld <= threshold) {
      skippedFresh += 1;
      continue;
    }
    const g = gsc.get(f.routeKey);
    if (!g) {
      skippedNoGsc += 1;
      continue;
    }
    if (g.impressions <= 50) {
      skippedLowImp += 1;
      continue;
    }
    rows.push({
      slug: f.slug,
      kind: f.kind,
      tier,
      title: meta.title,
      modifiedDate: meta.modifiedDate,
      days_old: daysOld,
      threshold_days: threshold,
      url: g.page,
      clicks_28d: g.clicks,
      impressions_28d: g.impressions,
      ctr: g.ctr,
      position: g.position,
    });
  }

  rows.sort((a, b) => b.impressions_28d - a.impressions_28d);
  const limited = args.limit ? rows.slice(0, args.limit) : rows;

  const filter = {
    impressions_28d_min: 50,
    threshold_mode: args.thresholdMode,
    evergreen_days: args.evergreenDays,
    time_sensitive_days: args.timeSensitiveDays,
    today,
    sources: SOURCES.map((s) => s.dir),
    gsc_csv: path.relative(process.cwd(), csvPath),
  };

  if (args.md) {
    printMarkdown(limited, filter, {
      total: files.length,
      skippedNoDate,
      skippedNoGsc,
      skippedLowImp,
      skippedFresh,
      skippedTier,
    }, rows);
    return;
  }

  const payload = {
    generated_at: new Date().toISOString(),
    filter,
    counts: {
      total_pages_scanned: files.length,
      kept: rows.length,
      limited_to: args.limit || null,
      kept_by_tier: rows.reduce((acc, r) => {
        acc[r.tier] = (acc[r.tier] || 0) + 1;
        return acc;
      }, {}),
      skipped_missing_modifiedDate: skippedNoDate,
      skipped_tier_filter: skippedTier,
      skipped_missing_gsc_row: skippedNoGsc,
      skipped_low_impressions: skippedLowImp,
      skipped_fresh: skippedFresh,
    },
    pages: limited,
  };
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function printMarkdown(pages, filter, counts, allRows) {
  const lines = [];
  lines.push('# Stale-guide report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(
    `Filter: impressions_28d > ${filter.impressions_28d_min}, `
    + `threshold_mode=${filter.threshold_mode}, `
    + `evergreen_days=${filter.evergreen_days}, `
    + `time_sensitive_days=${filter.time_sensitive_days}, `
    + `today=${filter.today}`
  );
  lines.push(`GSC CSV: \`${filter.gsc_csv}\``);
  lines.push(`Sources: ${filter.sources.map((s) => '`' + s + '`').join(', ')}`);
  lines.push('');
  lines.push(
    `Pages scanned: ${counts.total}. `
    + `Kept: ${(allRows || pages).length} `
    + (allRows ? `(time-sensitive=${(allRows || pages).filter((p) => p.tier === 'time-sensitive').length}, `
      + `evergreen=${(allRows || pages).filter((p) => p.tier === 'evergreen').length}). `
      + `Limited to: ${pages.length}. ` : '')
    + `Skipped: ${counts.skippedNoDate} missing modifiedDate, ${counts.skippedTier} tier-filtered, `
    + `${counts.skippedNoGsc} no GSC row, ${counts.skippedLowImp} low impressions, `
    + `${counts.skippedFresh} fresh.`
  );
  lines.push('');
  if ((allRows || pages).length === 0) {
    lines.push('No pages match the current filter.');
    lines.push('');
    process.stdout.write(`${lines.join('\n')}\n`);
    return;
  }
  // Group by tier for readability when --threshold-mode is "both".
  const groups = new Map();
  for (const p of pages) {
    if (!groups.has(p.tier)) groups.set(p.tier, []);
    groups.get(p.tier).push(p);
  }
  const tierOrder = ['time-sensitive', 'evergreen'];
  for (const tier of tierOrder) {
    const rows = groups.get(tier);
    if (!rows || rows.length === 0) continue;
    const threshold = tier === 'time-sensitive' ? filter.time_sensitive_days : filter.evergreen_days;
    lines.push(`## ${tier} (threshold: > ${threshold} days, ${rows.length} page${rows.length === 1 ? '' : 's'})`);
    lines.push('');
    lines.push('| Page | Modified | Days old | Impressions (28d) | Position | CTR |');
    lines.push('|---|---|---:|---:|---:|---:|');
    for (const p of rows) {
      const title = p.title ? p.title.replace(/\|/g, '\\|') : p.slug;
      lines.push(`| [${p.slug}](${p.url}) — ${title} | ${p.modifiedDate} | ${p.days_old} | ${p.impressions_28d} | ${p.position.toFixed(1)} | ${(p.ctr * 100).toFixed(2)}% |`);
    }
    lines.push('');
  }
  process.stdout.write(`${lines.join('\n')}\n`);
}

// Only run main when executed directly (not when require'd for tests).
if (require.main === module) {
  try {
    main();
  } catch (err) {
    process.stderr.write(`error: ${err && err.message ? err.message : err}\n`);
    process.exit(1);
  }
}

module.exports = { parseArgs, loadGsc, walkPages, readArticle, daysBetween, pathToRouteKey, classifyTier };
