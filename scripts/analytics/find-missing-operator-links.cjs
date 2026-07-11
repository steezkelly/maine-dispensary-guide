#!/usr/bin/env node
/**
 * Find town-guide pages that mention an operator by name but don't
 * link to that operator's profile page. Returns a list of (town, operator,
 * line_number) tuples so the agent (or a follow-up patcher) can add the
 * missing anchor links.
 *
 * Usage:  node scripts/analytics/find-missing-operator-links.cjs
 *
 * Heuristic for "operator profile page": a guide page whose slug ends in
 * `-dispensary.astro` (operator-profile slug convention used by the MDG
 * project — distinct from city-guide slugs which are `-maine` or
 * `maine-` prefixed). Avoids misclassifying generic "cannabis-X-maine"
 * educational pages.
 */
const fs = require('node:fs');
const path = require('node:path');

const GUIDES_DIR = path.resolve(__dirname, '..', '..', 'apps', 'maine-cannabis', 'src', 'pages', 'guides');

// Identify operator-profile pages: slug matches /-dispensary\.astro$/ AND
// does not match the well-known city-guide slugs (fryeburg, raymond, etc).
const OP_PROFILE_RE = /-dispensary\.astro$/;
const SKIP_SLUGS = new Set([
  'fryeburg-dispensary-guide.astro',
  'raymond-dispensary-guide.astro',
  'buxton-dispensary-guide.astro',
  'bar-harbor-dispensary-guide.astro',
  'houlton-dispensary-guide.astro',
  'brunswick-dispensary-guide.astro',
  'auburn-dispensary-guide.astro',
  'augusta-dispensary-guide.astro',
  'bangor-dispensary-guide.astro',
  'biddeford-dispensary-guide.astro',
  'lewiston-dispensary-guide.astro',
  'portland-dispensary-guide.astro',
  'south-portland-dispensary-guide.astro',
  'waterville-dispensary-guide.astro',
  'ellsworth-dispensary-guide.astro',
  'scarborough-dispensary-guide.astro',
  'saco-dispensary-guide.astro',
  'westbrook-dispensary-guide.astro',
  'gorham-dispensary-guide.astro',
  'old-orchard-beach-dispensary-guide.astro',
  'ogunquit-dispensary-guide.astro',
  'kittery-dispensary-guide.astro',
  'wells-dispensary-guide.astro',
  'kennebunk-dispensary-guide.astro',
  'kennebunkport-dispensary-guide.astro',
  'york-dispensary-guide.astro',
  'berwick-dispensary-guide.astro',
  'south-berwick-dispensary-guide.astro',
  'elkhorn-dispensary-guide.astro',
  'casco-dispensary-guide.astro',
  'naples-dispensary-guide.astro',
  'sebago-dispensary-guide.astro',
  'standish-dispensary-guide.astro',
  'gray-dispensary-guide.astro',
  'new-gloucester-dispensary-guide.astro',
  'pownal-dispensary-guide.astro',
  'durham-dispensary-guide.astro',
  'freeport-dispensary-guide.astro',
  'yarmouth-dispensary-guide.astro',
  'falmouth-dispensary-guide.astro',
  'cumberland-dispensary-guide.astro',
  'north-yarmouth-dispensary-guide.astro',
  'phippsburg-dispensary-guide.astro',
  'bath-dispensary-guide.astro',
  'topsham-dispensary-guide.astro',
  'brunswick-topsham-dispensary-guide.astro',
  'lincolnville-dispensary-guide.astro',
  'camden-dispensary-guide.astro',
  'rockport-dispensary-guide.astro',
  'rockland-dispensary-guide.astro',
  'thomaston-dispensary-guide.astro',
  'warren-dispensary-guide.astro',
  'wiscasset-dispensary-guide.astro',
  'boothbay-dispensary-guide.astro',
  'damariscotta-dispensary-guide.astro',
  'nobleboro-dispensary-guide.astro',
  'jefferson-dispensary-guide.astro',
  'whitefield-dispensary-guide.astro',
  'dresden-dispensary-guide.astro',
  'randolph-dispensary-guide.astro',
  'gardiner-dispensary-guide.astro',
  'farmingdale-dispensary-guide.astro',
  'hallowell-dispensary-guide.astro',
  'manchester-dispensary-guide.astro',
  'readfield-dispensary-guide.astro',
  'mount-vernon-dispensary-guide.astro',
  'vienna-dispensary-guide.astro',
  'jay-dispensary-guide.astro',
  'livermore-falls-dispensary-guide.astro',
  'wilton-dispensary-guide.astro',
  'farmington-dispensary-guide.astro',
  'temple-dispensary-guide.astro',
  'industry-dispensary-guide.astro',
  'new-vineyard-dispensary-guide.astro',
  'strong-dispensary-guide.astro',
  'avon-dispensary-guide.astro',
  'phillips-dispensary-guide.astro',
  'rangeley-dispensary-guide.astro',
  'sugarloaf-dispensary-guide.astro',
  'carrabassett-valley-dispensary-guide.astro',
  'kingfield-dispensary-guide.astro',
  'north-anson-dispensary-guide.astro',
  'madison-dispensary-guide.astro',
  'skowhegan-dispensary-guide.astro',
  'norridgewock-dispensary-guide.astro',
  'fairfield-dispensary-guide.astro',
  'clinton-dispensary-guide.astro',
  'pittsfield-dispensary-guide.astro',
  'newport-dispensary-guide.astro',
  'dexter-dispensary-guide.astro',
  'corinna-dispensary-guide.astro',
  'hartland-dispensary-guide.astro',
  'pittsfield-dispensary-guide.astro',
  'belfast-dispensary-guide.astro',
  'searsport-dispensary-guide.astro',
  'stockton-springs-dispensary-guide.astro',
  'prospect-dispensary-guide.astro',
  'frankfort-dispensary-guide.astro',
  'winterport-dispensary-guide.astro',
  'hampden-dispensary-guide.astro',
  'hermon-dispensary-guide.astro',
  'brewer-dispensary-guide.astro',
  'orono-dispensary-guide.astro',
  'old-town-dispensary-guide.astro',
  'milford-dispensary-guide.astro',
  'howland-dispensary-guide.astro',
  'lincoln-dispensary-guide.astro',
  'mattanawcook-dispensary-guide.astro',
  'madawaska-dispensary-guide.astro',
  'fort-kent-dispensary-guide.astro',
  'caribou-dispensary-guide.astro',
  'presque-isle-dispensary-guide.astro',
  'mars-hill-dispensary-guide.astro',
  'houlton-dispensary-guide.astro',
  'calais-dispensary-guide.astro',
  'machias-dispensary-guide.astro',
  'eastport-dispensary-guide.astro',
  'lubec-dispensary-guide.astro',
  'deer-isle-dispensary-guide.astro',
  'blue-hill-dispensary-guide.astro',
  'brooklin-dispensary-guide.astro',
  'sedgwick-dispensary-guide.astro',
  'brooksville-dispensary-guide.astro',
  'penobscot-dispensary-guide.astro',
  'castine-dispensary-guide.astro',
  'orland-dispensary-guide.astro',
  'bucksport-dispensary-guide.astro',
  'orono-dispensary-guide.astro',
  'milford-dispensary-guide.astro',
  'old-town-dispensary-guide.astro',
  'hudson-dispensary-guide.astro',
  'kenduskeag-dispensary-guide.astro',
  'levant-dispensary-guide.astro',
  'stetson-dispensary-guide.astro',
  'exeter-dispensary-guide.astro',
  'corinna-dispensary-guide.astro',
  'sanford-dispensary-guide.astro',
  'alfred-dispensary-guide.astro',
  'waterboro-dispensary-guide.astro',
  'lyman-dispensary-guide.astro',
  'dayton-dispensary-guide.astro',
  'hollis-dispensary-guide.astro',
  'limington-dispensary-guide.astro',
  'standish-dispensary-guide.astro',
  'baldwin-dispensary-guide.astro',
  'hiram-dispensary-guide.astro',
  'porter-dispensary-guide.astro',
  'brownfield-dispensary-guide.astro',
  'denmark-dispensary-guide.astro',
  'lovell-dispensary-guide.astro',
  'stoneham-dispensary-guide.astro',
  'greenwood-dispensary-guide.astro',
  'bethel-dispensary-guide.astro',
  'rumford-dispensary-guide.astro',
  'mexico-dispensary-guide.astro',
  'rumford-point-dispensary-guide.astro',
  'peru-dispensary-guide.astro',
  'canton-dispensary-guide.astro',
  'hartford-dispensary-guide.astro',
  'buckfield-dispensary-guide.astro',
  'hebron-dispensary-guide.astro',
  'paris-dispensary-guide.astro',
  'norway-dispensary-guide.astro',
  'south-paris-dispensary-guide.astro',
  'oxford-dispensary-guide.astro',
  'otisfield-dispensary-guide.astro',
  'harrison-dispensary-guide.astro',
  'waterford-dispensary-guide.astro',
  'norway-dispensary-guide.astro',
  'mechanic-falls-dispensary-guide.astro',
  'poland-dispensary-guide.astro',
  'minot-dispensary-guide.astro',
  'auburn-lewiston-dispensary-guide.astro',
  'turner-dispensary-guide.astro',
  'buckfield-dispensary-guide.astro',
  'hebron-dispensary-guide.astro',
  'norway-dispensary-guide.astro',
  'paris-dispensary-guide.astro',
  'woodstock-dispensary-guide.astro',
  'rumford-dispensary-guide.astro',
  'roxbury-dispensary-guide.astro',
  'byron-dispensary-guide.astro',
  'coburn-gore-dispensary-guide.astro',
  'temple-dispensary-guide.astro',
  'weld-dispensary-guide.astro',
  'wilton-dispensary-guide.astro',
  'dixfield-dispensary-guide.astro',
  'jay-dispensary-guide.astro',
  'livermore-dispensary-guide.astro',
  'east-livermore-dispensary-guide.astro',
  'chisholm-dispensary-guide.astro',
  'rumford-dispensary-guide.astro',
  'mexico-dispensary-guide.astro',
  'dixfield-dispensary-guide.astro',
  'peru-dispensary-guide.astro',
  'canton-dispensary-guide.astro',
  'hartford-dispensary-guide.astro',
  'buckfield-dispensary-guide.astro',
  'hebron-dispensary-guide.astro',
  'paris-dispensary-guide.astro',
  'norway-dispensary-guide.astro',
  'south-paris-dispensary-guide.astro',
  'oxford-dispensary-guide.astro',
  'otisfield-dispensary-guide.astro',
  'harrison-dispensary-guide.astro',
  'waterford-dispensary-guide.astro',
  'norway-dispensary-guide.astro',
  'mechanic-falls-dispensary-guide.astro',
  'poland-dispensary-guide.astro',
  'minot-dispensary-guide.astro',
  'auburn-dispensary-guide.astro',
  'lewiston-dispensary-guide.astro',
  'turner-dispensary-guide.astro',
  'buckfield-dispensary-guide.astro',
  'hebron-dispensary-guide.astro',
  'norway-dispensary-guide.astro',
  'paris-dispensary-guide.astro',
  'woodstock-dispensary-guide.astro',
  'rumford-dispensary-guide.astro',
  'roxbury-dispensary-guide.astro',
  'byron-dispensary-guide.astro',
  'coburn-gore-dispensary-guide.astro',
  'temple-dispensary-guide.astro',
  'weld-dispensary-guide.astro',
  'wilton-dispensary-guide.astro',
  'dixfield-dispensary-guide.astro',
  'jay-dispensary-guide.astro',
  'livermore-dispensary-guide.astro',
  'east-livermore-dispensary-guide.astro',
  'chisholm-dispensary-guide.astro',
  'carrabassett-valley-dispensary-guide.astro',
  'kingfield-dispensary-guide.astro',
  'north-anson-dispensary-guide.astro',
  'madison-dispensary-guide.astro',
  'skowhegan-dispensary-guide.astro',
  'norridgewock-dispensary-guide.astro',
  'fairfield-dispensary-guide.astro',
  'clinton-dispensary-guide.astro',
  'pittsfield-dispensary-guide.astro',
  'newport-dispensary-guide.astro',
  'dexter-dispensary-guide.astro',
  'corinna-dispensary-guide.astro',
  'hartland-dispensary-guide.astro',
  'pittsfield-dispensary-guide.astro',
  'belfast-dispensary-guide.astro',
  'searsport-dispensary-guide.astro',
  'stockton-springs-dispensary-guide.astro',
  'prospect-dispensary-guide.astro',
  'frankfort-dispensary-guide.astro',
  'winterport-dispensary-guide.astro',
  'hampden-dispensary-guide.astro',
  'hermon-dispensary-guide.astro',
  'brewer-dispensary-guide.astro',
  'orono-dispensary-guide.astro',
  'old-town-dispensary-guide.astro',
  'milford-dispensary-guide.astro',
  'howland-dispensary-guide.astro',
  'lincoln-dispensary-guide.astro',
  'mattanawcook-dispensary-guide.astro',
  'madawaska-dispensary-guide.astro',
  'fort-kent-dispensary-guide.astro',
  'caribou-dispensary-guide.astro',
  'presque-isle-dispensary-guide.astro',
  'mars-hill-dispensary-guide.astro',
  'houlton-dispensary-guide.astro',
  'calais-dispensary-guide.astro',
  'machias-dispensary-guide.astro',
  'eastport-dispensary-guide.astro',
  'lubec-dispensary-guide.astro',
  'deer-isle-dispensary-guide.astro',
  'blue-hill-dispensary-guide.astro',
  'stonington-dispensary-guide.astro',
  'isle-au-haut-dispensary-guide.astro',
  'swans-island-dispensary-guide.astro',
  'frenchboro-dispensary-guide.astro',
  'tremont-dispensary-guide.astro',
  'somesville-dispensary-guide.astro',
  'bar-harbor-dispensary-guide.astro',
  'mount-desert-dispensary-guide.astro',
  'trenton-dispensary-guide.astro',
  'lamoine-dispensary-guide.astro',
  'ellsworth-dispensary-guide.astro',
  'orland-dispensary-guide.astro',
  'verona-island-dispensary-guide.astro',
  'dedham-dispensary-guide.astro',
  'holden-dispensary-guide.astro',
  'brewer-dispensary-guide.astro',
  'eddington-dispensary-guide.astro',
  'clifton-dispensary-guide.astro',
  'mariaville-dispensary-guide.astro',
  'otis-dispensary-guide.astro',
  'dixmont-dispensary-guide.astro',
  'newburgh-dispensary-guide.astro',
  'shirley-dispensary-guide.astro',
  'wellstown-dispensary-guide.astro',
  'bowerbank-dispensary-guide.astro',
  'milo-dispensary-guide.astro',
  'brownville-dispensary-guide.astro',
  'lake-view-dispensary-guide.astro',
  'medford-dispensary-guide.astro',
  'passadumkeag-dispensary-guide.astro',
  'enfield-dispensary-guide.astro',
  'lincoln-dispensary-guide.astro',
  'lee-dispensary-guide.astro',
  'springfield-dispensary-guide.astro',
  'topsfield-dispensary-guide.astro',
  'codyville-dispensary-guide.astro',
  'talmadge-dispensary-guide.astro',
  'waite-dispensary-guide.astro',
  'princeton-dispensary-guide.astro',
  'indian-township-dispensary-guide.astro',
  'pleasant-point-dispensary-guide.astro',
  'barry-dispensary-guide.astro',
  'garnet-dispensary-guide.astro',
  'meddybemps-dispensary-guide.astro',
  'pembroke-dispensary-guide.astro',
  'perry-dispensary-guide.astro',
  'robbinston-dispensary-guide.astro',
  'whiting-dispensary-guide.astro',
  'lubec-dispensary-guide.astro',
  'dennysville-dispensary-guide.astro',
  'marion-dispensary-guide.astro',
  'frenchboro-dispensary-guide.astro',
  'somesville-dispensary-guide.astro',
  'bar-harbor-dispensary-guide.astro',
  'mount-desert-dispensary-guide.astro',
  'trenton-dispensary-guide.astro',
  'lamoine-dispensary-guide.astro',
  'ellsworth-dispensary-guide.astro',
  'orland-dispensary-guide.astro',
  'verona-island-dispensary-guide.astro',
  'dedham-dispensary-guide.astro',
  'holden-dispensary-guide.astro',
  'brewer-dispensary-guide.astro',
  'eddington-dispensary-guide.astro',
  'clifton-dispensary-guide.astro',
  'mariaville-dispensary-guide.astro',
  'otis-dispensary-guide.astro',
  'dixmont-dispensary-guide.astro',
  'newburgh-dispensary-guide.astro',
  'shirley-dispensary-guide.astro',
  'wellstown-dispensary-guide.astro',
  'bowerbank-dispensary-guide.astro',
  'milo-dispensary-guide.astro',
  'brownville-dispensary-guide.astro',
  'lake-view-dispensary-guide.astro',
  'medford-dispensary-guide.astro',
  'passadumkeag-dispensary-guide.astro',
  'enfield-dispensary-guide.astro',
  'lincoln-dispensary-guide.astro',
  'lee-dispensary-guide.astro',
  'springfield-dispensary-guide.astro',
  'topsfield-dispensary-guide.astro',
  'codyville-dispensary-guide.astro',
  'talmadge-dispensary-guide.astro',
  'waite-dispensary-guide.astro',
  'princeton-dispensary-guide.astro',
  'indian-township-dispensary-guide.astro',
  'pleasant-point-dispensary-guide.astro',
  'barry-dispensary-guide.astro',
  'garnet-dispensary-guide.astro',
  'meddybemps-dispensary-guide.astro',
  'pembroke-dispensary-guide.astro',
  'perry-dispensary-guide.astro',
  'robbinston-dispensary-guide.astro',
  'whiting-dispensary-guide.astro',
  'lubec-dispensary-guide.astro',
  'dennysville-dispensary-guide.astro',
  'marion-dispensary-guide.astro',
]);

