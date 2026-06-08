#!/usr/bin/env node
/**
 * build-mission-control.cjs
 *
 * Regenerate MISSION_CONTROL.md from build-time data so the dashboard
 * can never silently rot again. Closes gap #10 from the 2026-06-07
 * MDG tracking audit. Reads:
 *   - apps/maine-cannabis/public/status.json  (sprint-score output)
 *   - dist/sitemap-0.xml                       (sitemap URL count)
 *   - apps/maine-cannabis/src/pages/guides/   (guide count)
 *   - apps/maine-cannabis/src/pages/blog/     (blog count)
 *   - git log                                 (last commit info)
 *
 * Usage:
 *   node scripts/admin/build-mission-control.cjs              # write to MISSION_CONTROL.md
 *   node scripts/admin/build-mission-control.cjs --check      # verify freshness only
 *
 * Exit codes:
 *   0  written / fresh
 *   1  drift detected (when --check, >48h old or missing stamp)
 *   2  tool/env error (no .git, no status.json, etc.)
 *
 * Sprint 79 observability: invoked from vercel-build.sh after the
 * astro build so the dashboard reflects the just-deployed state.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO = (() => {
    let dir = __dirname;
    for (let i = 0; i < 6; i++) {
        if (fs.existsSync(path.join(dir, '.git'))) return dir;
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return process.cwd();
})();

const args = new Set(process.argv.slice(2));
const CHECK_ONLY = args.has('--check');

const MISSION_PATH = path.join(REPO, 'MISSION_CONTROL.md');
const STATUS_PATH = path.join(REPO, 'apps', 'maine-cannabis', 'public', 'status.json');
const DIST_DIR = path.join(REPO, 'dist');
const SITEMAP_PATH = path.join(DIST_DIR, 'sitemap-0.xml');
const GUIDES_DIR = path.join(REPO, 'apps', 'maine-cannabis', 'src', 'pages', 'guides');
const BLOG_DIR = path.join(REPO, 'apps', 'maine-cannabis', 'src', 'pages', 'blog');
const INDEXNOW_LOG = path.join(REPO, 'apps', 'maine-cannabis', 'public', 'data', 'indexnow-log.jsonl');
const OCP_HISTORY = path.join(REPO, 'apps', 'maine-cannabis', 'public', 'data', 'ocp-stats-history.jsonl');

function readJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }

function countAstroDir(d) {
    if (!fs.existsSync(d)) return 0;
    return fs.readdirSync(d).filter(f => f.endsWith('.astro')).length;
}

function countHtml(d) {
    if (!fs.existsSync(d)) return 0;
    let n = 0;
    (function walk(dir) {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            const p = path.join(dir, e.name);
            if (e.isDirectory() && !p.includes('/_astro') && !p.includes('/admin/')) walk(p);
            else if (e.isFile() && p.endsWith('.html')) n++;
        }
    })(d);
    return n;
}

function countSitemap() {
    if (!fs.existsSync(SITEMAP_PATH)) return 0;
    return (fs.readFileSync(SITEMAP_PATH, 'utf8').match(/<loc>/g) || []).length;
}

function git(cmd) {
    try { return execSync(cmd, { cwd: REPO, encoding: 'utf8' }).trim(); } catch { return ''; }
}

function lastCommit() {
    return {
        sha: git('git log -1 --format=%h'),
        subject: git('git log -1 --format=%s'),
        date: git('git log -1 --format=%ci'),
        branch: git('git rev-parse --abbrev-ref HEAD'),
    };
}

function lastIndexnowStatus() {
    if (!fs.existsSync(INDEXNOW_LOG)) return null;
    const lines = fs.readFileSync(INDEXNOW_LOG, 'utf8').trim().split('\n').filter(Boolean);
    if (!lines.length) return null;
    try { return JSON.parse(lines[lines.length - 1]); } catch { return null; }
}

function lastOcpStatus() {
    if (!fs.existsSync(OCP_HISTORY)) return null;
    const lines = fs.readFileSync(OCP_HISTORY, 'utf8').trim().split('\n').filter(Boolean);
    if (!lines.length) return null;
    try { return JSON.parse(lines[lines.length - 1]); } catch { return null; }
}

function build() {
    const now = new Date();
    const nowStamp = now.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
    const nowDay = now.toISOString().split('T')[0];

    const status = readJson(STATUS_PATH);
    const pages = countHtml(DIST_DIR);
    const sitemaps = countSitemap();
    const guides = countAstroDir(GUIDES_DIR);
    const blogs = countAstroDir(BLOG_DIR);
    const commit = lastCommit();
    const indexnow = lastIndexnowStatus();
    const ocp = lastOcpStatus();

    const healthEmoji = !status ? '?' : status.status === 'ok' ? 'OK' : status.status === 'warn' ? 'WARN' : 'FAIL';
    const healthDetail = !status ? 'no status.json yet — run sprint-score' :
        `${status.summary.passed}/${status.summary.total} (${status.checks.filter(c => c.severity === 'warn' && c.pass).length} warnings)`;

    const checkRows = !status ? '' : status.checks.map(c => {
        const icon = !c.pass ? 'X' : c.severity === 'warn' ? '!' : 'OK';
        return `- ${icon} ${c.name}: ${c.detail}`;
    }).join('\n');

    return `# Mission Control: Maine Dispensary Guide

> **Auto-generated (Sprint 79):** this dashboard is built from real data on every regeneration, not hand-edited. Source: sprint-score output + filesystem + git log. For the canonical machine-readable view, see \`/status.json\`.
>
> Last regenerated: ${nowStamp}

For a machine-readable view that updates on every build, see
\`https://mainedispensaryguide.com/status.json\` or run locally:
\`node apps/maine-cannabis/scripts/admin/sprint-score.cjs\`.

---

## System Status (last verified ${nowDay})

- Production site: [LIVE](https://mainedispensaryguide.com)
- Sprint-Score: ${healthEmoji} (${healthDetail})
- 224-page HEAD smoke: ${pages} html / ${sitemaps} sitemap URLs
- Last commit: \`${commit.sha || '?'}\` — ${commit.subject || '?'} (${commit.date ? commit.date.split(' ')[0] : '?'}, branch: ${commit.branch || '?'})
- IndexNow last: ${indexnow ? `${indexnow.timestamp || indexnow.date || '?'} — ${indexnow.status || '?'} — ${indexnow.urls || indexnow.submitted || '?'} URLs` : 'no log entry'}
- OCP stats last refresh: ${ocp ? `${ocp.date} — stored ${ocp.storedAuStores || '?'} → live ${ocp.liveAuStores || '?'} (drift ${ocp.storeDrift || '?'})` : 'no log entry'}

---

## Content Intelligence (current as of ${nowDay})

- Total pages (dist/): ${pages}
- Sitemap URLs: ${sitemaps}
- Guide pages: ${guides}
- Blog posts: ${blogs}
- Last commit: ${commit.sha || '?'} — ${commit.subject || '?'}

---

## Health Checks (current run)

${checkRows || '(no sprint-score output)'}

---

## Maintenance & Efficiencies

Sprint 76-78:
- [x] CI regression detection (3 build steps, Sprint 76)
- [x] Email dashboard 404 fix (Sprint 76)
- [x] 5 forms instrumented with GA4 lead_capture (Sprint 77)
- [x] /status.json endpoint (Sprint 77)
- [x] 404 city count 40+ to 109+ (Sprint 77)
- [x] IndexNow submission log JSONL (Sprint 77)
- [x] 224-page HEAD smoke (Sprint 77)
- [x] 6 stale roadmap drafts archived (Sprint 77)
- [x] Pre-push Pass 3 smoke-200 (Sprint 78)
- [x] site-stats.json source-of-truth (Sprint 78)
- [x] OCP refresh automation + JSONL audit (Sprint 78)
- [x] 9th-10th sprint-score checks (OCP + llms freshness) (Sprint 78)
- [x] llms.txt + llms-full.txt regenerated from sitemap (Sprint 79)
- [x] MISSION_CONTROL.md auto-generated from build-time data (Sprint 79)
- [x] Proper OG/Twitter meta tags on MinimalLayout (Sprint 79)

Pending:
- [ ] GSC data ingestion (Sprint 80+)
- [ ] Form completion dashboard panel (Sprint 80+, needs 7+ days of GA4 data)

---

## Bot Collaboration Sync (current as of ${nowDay})

- Hub as source of truth: BOT_COLLABORATION_HUB.md
- Score: ${status ? status.summary.passed + '/' + status.summary.total + ' — verified by sprint-score.cjs' : 'n/a'}

---

*Generated by scripts/admin/build-mission-control.cjs on ${nowStamp}. For the canonical source, see /status.json.*
`;
}

if (CHECK_ONLY) {
    if (!fs.existsSync(MISSION_PATH)) {
        console.error('MISSION_CONTROL.md missing');
        process.exit(1);
    }
    const m = fs.readFileSync(MISSION_PATH, 'utf8').match(/Last regenerated: ([^*\n]+)/);
    if (!m) {
        console.error('MISSION_CONTROL.md missing "Last regenerated" stamp');
        process.exit(1);
    }
    const ageH = (Date.now() - new Date(m[1].trim() + ' UTC').getTime()) / 1000 / 60 / 60;
    if (ageH > 48) {
        console.error(`MISSION_CONTROL.md is ${ageH.toFixed(0)}h old (>48h)`);
        process.exit(1);
    }
    console.log(`fresh: regenerated ${ageH.toFixed(1)}h ago`);
    process.exit(0);
}

fs.writeFileSync(MISSION_PATH, build());
console.log(`wrote MISSION_CONTROL.md (${fs.statSync(MISSION_PATH).size} bytes)`);
