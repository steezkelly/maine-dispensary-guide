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
 * Sprint 80 audit extension: now also checks blog count and components
 * count drift in both AGENTS.md files (root + apps/). The Sprint 80
 * audit found AGENTS.md claimed "9 reusable components" / "Blog posts
 * (6 articles)" while reality was 10 components / 35 blog posts —
 * this script would have caught it before merge.
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
const COMPONENTS_DIR = path.join(APPS, 'src', 'components');
const DIST_DIR = path.join(REPO, 'dist');

function countAstroDir(d) {
    if (!fs.existsSync(d)) return 0;
    return fs.readdirSync(d).filter(f => f.endsWith('.astro')).length;
}

function countComponents() {
    if (!fs.existsSync(COMPONENTS_DIR)) return 0;
    return fs.readdirSync(COMPONENTS_DIR).filter(f => f.endsWith('.astro')).length;
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
    components: countComponents(),
    dist: countDistHtml(),
    pagesWithFaqSchema: countAstroWithFaq(),
};

function findDocClaim(file, pattern) {
    if (!fs.existsSync(file)) return null;
    const c = fs.readFileSync(file, 'utf8');
    const m = c.match(pattern);
    return m ? m[1] : null;
}

// Claim extractors — return { root, apps } objects with the count claimed
// in each file (or null if not found). Used to verify the docs match
// filesystem reality.
function extractBlogCount(file) {
    if (!fs.existsSync(file)) return null;
    const c = fs.readFileSync(file, 'utf8');
    // matches: "35 blog posts" or "Blog posts (6 articles)" or "# 35 blog posts"
    // in the project-structure tree, or "157 guide pages ..., 35 blog posts, ..."
    // in the overview line. Returns the FIRST blog count it finds.
    // Also matches the old "Blog posts (N articles)" form so drift in the
    // legacy format is still caught.
    const m = c.match(/(\d+)\s*blog\s*posts?/i)
           || c.match(/Blog\s*posts\s*\((\d+)\s*articles?\)/i);
    return m ? parseInt(m[1]) : null;
}

function extractComponentsCount(file) {
    if (!fs.existsSync(file)) return null;
    const c = fs.readFileSync(file, 'utf8');
    // matches: "10 reusable components" or "9 reusable components"
    const m = c.match(/(\d+)\s*reusable\s*components?/i);
    return m ? parseInt(m[1]) : null;
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

// Blog count drift: catches "Blog posts (6 articles)" / "35 blog posts"
// claims diverging from actual blog/ directory count.
const blogClaims = {
    'AGENTS.md': extractBlogCount(path.join(REPO, 'AGENTS.md')),
    'AGENTS.md (apps)': extractBlogCount(path.join(APPS, 'AGENTS.md')),
};
for (const [where, claim] of Object.entries(blogClaims)) {
    if (claim !== null && claim !== actual.blog) {
        report.drift.push({
            where,
            claim: `${claim} blog posts`,
            reality: `${actual.blog} blog posts`,
            severity: claim < actual.blog * 0.5 ? 'high' : 'medium',
        });
    }
}

// Components count drift: catches "9 reusable components" claims
// diverging from actual components/ directory count. (Sprint 80 audit
// finding: AGENTS.md was off by one and listed 2 phantom names + 3
// missing real names — both files were updated in this commit.)
const componentsClaims = {
    'AGENTS.md': extractComponentsCount(path.join(REPO, 'AGENTS.md')),
    'AGENTS.md (apps)': extractComponentsCount(path.join(APPS, 'AGENTS.md')),
};
for (const [where, claim] of Object.entries(componentsClaims)) {
    if (claim !== null && claim !== actual.components) {
        report.drift.push({
            where,
            claim: `${claim} reusable components`,
            reality: `${actual.components} reusable components`,
            severity: 'high',
        });
    }
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
console.log(`  components:${actual.components}`);
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
