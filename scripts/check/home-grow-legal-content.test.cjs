const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
const blogDir = path.join(repoRoot, 'apps', 'maine-cannabis', 'src', 'pages', 'blog');
const pillarPath = path.join(blogDir, 'maine-home-grow-cannabis-guide-2026.astro');
const medicalPath = path.join(blogDir, 'maine-medical-cannabis-patient-grow-guide.astro');
const distDir = path.join(repoRoot, 'dist', 'blog');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

test('home-grow pillar separates adult-use and medical law', () => {
  const source = read(pillarPath);
  assert.match(source, /28-B M\.R\.S\. §1502|Title 28-B[^<]*§1502/);
  assert.match(source, /22 M\.R\.S\. §2423-A|Title 22[^<]*§2423-A/);
  assert.match(source, /personal adult use/i);
  assert.match(source, /qualifying patient/i);
  assert.match(source, /combined allocation|whether cultivated by the patient or by a caregiver/i);
});

test('medical companion is patient-first and distinguishes caregiver limits', () => {
  assert.equal(fs.existsSync(medicalPath), true, 'medical companion route must exist');
  const source = read(medicalPath);
  assert.match(source, /6 mature cannabis plants/);
  assert.match(source, /12 immature cannabis plants/);
  assert.match(source, /unlimited (number of )?seedlings/);
  assert.match(source, /cultivation area/i);
  assert.match(source, /30 mature cannabis plants|500 square feet of mature plant canopy/);
  assert.match(source, /not the patient(?:’|')s personal plant allowance/i);
  assert.match(source, /does not maintain (?:any type of )?(?:a )?list or registry/i);
});

test('each page carries its controlling primary sources', () => {
  const pillar = read(pillarPath);
  const medical = read(medicalPath);
  assert.match(pillar, /legislature\.maine\.gov\/statutes\/28-b\/title28-Bsec1502\.html/i);
  assert.match(pillar, /legislature\.maine\.gov\/(?:legis\/)?statutes\/22\/title22sec2423-A\.html/i);
  assert.match(medical, /legislature\.maine\.gov\/(?:legis\/)?statutes\/22\/title22sec2423-A\.html/i);
  assert.match(medical, /legislature\.maine\.gov\/statutes\/22\/title22sec2430-C\.html/i);
});

test('mandatory routing, definitions, property, and scenario sections remain present', () => {
  const pillar = read(pillarPath);
  const medical = read(medicalPath);
  assert.match(pillar, /id="definitions"/);
  assert.match(pillar, /mature plant[\s\S]*immature plant[\s\S]*seedling[\s\S]*cultivation area[\s\S]*qualifying patient/i);
  assert.match(pillar, /id="common-scenarios"/);
  assert.match(pillar, /tenant(?:’|')s domicile[\s\S]*does not[\s\S]*resolve every/i);
  assert.match(pillar, /<th scope="col">Rule<\/th>/);
  assert.match(medical, /id="choose-your-path"/);
  assert.match(medical, /ordinary adult-use grower/i);
  assert.match(medical, /id="rentals-property-local-rules"/);
  assert.match(medical, /status protection[\s\S]*not[\s\S]*(?:blanket )?permission/i);
  assert.match(medical, /§2430-C\(3\)/);
});

test('publication metadata stays consistent and unsafe equivalence stays absent', () => {
  const pillar = read(pillarPath);
  const medical = read(medicalPath);
  const index = read(path.join(blogDir, 'index.astro'));
  const combined = `${pillar}\n${medical}`;
  assert.match(index, /maine-home-grow-cannabis-guide-2026[^\n]*date: '2026-04-18'/);
  assert.doesNotMatch(combined, /medical (?:card|patient).{0,60}(?:allows?|may grow).{0,30}30 (?:mature )?plants/i);
  assert.doesNotMatch(combined, /adult-use and medical (?:plants|cultivation).{0,40}(?:same|identical) rules/i);
  assert.doesNotMatch(combined, /Last verified/i);
});

test('built article metadata preserves calendar dates', () => {
  const pillarHtml = read(path.join(distDir, 'maine-home-grow-cannabis-guide-2026', 'index.html'));
  const medicalHtml = read(path.join(distDir, 'maine-medical-cannabis-patient-grow-guide', 'index.html'));
  assert.match(pillarHtml, /Published April 18, 2026/);
  assert.match(pillarHtml, /Updated July 16, 2026/);
  assert.doesNotMatch(pillarHtml, /Published April 17, 2026|Updated July 15, 2026/);
  assert.match(pillarHtml, /property="og:article:published_time" content="2026-04-18"/);
  assert.match(pillarHtml, /property="og:article:modified_time" content="2026-07-16"/);
  assert.match(pillarHtml, /"datePublished":"2026-04-18"/);
  assert.match(pillarHtml, /"dateModified":"2026-07-16"/);
  assert.match(medicalHtml, /Published July 16, 2026/);
  assert.doesNotMatch(medicalHtml, /Published July 15, 2026/);
  assert.match(medicalHtml, /property="og:article:published_time" content="2026-07-16"/);
  assert.match(medicalHtml, /property="og:article:modified_time" content="2026-07-16"/);
  assert.match(medicalHtml, /"datePublished":"2026-07-16"/);
  assert.match(medicalHtml, /"dateModified":"2026-07-16"/);
});
