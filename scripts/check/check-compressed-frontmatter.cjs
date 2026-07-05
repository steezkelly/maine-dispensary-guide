#!/usr/bin/env node
/**
 * check-compressed-frontmatter.cjs
 *
 * Lint that catches the R128 bug class (2026-07-04):
 * An .astro file with the AutoRelated component used in its body, but
 * where `import AutoRelated from '...'` is NOT inside the file's
 * frontmatter (--- ... --- block). Astro's bundler only resolves imports
 * that appear inside the frontmatter block — placing the import on a
 * line outside the frontmatter, or appending it to a "compressed"
 * frontmatter line that begins with `---` and contains code, results in
 * a silent build that produces broken AutoRelated output (an empty
 * <aside> or no related guides at all).
 *
 * Detection strategy:
 *   For every .astro file under apps/maine-cannabis/src/pages/:
 *     1. If `<AutoRelated` does not appear in the body, skip.
 *     2. Otherwise, locate the file's frontmatter (between the first
 *        `---` and the next standalone `---` — handles both proper and
 *        compressed forms).
 *     3. If `import AutoRelated` is NOT inside the frontmatter, flag.
 *
 * The check is fast (no Astro invocation, no build, no network) and
 * cwd-independent.
 *
 * Usage:
 *   node scripts/check/check-compressed-frontmatter.cjs [--fix]
 *
 *   --fix   (NOT IMPLEMENTED — prints a hint to scripts/link/fix-autorelated-imports.py
 *           which is the canonical repair tool. Linters should not
 *           auto-modify source files without operator sign-off.)
 *
 * Exit codes:
 *   0  no findings
 *   1  one or more .astro files use AutoRelated but lack the import
 *      inside their frontmatter (the R128 bug class)
 *   2  tool/env error (file not found, etc.)
 *
 * What this catches: the R128 fixup commit `1fa654c0` (2026-07-04)
 * repaired 35 files where `import AutoRelated` had been appended to
 * the END of a compressed-frontmatter line that began with `---`. The
 * Astro bundler silently dropped those imports, the build went green,
 * and the rendered HTML had an empty <aside class="auto-related"> with
 * no related-guide items. Without this lint, the bug class can re-
 * introduce itself on any future migration run.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Resolve repo root from this script's location (scripts/check/) up two
// levels. Same pattern as check-docs-vs-code.cjs.
const REPO = path.resolve(__dirname, '..', '..');
const PAGES_DIR = path.join(REPO, 'apps', 'maine-cannabis', 'src', 'pages');

const ASTRO_RE = /\.astro$/;
const IMPORT_RE = /import\s+AutoRelated\s+from\s+['"][^'"]+['"]\s*;/;
const USAGE_RE = /<AutoRelated\b/;

/**
 * Locate the frontmatter block in an .astro file's text. Returns
 * [openIdx, closeIdx) char indices, or [-1, -1] if no frontmatter.
 *
 * Handles two cases:
 *   A) Proper form: file starts with `---` on line 1, ends with `---`
 *      on its own line further down. We split on lines and find the
 *      first pair of `---` markers that are alone on their line.
 *   B) Compressed form: file starts with `---` on line 1 followed by
 *      inline code, and the closing `---` is somewhere on the same
 *      line as code. We find the first `---` (opening), then look for
 *      the next `---` that is either alone on its line OR is followed
 *      by non-`---` content (the body).
 *
 * For the lint purpose we don't need to perfectly parse compressed
 * frontmatter — we just need to know whether `import AutoRelated`
 * appears between the opening `---` and the closing `---`. A regex
 * over the line range `[start of line 1, start of line N]` where N is
 * the closing fence is sufficient.
 */
