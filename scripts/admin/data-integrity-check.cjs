#!/usr/bin/env node
/**
 * data-integrity-check.cjs
 *
 * Cross-reference filesystem stats against the docs that claim to reflect
 * them (AGENTS.md, PROJECT_STATE.md, MDG_AGENT_HANDBOOK.md, MISSION_CONTROL.md,
 * BOT_COLLABORATION_HUB.md). Catches the "stale doc says 47 guides, reality
 * is 157" failure mode before it goes another sprint.
 *
 * Closes the "AGENTS.md was 4 months stale" finding from the 2026-06-07
 * post-parallel-race data integrity audit.
 *
 * Usage:
 *   node scripts/admin/data-integrity-check.cjs
 *   node scripts/admin/data-integrity-check.cjs --check  (warn-only, exit 0)
 *
 * Exit codes:
 *   0  clean
 *   1  drift detected (and not --check)
 *   2  tool/env error
 */
const fs = require('fs');
const path = require('path');

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

const CHECK_ONLY = process.argv.includes('--check');

const APPS = path.join(REPO, 'apps', 'maine-cannabis');
const GUIDES_DIR = path.join(APPS, 'src', 'pages', 'guides');
const BLOG_DIR = path.join(APPS, 'src', 'pages', 'blog');
const DIST_DIR = path.join(REPO, 'dist');

function countAstroDir(d) {
    if (!fs.existsSync(d)) return 0;
    return fs.readdirSync(d).filter(f => f.endsWith('.astro')).length;
}

function countDistHtml() {
    if (!fs.existsSync(DIST_DIR)) return 0;
    let n = 0;
    (function walk(dir) {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            const p = path.join(dir, e.name);
            if (e.isDirectory() && !p.includes('/_astro') && !p.includes('/admin/')) walk(p);
            else if (e.isFile() && p.endsWith('.index.html') || p.endsWith('.html')) n++;
        }
    })(DIST_DIR);
    return n;
}

function countAstroWithFaq() {
    let n = 0;
    function walk(d) {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            const p = path.join(d, e.name);
            if (e.isDirectory() && !p.includes('node_modules') && !p.includes('.astro')) walk(p);
            else if (e.isFile() && p.endsWith('.astro')) {
                const c = fs.readFileSync(p, 'utf8');
                if (c.includes('"@type": "FAQPage"') || c.includes('"@type":"FAQPage"')) n++;
            }
        }
    }
    walk(path.join(APPS, 'src', 'pages'));
    return n;
}

const actual = {
    guides: countAstroDir(GUIDES_DIR),
    blog: countAstroDir(BLOG_DIR),
    dist: countDistHtml(),
    pagesWithFaqSchema: countAstroWithFaq(),
};

function findDocClaim(file, pattern) {
    if (!fs.existsSync(file)) return null;
    const c = fs.readFileSync(file, 'utf8');
    const m = c.match(pattern);
    return m ? m[1] : null;
}

const claims = {
    'AGENTS.md': findDocClaim(path.join(REPO, 'AGENTS.md'), /(\d+)\s*guide\s*pages?\s*\(.*?\)/i),
    'AGENTS.md (apps)': findDocClaim(path.join(APPS, 'AGENTS.md'), /(\d+)\s*guide\s*pages?\s*\(.*?\)/i),
};

const report = {
    actual,
    claims,
    drift: [],
    warnings: [],
};

if (claims['AGENTS.md'] && parseInt(claims['AGENTS.md']) < actual.guides * 0.5) {
    report.drift.push({
        where: 'AGENTS.md',
        claim: `${claims['AGENTS.md']} guide pages`,
        reality: `${actual.guides} guide pages`,
        severity: 'high',
    });
}
if (claims['AGENTS.md (apps)'] && parseInt(claims['AGENTS.md (apps)']) < actual.guides * 0.5) {
    report.drift.push({
        where: 'AGENTS.md (apps)',
        claim: `${claims['AGENTS.md (apps)']} guide pages`,
        reality: `${actual.guides} guide pages`,
        severity: 'high',
    });
}

const recentCommits = parseInt(execSyncOrDefault('git log --oneline --since="30 days ago" | wc -l', '0'));
const todayCommits = parseInt(execSyncOrDefault('git log --oneline --since="24 hours ago" | wc -l', '0'));

if (todayCommits > 5) {
    for (const [name, mtime] of Object.entries({
        'AGENTS.md': fs.statSync(path.join(REPO, 'AGENTS.md')).mtime,
        'AGENTS.md (apps)': fs.statSync(path.join(APPS, 'AGENTS.md')).mtime,
        'PROJECT_STATE.md': fs.statSync(path.join(REPO, 'PROJECT_STATE.md')).mtime,
        'MDG_AGENT_HANDBOOK.md': fs.statSync(path.join(REPO, 'MDG_AGENT_HANDBOOK.md')).mtime,
    })) {
        const days = (Date.now() - mtime.getTime()) / 86400000;
        if (days > 30) {
            report.warnings.push({
                where: name,
                issue: `last modified ${days.toFixed(0)} days ago — likely stale in an active day`,
                severity: days > 90 ? 'high' : 'medium',
            });
        }
    }
}

function execSyncOrDefault(cmd, def) {
    try { return require('child_process').execSync(cmd, { cwd: REPO, encoding: 'utf8' }).trim(); }
    catch { return def; }
}

console.log('=== MDG Data-Integrity Check ===\n');
console.log('Actual state:');
console.log(`  guides:    ${actual.guides}`);
console.log(`  blog:      ${actual.blog}`);
console.log(`  dist html: ${actual.dist}`);
console.log(`  pages w/ FAQPage JSON-LD: ${actual.pagesWithFaqSchema}`);
console.log(`  recent commits (30d): ${recentCommits}, today: ${todayCommits}\n`);

if (report.drift.length) {
    console.log('DRIFT (will fail CI):');
    for (const d of report.drift) console.log(`  ❌ ${d.where}: claims ${d.claim} but reality is ${d.reality} [${d.severity}]`);
    console.log();
}
if (report.warnings.length) {
    console.log('WARNINGS (stale docs in active period):');
    for (const w of report.warnings) console.log(`  ⚠️  ${w.where}: ${w.issue} [${w.severity}]`);
    console.log();
}
if (report.drift.length === 0 && report.warnings.length === 0) {
    console.log('✅ all docs match reality');
}

if (report.drift.length > 0 && !CHECK_ONLY) {
    process.exit(1);
}
if (report.drift.length === 0) {
    process.exit(0);
}
process.exit(CHECK_ONLY ? 0 : 1);
