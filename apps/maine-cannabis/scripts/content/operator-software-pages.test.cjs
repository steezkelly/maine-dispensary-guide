'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const repoRoot = path.resolve(__dirname, '../../../..');
const registryPath = path.join(repoRoot, 'apps/maine-cannabis/src/data/operator-software.ts');

async function loadRegistry() {
  return import(`${pathToFileURL(registryPath).href}?test=${Date.now()}`);
}

test('operator software registry exposes six categories and six vendor profiles', async () => {
  const { softwareEntries } = await loadRegistry();
  assert.equal(softwareEntries.length, 12);
  assert.equal(new Set(softwareEntries.map((entry) => entry.slug)).size, 12);

  const categorySlugs = softwareEntries
    .filter((entry) => entry.kind === 'category')
    .map((entry) => entry.slug)
    .sort();
  assert.deepEqual(categorySlugs, [
    'cannabis-compliance',
    'cannabis-crm-loyalty',
    'cannabis-market-intelligence',
    'cannabis-wholesale-marketplaces',
    'dispensary-ecommerce-menus',
    'seed-to-sale-erp',
  ].sort());

  const vendorSlugs = softwareEntries
    .filter((entry) => entry.kind === 'vendor')
    .map((entry) => entry.slug)
    .sort();
  assert.deepEqual(vendorSlugs, ['aiq', 'canix', 'cova', 'dutchie', 'flourish', 'flowhub']);
});

