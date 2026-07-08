#!/usr/bin/env node
/**
 * admin/sprint-score.cjs
 *
 * Derives a single "is the site still healthy?" snapshot from real data,
 * not from the Hub's hand-edited "100/100" claim. Compares:
 *   - dist/ page count, broken-link count, sitemap size
 *   - content-health baseline (current vs stored)
 *   - git working tree state (uncommitted files = potential risk)
 *   - Hub header claim vs reality
 *
 * Output: a structured JSON (or pretty text) report. CI-friendly exit codes:
 *   0 = healthy
 *   1 = at least one check failed
 *   2 = warning (degraded but not failed)
 *
 * Sprint 77 observability: closes gap #6 from the 2026-06-07 MDG tracking
 * audit. The Hub's hand-edited "100/100" claim could drift from reality
 * (Sprint 75 had a broken build while the Hub still said 100/100). This
 * script gives a machine-checkable view that any agent or CI run can use
 * to detect drift.
 *
 * Usage:
 *   node scripts/admin/sprint-score.cjs           # text report
 *   node scripts/admin/sprint-score.cjs --json   # machine-readable
 *   node scripts/admin/sprint-score.cjs --strict # exit 1 on any warning
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

// scripts/admin → scripts/ → apps/maine-cannabis/ → repo root
const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const DIST = path.join(REPO, 'dist');
const SITEMAP = path.join(DIST, 'sitemap-0.xml');
const SITEMAP_INDEX = path.join(DIST, 'sitemap-index.xml');
const HUB = path.join(REPO, 'BOT_COLLABORATION_HUB.md');
const BASELINE = path.join(
  REPO,
  'apps',
  'maine-cannabis',
  'scripts',
  'content',
  '.content-health-baseline.json',
);
// scripts/admin → apps/maine-cannabis → public
const PUBLIC_DIR = path.join(REPO, 'apps', 'maine-cannabis', 'public');

const args = new Set(process.argv.slice(2));
const JSON_OUT = args.has('--json');
const STRICT = args.has('--strict');
const WRITE_PUBLIC = args.has('--write-public');
// When invoked from vercel-build.sh, write a public/status.json that ends up
// served at https://mainedispensaryguide.com/status.json so external uptime
// monitors / cron / scripts can hit a machine-readable health endpoint.
const PUBLIC_STATUS = path.join(REPO, 'apps', 'maine-cannabis', 'public', 'status.json');

function tryExec(cmd, cwd = REPO) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
}

function exists(p) {
  try { return fs.statSync(p).isFile(); } catch { return false; }
}

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return null; }
}

function countHtmlPages() {
  if (!fs.existsSync(DIST)) return 0;
  // Count every *.html file under dist/, minus /_astro/ and /admin/.
  // (We DO count /404.html — it's a real page MDG serves.)
  let n = 0;
  function walk(d) {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (p.includes('/_astro') || p.includes('/admin/')) continue;
        walk(p);
      } else if (e.isFile() && p.endsWith('.html')) {
        n++;
      }
    }
  }
  walk(DIST);
  return n;
}

function countSitemapUrls() {
  if (!exists(SITEMAP)) return 0;
  const xml = fs.readFileSync(SITEMAP, 'utf-8');
  return (xml.match(/<loc>/g) || []).length;
}

function hubHeaderClaim() {
  if (!exists(HUB)) return { found: false, raw: '' };
  const txt = fs.readFileSync(HUB, 'utf-8');
  // First 5 lines contain the score.
  const m = txt.slice(0, 4000).match(/Current Score:\s*(\d+)\/(\d+)\s*\(([A-F])\)/i);
  return m ? { found: true, score: +m[1], max: +m[2], grade: m[3] } : { found: false, raw: '' };
}

function lastUpdatedFromHub() {
  if (!exists(HUB)) return null;
  const txt = fs.readFileSync(HUB, 'utf-8');
  const m = txt.slice(0, 4000).match(/\*\*Last updated:\s*([^*]+?)\*\*/);
  return m ? m[1].trim() : null;
}

