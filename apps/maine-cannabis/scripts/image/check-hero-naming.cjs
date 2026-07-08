#!/usr/bin/env node
/**
 * scripts/image/check-hero-naming.cjs
 *
 * Defensive guard against the recurring "Layout.astro derives 5 srcset
 * variants via filename string-replace" bug class.
 *
 * Layout.astro lines 101-105 derive:
 *   <name>.jpg       (desktop default — must exist)
 *   <name>.webp      (desktop WebP — must exist)
 *   <name>.avif      (desktop AVIF — must exist)
 *   <name>-640w.jpg  (mobile JPG — must exist)
 *   <name>-640w.webp (mobile WebP — must exist)
 *   <name>-640w.avif (mobile AVIF — must exist)
 *
 * by string-replacing `.jpg` at end-of-name. If a file is uploaded with a
 * dimension-suffix instead (`name-1280x720.jpg`), Layout's regex matches
 * the trailing `.jpg` correctly, but `-640w.jpg` and `.webp` / `.avif`
 * derivations still produce `-1280x720-640w.jpg` (or just `-640w.jpg` next
 * to the dim-suffix file), which 404 because that file isn't where
 * Layout looks.
 *
 * The fix was carried out as the 2026-07-06 COA fix (commit cff15405)
 * which git-mv'd 6 dimension-suffix variants into the correct names.
 * This script prevents re-introduction.
 *
 * Usage:
 *   node scripts/image/check-hero-naming.cjs           # scan + exit non-zero on violations
 *   node scripts/image/check-hero-naming.cjs --dry-run # report only
 *
 * Exit codes:
 *   0  clean
 *   1  violations found (CI-quality check)
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

const HEROES_DIRS = [
    path.join(REPO, 'apps', 'maine-cannabis', 'public', 'images', 'heroes'),
    path.join(REPO, 'apps', 'maine-cannabis', 'public', 'images', 'infographics'),
];

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');

// Patterns that mean "this file has a non-canonical suffix that Layout.astro
// can't derive -640w variants from":
//   -1280x720.jpg   dimension suffix (the COA bug)
//   -640x360.avif   dimension suffix
//   .homepage.      internal node in name (cosmetic, not a Layout bug)
//   anything not ending in .jpg / .webp / .avif / -640w.<ext>
const VIOLATION_PATTERNS = [
    /-\d{3,4}x\d{3,4}\.(jpg|webp|avif|jpeg|png)$/i,  // dim-suffix like -1280x720
    /-(?!640w\b)\d{3,4}w\.(jpg|webp|avif)$/i,        // non-640 width-suffix like -1280w.jpg
];

const violations = [];

for (const dir of HEROES_DIRS) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir);
    for (const fn of files) {
        for (const pat of VIOLATION_PATTERNS) {
            if (pat.test(fn)) {
                violations.push({
                    dir: path.relative(REPO, dir),
                    file: fn,
                    pattern: pat.source,
                });
                break;
            }
        }
    }
}

if (violations.length === 0) {
    console.log(`[check-hero-naming] OK — ${HEROES_DIRS.length} dirs scanned, 0 naming violations`);
    process.exit(0);
}

console.error(`[check-hero-naming] FAIL — ${violations.length} hero/infographic file(s) use a Layout-incompatible suffix:`);
for (const v of violations) {
    console.error(`  ${v.dir}/${v.file}    (matched: ${v.pattern})`);
}
console.error();
console.error(`Layout.astro derives the 5 srcset variants via string-replace of the trailing`);
console.error(`.jpg. Files with dimension-suffix (\`-1280x720.jpg\`) or non-640 width-suffix`);
console.error(`(\`-1280w.jpg\`) produce a -640w.jpg URL that returns 404 — this is the bug class`);
console.error(`fixed in 2026-07-06 by \`git mv\`-renaming 6 variants of the COA hero (commit cff15405).`);
console.error();
console.error(`To fix: rename files to drop the dimension suffix — Layout will derive -640w.* from`);
console.error(`the bare \`<name>.jpg\`. After renaming, re-run \`generate-mobile-variants.cjs\``);
console.error(`to (re)create the missing -640w.* variants if needed.`);

if (DRY_RUN) {
    console.error();
    console.error(`(DRY RUN — not exiting non-zero)`);
    process.exit(0);
}
process.exit(1);
