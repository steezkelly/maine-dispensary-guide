// Counter-claim extractors shared by scripts/admin/data-integrity-check.cjs
// and scripts/admin/tests/data-integrity-check.test.cjs. Extracted so the
// regression test exercises the production regexes verbatim rather than
// reimplementing them inline. Any future change to a regex must happen
// here once.
//
// 2026-07-26 follow-up: the original script returned only the FIRST
// `(\d+)` match per file, allowing a stale duplicate (overview sentence
// vs. project-tree line) to merge alongside a current overview. Every
// match is collected via global-regex iteration.

const fs = require('node:fs');

function extractAllCounts(text, patterns) {
    const out = [];
    for (const re of patterns) {
        // Preserve all flags (g, i, m, …) so multiline anchors and global
        // iteration both work.
        const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
        let m;
        while ((m = r.exec(text)) !== null) out.push(parseInt(m[1]));
    }
    return out;
}

function extractBlogCountsFromText(text) {
    // Match both phrasings so the duplicate-count regression catches a
    // stale tree claim alongside a current overview claim. The legacy
    // "Blog posts (53 articles)" parenthetical is a sub-count for
    // explainability, not a directory-size claim — comparing it to the
    // .astro file count always flags as drift, so it is intentionally
    // NOT matched.
    return extractAllCounts(text, [
        /(\d+)\s*blog\s*posts?/i,
        /(\d+)\s*blog\s*route\s*sources?/i,
    ]);
}

function extractComponentsCountsFromText(text) {
    // Match both "30 reusable components" (overview) and the
    // project-tree header form "**Components** (30, …)" and the
    // plain "Components (30, …)" form. Plain-form uses the /m flag
    // so `^` matches the start of any line.
    return extractAllCounts(text, [
        /(\d+)\s*reusable\s*components?/i,
        /(?:^|\*\*)\s*Components\s*\*?\*?\s*\((\d+)\s*,/im,
    ]);
}

// File-reading convenience wrappers used by scripts/admin/data-integrity-check.cjs.
function extractBlogCounts(file) {
    if (!fs.existsSync(file)) return [];
    return extractBlogCountsFromText(fs.readFileSync(file, 'utf8'));
}

function extractComponentsCounts(file) {
    if (!fs.existsSync(file)) return [];
    return extractComponentsCountsFromText(fs.readFileSync(file, 'utf8'));
}

module.exports = {
    extractAllCounts,
    extractBlogCountsFromText,
    extractComponentsCountsFromText,
    extractBlogCounts,
    extractComponentsCounts,
};