function contentHealthDelta() {
  if (!exists(BASELINE)) return { hasBaseline: false };
  const baseline = readJson(BASELINE);
  // Run check-content-health.cjs directly (not the regression wrapper) so we
  // get the same ❌  N issue(s) lines on the current state whether it matches
  // baseline or not.
  const checkScript = path.join(
    REPO, 'scripts', 'check', 'content-health.cjs',
  );
  let out = '';
  try {
    out = execSync(`node ${JSON.stringify(checkScript)}`, {
      encoding: 'utf-8', cwd: REPO, maxBuffer: 10 * 1024 * 1024,
    });
  } catch (e) {
    // check-content-health exits 1 when there are failures — that's expected,
    // we still want its stdout.
    out = (e.stdout || '') + (e.stderr || '');
  }
  const failures = {};
  for (const line of out.split(/\r?\n/)) {
    const m = line.match(/❌\s+(.+?):\s+(\d+)\s+issue/);
    if (m) failures[m[1].trim()] = +m[2];
  }
  const regressions = [];
  for (const [k, v] of Object.entries(failures)) {
    const b = baseline[k] || 0;
    if (v > b) regressions.push({ check: k, baseline: b, current: v, delta: v - b });
  }
  return {
    hasBaseline: true,
    baselineTotal: Object.values(baseline).reduce((a, b) => a + b, 0),
    currentTotal: Object.values(failures).reduce((a, b) => a + b, 0),
    failures,
    regressions,
  };
}

function gitState() {
  return {
    lastCommit: tryExec(`git -C ${JSON.stringify(REPO)} log -1 --format=%h`),
    uncommittedCount: parseInt(tryExec('git status --porcelain | wc -l') || '0', 10),
    branch: tryExec('git rev-parse --abbrev-ref HEAD'),
  };
}

