const fs = require('fs');
const path = require('path');
const { appRoot } = require('../check/lib/paths.cjs');

const pagesPath = path.join(appRoot, 'src', 'pages', 'guides');

function assertDirectory(dir, label) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
        console.error(`Expected ${label} directory not found: ${dir}`);
        process.exit(1);
    }
}

assertDirectory(appRoot, 'Astro app root');
assertDirectory(pagesPath, 'guide pages');

const glossaryMap = {
    "Metrc": "/glossary/#metrc",
    "280E": "/glossary/#280e-(internal-revenue-code)",
    "IIC": "/glossary/#iic-(individual-identification-card)",
    "AIC": "/glossary/#aic-(authorized-individual-card)",
    "Seed-to-Sale": "/glossary/#seed-to-sale",
    "Municipal Opt-In": "/glossary/#municipal-opt-in",
    "Conditional License": "/glossary/#conditional-license",
    "Licensed Premises": "/glossary/#licensed-premises",
    "Limited Access Area": "/glossary/#limited-access-area",
    "Universal Symbol": "/glossary/#universal-symbol",
    "Adult Use Cannabis": "/glossary/#adult-use-cannabis",
    "Caregiver": "/glossary/#caregiver",
    "THC": "/glossary/#thc-(tetrahydrocannabinol)"
};

console.log("🚀 Starting Node.js Link Architect (Body-Only Sync)...");

function replaceOutsideProtectedBlocks(content, pattern, replacement) {
    const protectedBlockPattern = /<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi;
    let cursor = 0;

    for (const match of content.matchAll(protectedBlockPattern)) {
        const visibleSegment = content.slice(cursor, match.index);
        if (pattern.test(visibleSegment)) {
            return content.slice(0, cursor) + visibleSegment.replace(pattern, replacement) + content.slice(match.index);
        }
        cursor = match.index + match[0].length;
    }

    const visibleSegment = content.slice(cursor);
    if (!pattern.test(visibleSegment)) return content;
    return content.slice(0, cursor) + visibleSegment.replace(pattern, replacement);
}

const files = fs.readdirSync(pagesPath).filter(f => f.endsWith('.astro') && f !== 'index.astro');

files.forEach(fileName => {
    const filePath = path.join(pagesPath, fileName);
    let content = fs.readFileSync(filePath, 'utf8');

    // Protect Astro frontmatter, Layout props, and page-local styles; only link visible page copy.
    const articleStart = content.indexOf('<article');
    const styleEnd = content.indexOf('</style>');
    const splitPoint = articleStart !== -1 ? articleStart : styleEnd !== -1 ? styleEnd + '</style>'.length : -1;
    if (splitPoint === -1) return;

    const protectedContent = content.slice(0, splitPoint);
    let bodyContent = content.slice(splitPoint);
    let modified = false;

    Object.keys(glossaryMap).forEach(term => {
        const link = glossaryMap[term];
        
        // Regex: 
        // (?<![/">]) - Don't match if part of a URL or tag
        // \b($term)\b - Match full word
        // (?![^<]*>) - Don't match if inside another HTML tag
        const pattern = new RegExp(`(?<![/">])\\b(${term})\\b(?![^<]*>)`, 'i');

        // Only link if the link itself isn't already present in the body.
        if (!bodyContent.includes(`href="${link}"`)) {
            const linkedContent = replaceOutsideProtectedBlocks(
                bodyContent,
                pattern,
                `<a href="${link}">$1</a>`,
            );
            if (linkedContent !== bodyContent) {
                bodyContent = linkedContent;
                modified = true;
            }
        }
    });

    if (modified) {
        fs.writeFileSync(filePath, protectedContent + bodyContent);
        console.log(`✅ Synced: ${fileName}`);
    }
});

console.log("✨ Link Architect Sync Complete.");
