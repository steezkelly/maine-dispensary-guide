const fs = require('fs');
const path = require('path');
const { appRoot } = require('../check/lib/paths.cjs');

const pagesPath = process.env.MDG_LINK_ARCHITECT_PAGES_DIR || path.join(appRoot, 'src', 'pages', 'guides');

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

function linkGlossaryTerms(content) {
    // Split at </head> to protect Layout props and Metadata.
    const splitPoint = content.indexOf('</head>');
    if (splitPoint === -1) {
        return { content, modified: false, skipped: true, reason: 'missing </head> marker' };
    }

    const head = content.substring(0, splitPoint + 7);
    let body = content.substring(splitPoint + 7);
    let modified = false;

    Object.keys(glossaryMap).forEach(term => {
        const link = glossaryMap[term];

        // Regex:
        // (?<![/">]) - Don't match if part of a URL or tag
        // \b($term)\b - Match full word
        // (?![^<]*>) - Don't match if inside another HTML tag
        const pattern = new RegExp(`(?<![/">])\\b(${term})\\b(?![^<]*>)`, 'i');

        // Only link if the link itself isn't already present in the body
        if (!body.includes(`href="${link}"`)) {
            if (pattern.test(body)) {
                body = body.replace(pattern, `<a href="${link}">$1</a>`);
                modified = true;
            }
        }
    });

    return { content: head + body, modified, skipped: false };
}

function run({ pagesDir = pagesPath, logger = console } = {}) {
    logger.log("🚀 Starting Node.js Link Architect (Body-Only Sync)...");

    if (!fs.existsSync(pagesDir)) {
        throw new Error(`Pages directory not found: ${pagesDir}`);
    }

    const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.astro') && f !== 'index.astro');
    let modifiedCount = 0;
    let skippedMissingHeadCount = 0;

    files.forEach(fileName => {
        const filePath = path.join(pagesDir, fileName);
        const content = fs.readFileSync(filePath, 'utf8');
        const result = linkGlossaryTerms(content);

        if (result.skipped) {
            skippedMissingHeadCount++;
            logger.warn(`⚠️  Skipped: ${fileName} (${result.reason})`);
            return;
        }

        if (result.modified) {
            fs.writeFileSync(filePath, result.content);
            modifiedCount++;
            logger.log(`✅ Synced: ${fileName}`);
        }
    });

    logger.log(`✨ Link Architect Sync Complete. Modified: ${modifiedCount}; skipped missing </head>: ${skippedMissingHeadCount}.`);

    if (modifiedCount === 0 && skippedMissingHeadCount > 0) {
        process.exitCode = 1;
    }

    return { modifiedCount, skippedMissingHeadCount, fileCount: files.length };
}

if (require.main === module) {
    run();
}

module.exports = { glossaryMap, linkGlossaryTerms, run };