function checkBrokenAssetRefs() {
  // Scan all /images/* references in dist/ HTML and verify each one resolves
  // to a file in public/images/. Reports 0 if public/images/ is missing.
  if (!fs.existsSync(DIST)) return { checked: 0, broken: 0, samples: [] };
  const imagesRoot = path.join(PUBLIC_DIR, 'images');
  if (!fs.existsSync(imagesRoot)) return { checked: 0, broken: 0, samples: [] };

  // Build a { subdir → Set<basename> } map so we can check each /images/<sub>/<file>
  // against the right directory.
  const subdirMap = {};
  for (const sub of fs.readdirSync(imagesRoot)) {
    const p = path.join(imagesRoot, sub);
    if (!fs.statSync(p).isDirectory()) continue;
    subdirMap[sub] = new Set(fs.readdirSync(p));
  }
  // Root /images/foo.png (rare) also possible.
  subdirMap[''] = new Set(
    fs.readdirSync(imagesRoot).filter(n => fs.statSync(path.join(imagesRoot, n)).isFile()),
  );

  // Only match refs that start with /images/ (i.e. an actual asset URL), and
  // only those that have a real filename extension at the end. This filters
  // out prose mentions like "public/images/heroes/" inside an HTML <code> block.
  const refRe = /(?<![/A-Za-z])\/images\/([^"'<>\s?#]+)\.(jpe?g|png|webp|avif|svg|gif)/gi;
  let checked = 0, broken = 0;
  const brokenSamples = [];
  function walk(d) {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (p.includes('/_astro')) continue;
        walk(p);
      } else if (e.isFile() && p.endsWith('.html')) {
        const html = fs.readFileSync(p, 'utf-8');
        for (const m of html.matchAll(refRe)) {
          checked++;
          // The regex includes the extension inside the captured group via
          // capture-backref; rebuild the full path here.
          const fullRef = `/images/${m[1]}.${m[2].toLowerCase()}`;
          const parts = fullRef.replace(/^\//, '').split('/');
          const sub = parts.length > 2 ? parts[1] : ''; // ['images', '<sub>', 'file.ext']
          const file = parts[parts.length - 1];
          const set = subdirMap[sub];
          if (!set || !set.has(file)) {
            broken++;
            if (brokenSamples.length < 5) {
              brokenSamples.push({ in: p.replace(DIST + '/', ''), ref: fullRef });
            }
          }
        }
      }
    }
  }
  walk(DIST);
  return { checked, broken, samples: brokenSamples };
}

function siteStatsFreshness() {
    // Sprint 78: ensure site-stats.json is refreshed against OCP data regularly.
    // Warns if currentOcpLicenseeRoster.asOf is older than 90 days, which
    // means refresh-site-stats.cjs hasn't been run in a quarter. Drift beyond
    // that window is a hard fail.
    const p = path.join(REPO, 'apps', 'maine-cannabis', 'src', 'data', 'site-stats.json');
    if (!fs.existsSync(p)) {
        return { exists: false, ageDays: null, asOf: null };
    }
    let parsed;
    try { parsed = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return { exists: true, parseError: true }; }
    const roster = parsed.currentOcpLicenseeRoster;
    if (!roster?.asOf) {
        return { exists: true, hasRoster: false };
    }
    const asOf = new Date(roster.asOf);
    const ageDays = Math.floor((Date.now() - asOf.getTime()) / (1000 * 60 * 60 * 24));
    return { exists: true, hasRoster: true, ageDays, asOf: roster.asOf, auRetailStores: roster.auRetailStores };
}

function llmsFreshness() {
    // Sprint 79: ensure llms.txt URL count matches sitemap-0.xml. Catches the
    // case where new guides were added to the sitemap but llms.txt wasn't
    // regenerated, so AI crawlers see a stale index.
    const llmsPath = path.join(REPO, 'apps', 'maine-cannabis', 'public', 'llms.txt');
    const sitemapPath = path.join(REPO, 'apps', 'maine-cannabis', 'dist', 'sitemap-0.xml');
    if (!fs.existsSync(llmsPath)) {
        return { exists: false };
    }
    let content;
    try { content = fs.readFileSync(llmsPath, 'utf8'); } catch { return { exists: true, parseError: true }; }
    const m = content.match(/Last regenerated: (\d{4}-\d{2}-\d{2}) from (\d+) sitemap URLs/);
    if (!m) {
        return { exists: true, hasStamp: false };
    }
    const lastRegen = m[1];
    const storedUrlCount = parseInt(m[2], 10);
    const ageDays = Math.floor((Date.now() - new Date(lastRegen).getTime()) / (1000 * 60 * 60 * 24));
    let liveUrlCount = null;
    if (fs.existsSync(sitemapPath)) {
        const sitemap = fs.readFileSync(sitemapPath, 'utf8');
        liveUrlCount = (sitemap.match(/<loc>/g) || []).length;
    }
    return { exists: true, hasStamp: true, lastRegen, ageDays, storedUrlCount, liveUrlCount };
}

function dataIntegrityCheck() {
    // Sprint 80 (post-parallel-race audit): cross-reference filesystem stats
    // against the docs that claim to reflect them. Catches the
    // "AGENTS.md says 47 guides, reality is 157" failure mode before the
    // doc goes another sprint. Runs scripts/admin/data-integrity-check.cjs.
    const script = path.join(REPO, 'scripts', 'admin', 'data-integrity-check.cjs');
    if (!fs.existsSync(script)) {
        return { pass: true, detail: 'data-integrity-check.cjs not present (skipped)', severity: 'ok' };
    }
    try {
        const out = execSync(`node "${script}" --check`, { cwd: REPO, encoding: 'utf8' });
        const driftMatch = out.match(/DRIFT[\s\S]+?\n([\s\S]+?)(?:\n\n|\nWARNINGS|$)/);
        const warnMatch = out.match(/WARNINGS[\s\S]+?\n\n([\s\S]+?)(?:\n\n|$)/);
        const driftCount = driftMatch ? (driftMatch[1].match(/❌/g) || []).length : 0;
        const warnCount = warnMatch ? (warnMatch[1].match(/⚠️/g) || []).length : 0;
        return {
            pass: driftCount === 0,
            detail: driftCount > 0
                ? `${driftCount} doc drift(s) — run data-integrity-check.cjs to see claims vs reality`
                : (warnCount > 0 ? `${warnCount} stale-doc warning(s) (non-fatal)` : 'all docs match reality'),
            driftCount,
            warnCount,
            severity: driftCount > 0 ? 'high' : (warnCount > 0 ? 'warn' : 'ok'),
        };
    } catch (e) {
        return { pass: false, detail: `data-integrity-check.cjs failed: ${e.message.slice(0, 200)}`, severity: 'high' };
    }
}

function main() {
  const pages = countHtmlPages();
  const sitemapUrls = countSitemapUrls();
  const claim = hubHeaderClaim();
  const lastUpdated = lastUpdatedFromHub();
  const ch = contentHealthDelta();
  const git = gitState();
  const assets = checkBrokenAssetRefs();
  const statsFresh = siteStatsFreshness();
  const llmsFresh = llmsFreshness();
  const integrity = dataIntegrityCheck();

  const checks = [];
  // 1. Build output present
  checks.push({
    name: 'dist/ exists',
    pass: fs.existsSync(DIST),
    detail: fs.existsSync(DIST) ? `${pages} html pages` : 'no dist/ — run npm run build',
  });
  // 2. Sitemap present
  checks.push({
    name: 'sitemap-0.xml present',
    pass: exists(SITEMAP) && exists(SITEMAP_INDEX),
    detail: exists(SITEMAP) ? `${sitemapUrls} URLs` : 'missing',
  });
  // 3. Sitemap URL count within ±2 of HTML page count
  const sitemapVsHtml = Math.abs(sitemapUrls - pages);
  checks.push({
    name: 'sitemap ↔ html page count',
    pass: sitemapVsHtml <= 5,
    detail: `sitemap=${sitemapUrls} html=${pages} delta=${sitemapVsHtml}`,
  });
  // 4. Content-health baseline exists
  checks.push({
    name: 'content-health baseline present',
    pass: ch.hasBaseline,
    detail: ch.hasBaseline
      ? `baseline=${ch.baselineTotal} current=${ch.currentTotal}`
      : 'no baseline file',
  });
  // 5. No regressions
  checks.push({
    name: 'no content-health regressions',
    pass: !ch.regressions || ch.regressions.length === 0,
    detail: ch.regressions?.length
      ? ch.regressions.map(r => `${r.check} +${r.delta}`).join(', ')
      : 'no regressions',
  });
  // 6. Broken image refs (warn threshold)
  checks.push({
    name: 'broken image refs',
    pass: assets.broken === 0,
    detail: assets.broken === 0
      ? `${assets.checked} refs checked, 0 broken`
      : `${assets.broken} of ${assets.checked} refs broken`,
    severity: assets.broken > 50 ? 'fail' : assets.broken > 0 ? 'warn' : 'ok',
  });
  // 7. Git tree reasonably clean
  checks.push({
    name: 'git working tree',
    pass: git.uncommittedCount < 50,
    detail: `${git.uncommittedCount} uncommitted files (branch: ${git.branch})`,
    severity: git.uncommittedCount > 100 ? 'fail' : git.uncommittedCount > 20 ? 'warn' : 'ok',
  });
  // 8. Hub claim consistency
  let hubConsistent = true;
  let hubDetail = `${claim.score || '?'}/${claim.max || '?'} (${claim.grade || '?'})`;
  if (claim.found && claim.score < 100) hubConsistent = false;
  // If we have regressions OR broken image refs, hub claim is suspect
  if (ch.regressions?.length || assets.broken > 0) hubConsistent = false;
  checks.push({
    name: 'Hub header claim matches reality',
    pass: hubConsistent,
    detail: hubDetail + (hubConsistent ? '' : ' (mismatch: regressions or broken refs present)'),
  });
  // 9. OCP stats roster freshness (Sprint 78: OCP refresh tracking)
  let statsPass = true;
  let statsDetail = 'missing site-stats.json';
  let statsSeverity = 'warn';
  if (statsFresh.exists && !statsFresh.parseError) {
      if (!statsFresh.hasRoster) {
          statsDetail = 'no currentOcpLicenseeRoster in site-stats.json';
          statsSeverity = 'warn';
      } else if (statsFresh.ageDays > 90) {
          statsPass = false;
          statsDetail = `roster is ${statsFresh.ageDays} days old (as of ${statsFresh.asOf}) — run scripts/ocp/refresh-site-stats.cjs`;
          statsSeverity = 'fail';
      } else if (statsFresh.ageDays > 30) {
          statsDetail = `roster is ${statsFresh.ageDays} days old (as of ${statsFresh.asOf}, ${statsFresh.auRetailStores} stores) — consider refreshing`;
          statsSeverity = 'warn';
      } else {
          statsDetail = `roster is ${statsFresh.ageDays} days old (as of ${statsFresh.asOf}, ${statsFresh.auRetailStores} stores)`;
          statsSeverity = 'ok';
      }
  }
  checks.push({
      name: 'OCP stats roster freshness',
      pass: statsPass,
      detail: statsDetail,
      severity: statsSeverity,
  });
  // 10. llms.txt freshness (Sprint 79: AI-corpus index drift detection)
  let llmsPass = true;
  let llmsDetail = 'missing llms.txt';
  let llmsSeverity = 'warn';
  if (llmsFresh.exists && !llmsFresh.parseError) {
      if (!llmsFresh.hasStamp) {
          llmsDetail = 'no "Last regenerated" stamp — run scripts/admin/regenerate-llms.cjs';
          llmsSeverity = 'warn';
      } else if (llmsFresh.liveUrlCount !== null && llmsFresh.storedUrlCount !== llmsFresh.liveUrlCount) {
          llmsPass = false;
          llmsDetail = `stored ${llmsFresh.storedUrlCount} URLs, sitemap has ${llmsFresh.liveUrlCount} — re-run regenerate-llms.cjs`;
          llmsSeverity = 'fail';
      } else if (llmsFresh.ageDays > 14) {
          llmsDetail = `${llmsFresh.storedUrlCount} URLs as of ${llmsFresh.lastRegen} (${llmsFresh.ageDays} days ago) — consider regenerating`;
          llmsSeverity = 'warn';
      } else {
          llmsDetail = `${llmsFresh.storedUrlCount} URLs as of ${llmsFresh.lastRegen}`;
          llmsSeverity = 'ok';
      }
  }
  checks.push({
    name: 'llms.txt freshness',
    pass: llmsPass,
    detail: llmsDetail,
    severity: llmsSeverity,
  });
  // 11. Data integrity (Sprint 80: AGENTS.md vs reality)
  checks.push({
    name: 'Data integrity (docs match filesystem)',
    pass: integrity.pass,
    detail: integrity.detail,
    severity: integrity.severity,
  });

  const failed = checks.filter(c => !c.pass).length;
  const warnings = checks.filter(c => c.severity === 'warn' && c.pass).length;
  const status = failed > 0 ? 'fail' : warnings > 0 ? 'warn' : 'ok';

  const report = {
    generated: new Date().toISOString(),
    status,
    pages: { htmlCount: pages, sitemapUrlCount: sitemapUrls },
    contentHealth: ch,
    assets,
    git,
    hub: { lastUpdated, claim },
    checks,
    summary: {
      total: checks.length,
      passed: checks.length - failed,
      failed,
      warnings,
    },
  };

  if (JSON_OUT) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    console.log(`🛰️  MDG sprint-score (${report.generated})`);
    console.log(`    status: ${status}`);
    console.log(`    pages: ${pages} html / ${sitemapUrls} sitemap URLs`);
    console.log(`    content-health: baseline=${ch.baselineTotal} current=${ch.currentTotal}${ch.regressions?.length ? ' REGRESSIONS' : ''}`);
    console.log(`    assets: ${assets.broken} broken of ${assets.checked} refs`);
    console.log(`    git: ${git.uncommittedCount} uncommitted on ${git.branch}`);
    console.log(`    hub: ${lastUpdated} | claim: ${hubDetail}`);
    console.log('');
    for (const c of checks) {
      const icon = !c.pass ? '❌' : c.severity === 'warn' ? '⚠️ ' : '✅';
      console.log(`  ${icon} ${c.name}: ${c.detail}`);
    }
    console.log('');
    console.log(`  ${report.summary.passed}/${report.summary.total} checks passed (${report.summary.failed} failed, ${report.summary.warnings} warnings)`);
  }

  if (failed > 0) process.exit(1);
  if (STRICT && warnings > 0) process.exit(1);

  // Optional: write a public/status.json snapshot. The Astro build copies
  // apps/maine-cannabis/public/ into dist/ verbatim, so /status.json will
  // then serve this snapshot on the live site.
  if (WRITE_PUBLIC) {
    try {
      fs.mkdirSync(path.dirname(PUBLIC_STATUS), { recursive: true });
      fs.writeFileSync(PUBLIC_STATUS, JSON.stringify(report, null, 2) + '\n');
      console.error(`📝 Wrote ${path.relative(REPO, PUBLIC_STATUS)}`);
    } catch (e) {
      console.error(`⚠️  Failed to write public/status.json: ${e.message}`);
    }
  }
  process.exit(0);
}

main();
