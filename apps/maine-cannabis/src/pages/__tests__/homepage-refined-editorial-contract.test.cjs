const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const home = path.resolve(__dirname, '../index.astro');
const source = fs.readFileSync(home, 'utf8');

function sectionId(id) {
  const regex = new RegExp(`<section[^>]*id="${id}"[\\s\\S]*?<\\/section>`, 'm');
  const match = source.match(regex);
  return match ? match[0] : '';
}

test('homepage includes the authority-hero content section', () => {
  const section = sectionId('authority-hero');
  assert.match(section, /<AuthorityHero[\s\S]*?\/>/);
});

test('homepage includes the evidence-strip content section', () => {
  assert.match(source, /<section id="evidence-strip"[\s\S]*?<EvidenceStrip items=\{evidence\} \/>/);
});

test('homepage includes the operator-pathways content section', () => {
  assert.match(source, /<section id="operator-pathways"[\s\S]*?<OperatorPathways pathways=\{pathways\} \/>/);
});

test('homepage includes the featured-analysis content section', () => {
  assert.match(source, /<section id="featured-analysis"[\s\S]*?<FeaturedAnalysis story=\{featuredStory\} \/>/);
});

test('homepage includes the municipality-explorer content section', () => {
  assert.match(source, /<section id="municipality-explorer"[\s\S]*?<MunicipalityExplorer rows=\{municipalities\} \/><MaineMapReference \/>/);
});

test('homepage includes the latest-intelligence content section', () => {
  assert.match(source, /<section id="latest-intelligence"[\s\S]*?<LatestIntelligence items=\{intelligence\} \/>/);
});

test('homepage includes the newsletter-invitation content section', () => {
  assert.match(source, /<section id="newsletter-invitation"[\s\S]*?<NewsletterInvitation submitCtaId="cta-inline-index-10" \/>/);
});

test('homepage includes the trust-layer content section', () => {
  assert.match(source, /<section id="trust-layer"[\s\S]*?<TrustLayer sourceLinks=\{[\s\S]*?\} \/>/);
});

test('homepage content sections appear in the canonical exact order', () => {
  const order = [
    'authority-hero',
    'evidence-strip',
    'operator-pathways',
    'featured-analysis',
    'municipality-explorer',
    'latest-intelligence',
    'newsletter-invitation',
    'trust-layer',
  ];
  const positions = order.map((id) => source.indexOf(`id="${id}"`));
  assert.ok(positions.every((pos) => pos !== -1), 'all required sections must be present');
  const sorted = [...positions].sort((a, b) => a - b);
  assert.deepEqual(positions, sorted);
});

test('homepage removes the retired composition', () => {
  assert.doesNotMatch(source, /import[\s\S]*?from\s+['"][^'"]*(?:AnimatedBackdrop|SiteHealthStrip)[^'"]*['"]|<(?:AnimatedBackdrop|SiteHealthStrip)\b|\b(?:tour-carousel|mission-manifesto|journey-detail)\b/);
});

test('homepage source owns exactly one H1', () => {
  const h1Count = (source.match(/<h1\b/g) || []).length;
  assert.equal(h1Count, 1);
});