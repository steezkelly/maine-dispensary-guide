// Script to add Nearby Markets sections to city guide orphans
const fs = require('fs');
const path = require('path');

const projectRoot = 'C:\\Users\\Steve\\OpenCode Projects\\project-1';

// Geographic neighbors for each city
const cityNeighbors = {
  'auburn': [
    { city: 'Lewiston', distance: '3 miles', href: '/guides/lewiston-dispensary-guide/', notes: 'Connected via Memorial Bridge, same metro market' },
    { city: 'Brunswick', distance: '28 miles', href: '/guides/brunswick-dispensary-guide/', notes: 'Coastal market, Bowdoin College' },
    { city: 'Portland', distance: '30 miles', href: '/guides/portland-dispensary-guide/', notes: 'Largest Maine market' }
  ],
  'bangor': [
    { city: 'Waterville', distance: '30 miles', href: '/guides/waterville-dispensary-guide/', notes: 'Central Maine hub' },
    { city: 'Lewiston', distance: '50 miles', href: '/guides/lewiston-dispensary-guide/', notes: 'Second-largest market' },
    { city: 'Brewer', distance: '3 miles', href: '/guides/bangor-dispensary-guide/', notes: 'Part of Bangor metro' }
  ],
  'biddeford': [
    { city: 'Saco', distance: '4 miles', href: '/guides/saco-dispensary-guide/', notes: 'Adjacent coastal market' },
    { city: 'Portland', distance: '15 miles', href: '/guides/portland-dispensary-guide/', notes: 'Largest Maine market' },
    { city: 'Kittery', distance: '40 miles', href: '/guides/kittery-dispensary-guide/', notes: 'Southern Maine, I-95 corridor' }
  ],
  'kittery': [
    { city: 'Portsmouth', distance: '2 miles', href: '/guides/portland-dispensary-guide/', notes: 'Cross-border New Hampshire market' },
    { city: 'Biddeford', distance: '40 miles', href: '/guides/biddeford-dispensary-guide/', notes: 'York County market' },
    { city: 'Sanford', distance: '20 miles', href: '/guides/sanford-dispensary-guide/', notes: 'York County opportunity' }
  ],
  'saco': [
    { city: 'Biddeford', distance: '4 miles', href: '/guides/biddeford-dispensary-guide/', notes: 'Adjacent coastal market' },
    { city: 'Portland', distance: '15 miles', href: '/guides/portland-dispensary-guide/', notes: 'Largest Maine market' },
    { city: 'Old Orchard Beach', distance: '8 miles', href: '/guides/old-orchard-beach-dispensary-guide/', notes: 'Tourist market, seasonal traffic' }
  ],
  'sanford': [
    { city: 'Biddeford', distance: '12 miles', href: '/guides/biddeford-dispensary-guide/', notes: 'York County hub' },
    { city: 'Kittery', distance: '20 miles', href: '/guides/kittery-dispensary-guide/', notes: 'Southern Maine corridor' },
    { city: 'Portland', distance: '45 miles', href: '/guides/portland-dispensary-guide/', notes: 'Largest Maine market' }
  ],
  'waterville': [
    { city: 'Lewiston', distance: '30 miles', href: '/guides/lewiston-dispensary-guide/', notes: 'Second-largest market' },
    { city: 'Augusta', distance: '20 miles', href: '/guides/augusta-dispensary-guide/', notes: 'State capital, central Maine' },
    { city: 'Bangor', distance: '30 miles', href: '/guides/bangor-dispensary-guide/', notes: 'Northern hub, third-largest market' }
  ]
};

function buildNearbyMarketsSection(cityName, slug) {
  const neighbors = cityNeighbors[slug];
  if (!neighbors) return '';

  const tableRows = neighbors.map(n =>
    `<tr><td>${n.city}</td><td>${n.distance}</td><td><a href="${n.href}">${n.city} Guide</a></td><td>${n.notes}</td></tr>`
  ).join('');

  return `<section> <h2>Nearby Markets</h2> <p>Maine's dispensary market extends across the state. The following nearby cities offer additional opportunity or represent competitive markets worth understanding.</p> <table aria-label="Nearby dispensary guide opportunities"> <thead> <tr><th>City</th><th>Distance</th><th>Guide</th><th>Notes</th></tr> </thead> <tbody> ${tableRows} </tbody> </table> </section>`;
}

function addNearbyMarketsToFile(filePath, cityName, slug) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Check if it already has Nearby Markets section
  if (content.includes('Nearby Markets')) {
    console.log(`  SKIP: ${cityName} already has Nearby Markets`);
    return false;
  }

  const section = buildNearbyMarketsSection(cityName, slug);
  if (!section) {
    console.log(`  SKIP: No neighbor data for ${cityName}`);
    return false;
  }

  // Insert before the last </section> tag before the style block
  // Find the pattern: </section> followed by <section class="disclaimer">
  // or just before </article>
  const insertBefore = '</section> <section class="disclaimer">';
  if (content.includes(insertBefore)) {
    content = content.replace(insertBefore, section + ' <section class="disclaimer">');
  } else if (content.includes('<section class="disclaimer">')) {
    content = content.replace('<section class="disclaimer">', section + ' <section class="disclaimer">');
  } else if (content.includes('</article>')) {
    content = content.replace('</article>', section + ' </article>');
  }

  fs.writeFileSync(filePath, content);
  return true;
}

// Process orphan city guides
const orphanCities = {
  'auburn-dispensary-guide': 'Auburn',
  'bangor-dispensary-guide': 'Bangor',
  'biddeford-dispensary-guide': 'Biddeford',
  'kittery-dispensary-guide': 'Kittery',
  'saco-dispensary-guide': 'Saco',
  'sanford-dispensary-guide': 'Sanford',
  'waterville-dispensary-guide': 'Waterville'
};

console.log('Adding Nearby Markets sections to orphan city guides...\n');

let modified = 0;
for (const [fileName, cityName] of Object.entries(orphanCities)) {
  const slug = fileName.replace('-dispensary-guide', '');
  const filePath = path.join(projectRoot, 'src/pages/guides', fileName + '.astro');
  if (fs.existsSync(filePath)) {
    const changed = addNearbyMarketsToFile(filePath, cityName, slug);
    if (changed) {
      console.log(`  MODIFIED: ${cityName} - Added Nearby Markets section`);
      modified++;
    }
  } else {
    console.log(`  NOT FOUND: ${filePath}`);
  }
}

console.log(`\nDone. Modified ${modified} files.`);