function findFrontmatterBounds(text) {
    if (!text.startsWith('---')) return [-1, -1];
    // Scan line-by-line. The opening fence is line 0 (must be exactly
    // `---` after trimming). The closing fence is the next line whose
    // trimmed content starts with `---` (covers both proper `---` on
    // its own line and compressed `--- ...` where the rest of the line
    // is body content).
    const lines = text.split('\n');
    // Line 0 must START with `---` (after trimming leading whitespace).
    // This accepts both the proper form (`---` alone on line 0) and the
    // compressed form (`--- import X from '...'; ...`). The previous
    // version required line 0 to be EXACTLY `---` and rejected compressed
    // files — false positives on every R127-migrated file.
    if (!lines[0].trim().startsWith('---')) return [-1, -1];

    // Build a char-index map: index of the first char of each line.
    const lineStart = new Array(lines.length);
    let pos = 0;
    for (let i = 0; i < lines.length; i++) {
        lineStart[i] = pos;
        pos += lines[i].length + 1; // +1 for the \n
    }

    // Find the closing fence: next line (>=1) that starts with `---`
    // (after trimming). This catches both `---` on its own line and
    // `--- <body content>` compressed form.
    let closeLine = -1;
    for (let i = 1; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (trimmed === '---' || trimmed.startsWith('---')) {
            closeLine = i;
            break;
        }
    }
    if (closeLine === -1) return [lineStart[0], text.length]; // unclosed frontmatter

    // Frontmatter content occupies [lineStart[0], lineStart[closeLine]).
    // The opening `---` is line 0 itself; the closing `---` is line
    // closeLine. The body of the frontmatter is everything between.
    return [lineStart[0], lineStart[closeLine]];
}


/**
 * Walk PAGES_DIR for .astro files; return list of files where
 * `<AutoRelated` is used but the import is not inside the frontmatter.
 */
function findViolations() {
    if (!fs.existsSync(PAGES_DIR)) {
        console.error(`Pages directory not found: ${PAGES_DIR}`);
        process.exit(2);
    }

    const violations = [];
    const ok = [];

    function walk(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(full);
                continue;
            }
            if (!entry.isFile() || !ASTRO_RE.test(entry.name)) continue;

            const text = fs.readFileSync(full, 'utf8');
            if (!USAGE_RE.test(text)) continue; // file doesn't use AutoRelated — skip

            const [fmStart, fmEnd] = findFrontmatterBounds(text);
            if (fmStart === -1) {
                violations.push({ file: full, reason: 'no frontmatter' });
                continue;
            }

            // Strip the import check to inside the frontmatter block.
            // The frontmatter block as returned includes the opening
            // and closing `---` fences themselves; the import must be
            // inside that range.
            const fmBlock = text.slice(fmStart, fmEnd);
            if (!IMPORT_RE.test(fmBlock)) {
                violations.push({
                    file: full,
                    reason: 'import AutoRelated not inside frontmatter',
                });
                continue;
            }

            ok.push(full);
        }
    }

    walk(PAGES_DIR);
    return { violations, ok };
}

function main() {
    const args = process.argv.slice(2);
    const fixMode = args.includes('--fix');

    const { violations, ok } = findViolations();

    console.log(`Scanned: ${ok.length + violations.length} .astro file(s) using <AutoRelated />`);
    console.log(`  OK (import inside frontmatter): ${ok.length}`);
    console.log(`  VIOLATIONS (import outside frontmatter): ${violations.length}`);

    if (violations.length === 0) {
        console.log('\n✓ All AutoRelated imports are inside their frontmatter blocks.');
        process.exit(0);
    }

    console.log('\n✗ Files where <AutoRelated /> is used but `import AutoRelated` is missing from frontmatter:');
    for (const v of violations) {
        const rel = path.relative(REPO, v.file);
        console.log(`  ${rel}`);
        console.log(`      reason: ${v.reason}`);
    }

    if (fixMode) {
        console.log('\nAuto-fix is not implemented in this lint.');
        console.log('Run the canonical repair tool instead:');
        console.log('  python3 scripts/link/fix-autorelated-imports.py');
        console.log('(That tool moves the import INTO the frontmatter for every file listed above.)');
    } else {
        console.log('\nTo repair, run:');
        console.log('  python3 scripts/link/fix-autorelated-imports.py');
    }

    process.exit(1);
}

main();