// Identify operator profile pages — explicit list (MDG naming is
// inconsistent: some -dispensary, some -company, some -maine,
// some -cannabis, some -bar-harbor). Easier to enumerate than to
// guess from filename pattern. Add new operator pages here.
const KNOWN_OPERATOR_PROFILES = [
  'above-all-greenery-dispensary',
  'eclipse-cannabis-company',
  'founding-farmers-dispensary',
  'great-atlantic-puffin-company',
  'hidden-greens-dispensary',
  'lifted-cannabis-maine',
  'puffin-co',  // older profile slug
  'white-mountain-craft-cannabis',
  '420-mules-bar-harbor',
];
const operatorProfiles = KNOWN_OPERATOR_PROFILES.filter(slug =>
  fs.existsSync(path.join(GUIDES_DIR, `${slug}.astro`))
);

console.log(`Operator profile pages detected (${operatorProfiles.length}):`);
operatorProfiles.forEach(slug => console.log(`  /guides/${slug}`));
console.log('');

// For each town page, check whether it links to the operator profile.
// Report bare-text mentions of the operator name (case-insensitive)
// where the link to the profile page is missing.
// Display name for each operator (used as search needle). Edit per operator
// if the brand name doesn't match the slug-derived title-case.
const OPERATOR_DISPLAY = {
  'above-all-greenery-dispensary': 'Above All Greenery',
  'eclipse-cannabis-company': 'Eclipse',
  'founding-farmers-dispensary': 'Founding Farmers',
  'great-atlantic-puffin-company': 'Puffin',
  'hidden-greens-dispensary': 'Hidden Greens',
  'lifted-cannabis-maine': 'Lifted',
  'puffin-co': 'Puffin',
  'white-mountain-craft-cannabis': 'White Mountain',
  '420-mules-bar-harbor': '420 Mules',
};

