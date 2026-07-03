const fs = require('fs');
const path = require('path');

const projectRoot = 'C:/Users/Steve/OpenCode Projects/project-1';
const pagesPath = path.join(projectRoot, 'src/pages/guides');

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

const files = fs.readdirSync(pagesPath).filter(f => f.endsWith('.astro') && f !== 'index.astro');

files.forEach(fileName => {
    const filePath = path.join(pagesPath, fileName);
    let content = fs.readFileSync(filePath, 'utf8');

    // Split at </head> to protect Layout props and Metadata
    const splitPoint = content.indexOf('</head>');
    if (splitPoint === -1) return;

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

    if (modified) {
        fs.writeFileSync(filePath, head + body);
        console.log(`✅ Synced: ${fileName}`);
    }
});

console.log("✨ Link Architect Sync Complete.");
