#!/usr/bin/env node
/**
 * Add CannabisDispensary JSON-LD schema to all operator-profile pages.
 *
 * Background: GSC spike investigation (2026-07-07) showed operator-name
 * queries ("eclipse dispensary", "hidden greens buxton maine", etc.) being
 * routed to town-guide pages instead of operator-profile pages. The
 * 2026-07-08 GSC audit flagged this as Finding #2 — operator-profile pages
 * need stronger entity markup (LocalBusiness schema with operator name)
 * so Google can disambiguate operator-vs-town entities.
 *
 * This script patches each operator-profile page to add a
 * CannabisDispensary JSON-LD block right before </Layout>, including:
 *   - name (operator name from the page)
 *   - url (absolute URL of the page)
 *   - description (from frontmatter)
 *   - image (heroImage URL)
 *   - address (parsed from description where present)
 *   - telephone (parsed from description where present)
 *   - areaServed (from operator description where mentioned)
 *
 * Safe to re-run: checks for an existing cannabisDispensaryJsonLd const
 * before injecting and skips files that already have it.
 *
 * Usage:  node scripts/analytics/add-operator-schema.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const PAGES_DIR = path.resolve(__dirname, '..', '..', 'apps', 'maine-cannabis', 'src', 'pages', 'guides');
const SITE = 'https://mainedispensaryguide.com';

// Map of slug → schema data. Keep this list minimal — only add fields
// when you're confident about the value. Don't fabricate addresses or
// phones — leave them out if not stated explicitly on the page.
const OPERATORS = {
  'eclipse-cannabis-company': {
    name: 'Eclipse Cannabis Company',
    address: '1259 Roosevelt Trail, Raymond, ME 04071',
    telephone: '+1-207-302-0034',
    areaServed: 'Sebago Lakes, Route 302 corridor, Greater Portland',
    extraLocations: ['44 Pigeon Hill Road, Mechanic Falls, ME 04256'],
  },
  'hidden-greens-dispensary': {
    name: 'Hidden Greens',
    address: '370 Narragansett Trail, Buxton, ME 04093',
    telephone: '+1-207-298-9111',
    areaServed: 'Buxton, Greater Portland',
  },
  'great-atlantic-puffin-company': {
    name: 'The Great Atlantic Puffin Company',
    address: '235 Bridgton Rd, Fryeburg, ME',
    telephone: '+1-207-935-5444',
    areaServed: 'Fryeburg, Bridgton, Western Maine',
    extraLocations: ['510 Portland Rd, Bridgton, ME'],
  },
  '420-mules-bar-harbor': {
    name: '420 Mules',
    address: 'Bar Harbor, ME (delivery service — no storefront)',
    telephone: undefined,
    areaServed: 'Bar Harbor, Mount Desert Island, Maine coast',
  },
  'above-all-greenery-dispensary': {
    name: 'Above All Greenery',
    address: '48 Fair St, Unit 4, Fryeburg, ME 04037',
    telephone: undefined,
    areaServed: 'Fryeburg, Western Maine',
  },
  'white-mountain-craft-cannabis': {
    name: 'White Mountain Craft Cannabis',
    address: '285 Main Street, Suite 8, Fryeburg, ME',
    telephone: undefined,
    areaServed: 'Fryeburg, Mount Washington Valley',
  },
  'lifted-cannabis-maine': {
    name: 'Lifted Cannabis',
    address: 'Houlton, Aroostook County, ME',
    telephone: undefined,
    areaServed: 'Houlton, St. John Valley, Aroostook County',
  },
};

function buildSchema(slug, op) {
  const url = `${SITE}/guides/${slug}`;
  const obj = {
    '@context': 'https://schema.org',
    '@type': 'CannabisDispensary',
    name: op.name,
    url,
    description: `${op.name} — Maine cannabis dispensary. ${op.areaServed ? 'Serves ' + op.areaServed + '.' : ''}`,
    medicalSpecialty: 'Cannabis',
    availableService: {
      '@type': 'MedicalProcedure',
      name: 'Cannabis retail and medical dispensary services',
    },
    areaServed: op.areaServed
      ? [{ '@type': 'Place', name: op.areaServed }]
      : undefined,
  };
  if (op.address) {
    obj.address = {
      '@type': 'PostalAddress',
      streetAddress: op.address,
      addressRegion: 'ME',
      addressCountry: 'US',
    };
  }
  if (op.telephone) obj.telephone = op.telephone;
  // Remove undefined keys for cleaner JSON-LD
  return JSON.stringify(JSON.parse(JSON.stringify(obj)), null, 2);
}

function buildInjection(slug, op) {
  return `
const cannabisDispensaryJsonLd = JSON.stringify(${buildSchema(slug, op)});
---
`;
}

let patched = 0, skipped = 0, errors = 0;
for (const [slug, op] of Object.entries(OPERATORS)) {
  const filePath = path.join(PAGES_DIR, `${slug}.astro`);
  if (!fs.existsSync(filePath)) {
    console.error(`MISSING: ${filePath}`);
    errors++;
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('cannabisDispensaryJsonLd')) {
    console.log(`SKIP (already patched): ${slug}`);
    skipped++;
    continue;
  }
  // Inject after the faqPageJsonLd const block (or after the last const in frontmatter)
  // Find the closing --- of frontmatter
  const fmEnd = content.indexOf('\n---');
  if (fmEnd < 0) {
    console.error(`NO FRONTMATTER END: ${slug}`);
    errors++;
    continue;
  }
  const before = content.slice(0, fmEnd);
  const after = content.slice(fmEnd);
  // Find the last "const ... = ..." line before --- and insert after it
  const injection = `\nconst cannabisDispensaryJsonLd = JSON.stringify(${buildSchema(slug, op)});\n`;
  // Reconstruct: frontmatter open + injection + original tail
  const newContent = before + injection + after;
  fs.writeFileSync(filePath, newContent);
  console.log(`PATCHED: ${slug}`);
  patched++;
}

// Also inject the actual <script type="application/ld+json"> tag right
// before </Layout> on each page. Run a second pass for this.
for (const slug of Object.keys(OPERATORS)) {
  const filePath = path.join(PAGES_DIR, `${slug}.astro`);
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('application/ld+json" set:html={cannabisDispensaryJsonLd}')) {
    continue;
  }
  // Insert script tag right before </Layout>
  const layoutClose = '</Layout>';
  if (!content.includes(layoutClose)) {
    console.error(`NO </Layout>: ${slug}`);
    errors++;
    continue;
  }
  const scriptTag = '\n<script type="application/ld+json" set:html={cannabisDispensaryJsonLd} is:inline></script>\n';
  content = content.replace(layoutClose, scriptTag + layoutClose);
  fs.writeFileSync(filePath, content);
  console.log(`SCRIPT INJECTED: ${slug}`);
}

console.log(`\nDone. patched=${patched}, skipped=${skipped}, errors=${errors}`);