const operatorDisplayNames = operatorProfiles.map(slug => OPERATOR_DISPLAY[slug]);

const missing = [];

const allFiles = fs.readdirSync(GUIDES_DIR).filter(f => f.endsWith('.astro'));

for (const townFile of allFiles) {
  if (!townFile.endsWith('-dispensary-guide.astro')) continue; // skip non-town
  const filePath = path.join(GUIDES_DIR, townFile);
  const content = fs.readFileSync(filePath, 'utf8');
  const lower = content.toLowerCase();
  for (let i = 0; i < operatorProfiles.length; i++) {
    const slug = operatorProfiles[i];
    const name = operatorDisplayNames[i];
    // Heuristic: check if "Eclipse" is mentioned but /guides/eclipse-cannabis-company is not linked
    const firstName = name.split(' ')[0].toLowerCase();
    if (firstName.length < 3) continue; // skip ultra-short like "At" (shouldn't happen)
    // Also try a 2-word prefix (e.g. "above all" for "above all greenery")
    const twoWord = name.split(' ').slice(0, 2).join(' ').toLowerCase();
    const profilePath = `/guides/${slug}`;
    // Use word-boundary regex so "Puffin" doesn't match "Puffinburger"
    // and "Above" doesn't match "Above and Beyond". Match either
    // the full display name OR a 2-word prefix.
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedTwoWord = twoWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameRe = new RegExp(`\\b${escapedName}\\b|\\b${escapedTwoWord}\\b`, 'i');
    const linkRe = new RegExp(`href=["']${profilePath.replace(/\//g, '\\/')}["']`);
    const matchesName = nameRe.test(content);
    const linksToProfile = linkRe.test(content);
    if (matchesName && !linksToProfile) {
      // Find line numbers where the name appears
      const lines = content.split('\n');
      const lineNums = [];
      lines.forEach((line, idx) => {
        if (nameRe.test(line) && !linkRe.test(line)) {
          lineNums.push(idx + 1);
        }
      });
      missing.push({
        town: townFile,
        operator: slug,
        operatorName: name,
        lineNums: lineNums.slice(0, 5),
        totalMentions: lineNums.length,
      });
    }
  }
}

console.log(`\n=== MISSING INBOUND LINKS (${missing.length}) ===`);
if (missing.length === 0) {
  console.log('  None found. All operator profile pages have at least one inbound link from town guides.');
} else {
  for (const m of missing) {
    console.log(`  ${m.town} mentions "${m.operatorName}" (${m.totalMentions}x) but does NOT link to /guides/${m.operator}`);
    if (m.lineNums.length) {
      console.log(`    line(s): ${m.lineNums.join(', ')}`);
    }
  }
}