test('every software entry has decision content, FAQs, sources, current related routes, and a current review date', async () => {
  const { softwareEntries } = await loadRegistry();
  const slugs = new Set(softwareEntries.map((entry) => entry.slug));
  for (const entry of softwareEntries) {
    assert.match(entry.reviewedDate, /^2026-07-\d{2}$/, `${entry.slug} reviewedDate`);
    assert.ok(entry.answer.length >= 120, `${entry.slug} needs an answer-first summary`);
    assert.ok(entry.sections.length >= 3, `${entry.slug} needs at least three sections`);
    assert.ok(entry.faqs.length >= 3, `${entry.slug} needs at least three FAQs`);
    assert.ok(entry.sources.length >= 2, `${entry.slug} needs at least two official sources`);
    for (const relatedSlug of entry.relatedSlugs) {
      assert.ok(slugs.has(relatedSlug), `${entry.slug} links to missing related slug ${relatedSlug}`);
    }
    for (const source of entry.sources) {
      assert.match(source.url, /^https:\/\//, `${entry.slug} source must be HTTPS`);
      assert.match(source.accessed, /^2026-07-\d{2}$/, `${entry.slug} source accessed date`);
    }
  }
});

test('referral program states match the reviewed evidence and never imply an active MDG commercial relationship', async () => {
  const { softwareEntries } = await loadRegistry();
  const allowedKinds = new Set(['cash-referral', 'customer-credit', 'partner-application', 'none']);
  for (const entry of softwareEntries) {
    if (!entry.referral) continue;
    assert.ok(allowedKinds.has(entry.referral.kind), `${entry.slug} referral kind`);
    assert.equal(entry.referral.mdgRelationship, 'inactive', `${entry.slug} relationship must be inactive`);
    if (entry.referral.kind === 'cash-referral') {
      assert.ok(entry.referral.officialUrl, `${entry.slug} cash referral needs official source`);
      assert.match(entry.referral.summary, /\$|cash|paid|reward/i, `${entry.slug} cash summary`);
    }
  }

  const bySlug = new Map(softwareEntries.map((entry) => [entry.slug, entry]));
  const expectedKinds = {
    flowhub: 'cash-referral',
    dutchie: 'cash-referral',
    cova: 'customer-credit',
    aiq: 'cash-referral',
    canix: 'customer-credit',
    flourish: 'partner-application',
  };
  for (const [slug, kind] of Object.entries(expectedKinds)) {
    assert.equal(bySlug.get(slug)?.referral.kind, kind, `${slug} referral classification`);
  }
  assert.match(bySlug.get('aiq')?.referral.summary ?? '', /\$100 per retail store/i);
  assert.match(bySlug.get('aiq')?.referral.summary ?? '', /\$500 per brand account/i);
  assert.equal(
    bySlug.get('flourish')?.referral.officialUrl,
    'https://www.flourishsoftware.com/legal/partner-program-terms-and-conditions'
  );
  assert.ok(bySlug.get('flowhub')?.sources.some((source) => source.url === 'https://www.flowhub.com/markets/maine'));
  assert.ok(!bySlug.get('flowhub')?.sources.some((source) => source.url.includes('/states/maine')));
});

test('every vendor profile publishes differentiated evidence, pricing status, and the no-hands-on-testing boundary', async () => {
  const { softwareEntries, formatReviewMonth } = await loadRegistry();
  const vendors = softwareEntries.filter((entry) => entry.kind === 'vendor');
  assert.equal(formatReviewMonth('2026-07-21'), 'July 2026');
  for (const vendor of vendors) {
    assert.ok(vendor.evidence, `${vendor.slug} needs a public evidence snapshot`);
    assert.match(vendor.evidence.pricingStatus, /pricing|price|quote/i, `${vendor.slug} pricing status`);
    assert.ok(vendor.evidence.publicEvidence.length >= 2, `${vendor.slug} needs differentiated public evidence`);
    assert.match(vendor.evidence.evaluationStatus, /not.*hands-on tested/i, `${vendor.slug} testing boundary`);
  }
});

test('software directory route files and shared page component exist', () => {
  const requiredFiles = [
    'apps/maine-cannabis/src/components/OperatorSoftwarePage.astro',
    'apps/maine-cannabis/src/pages/software/index.astro',
    'apps/maine-cannabis/src/pages/software/[slug].astro',
  ];
  for (const relativePath of requiredFiles) {
    assert.ok(fs.existsSync(path.join(repoRoot, relativePath)), `${relativePath} must exist`);
  }
});

test('hub and detail templates contain disclosure, source, and canonical internal-link contracts', () => {
  const detail = fs.readFileSync(path.join(repoRoot, 'apps/maine-cannabis/src/components/OperatorSoftwarePage.astro'), 'utf8');
  const hub = fs.readFileSync(path.join(repoRoot, 'apps/maine-cannabis/src/pages/software/index.astro'), 'utf8');
  const dynamicRoute = fs.readFileSync(path.join(repoRoot, 'apps/maine-cannabis/src/pages/software/[slug].astro'), 'utf8');
  assert.match(detail, /No active MDG commercial relationship/i);
  assert.match(detail, /Sources/);
  assert.doesNotMatch(detail, /AffiliateClickTracker/);
  assert.match(detail, /Reviewed \{reviewedLabel\}/);
  assert.match(dynamicRoute, /softwareEntries\.map/);
  assert.match(dynamicRoute, /title:\s*'Maine Cannabis Software Guides'/);
  assert.match(dynamicRoute, /const topics = \['operator-guide', 'software'\]/);
  assert.match(hub, /\/guides\/maine-cannabis-pos-comparison/);
  assert.match(hub, /softwareCategories/);
  assert.match(hub, /softwareVendors/);
  assert.match(hub, /title:\s*'Maine Cannabis Software Directory'/);
  assert.match(hub, /const topics = \['operator-guide', 'software'\]/);
  assert.match(hub, /Reviewed \{formatReviewMonth\(vendor\.reviewedDate\)\}/);
  assert.doesNotMatch(hub, /<main\b/i, 'Layout already owns the page main landmark');
});

test('existing operator guides link into the software directory and do not repeat stale referral terms', () => {
  const pos = fs.readFileSync(path.join(repoRoot, 'apps/maine-cannabis/src/pages/guides/maine-cannabis-pos-comparison.astro'), 'utf8');
  const vendorDirectory = fs.readFileSync(path.join(repoRoot, 'apps/maine-cannabis/src/pages/guides/maine-cannabis-vendor-directory.astro'), 'utf8');

  assert.match(pos, /href="\/software"/);
  assert.match(pos, /href="\/software\/flowhub"/);
  assert.match(pos, /href="\/software\/dutchie"/);
  assert.match(pos, /href="\/software\/cova"/);
  assert.doesNotMatch(pos, /Cova's published customer referral program pays \$500/);
  assert.match(pos, /\$400 monthly-bill credit/);
  assert.doesNotMatch(pos, /Every vendor below integrates with Maine's Metrc/);
  assert.doesNotMatch(pos, /All seven claim native \(direct-API\) Metrc integration/);
  assert.doesNotMatch(pos, /Yes\. Every vendor profiled here/);
  assert.match(pos, /Jane's public vendor materials reviewed for this guide did not confirm direct Metrc integration/);

  assert.match(vendorDirectory, /href="\/software"/);
  assert.doesNotMatch(vendorDirectory, /Most charge \$79-300 monthly/);
  assert.match(vendorDirectory, /"@context":"https:\/\/schema\.org"/);
});
