const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
const blogDir = path.join(repoRoot, 'apps', 'maine-cannabis', 'src', 'pages', 'blog');
const pillarPath = path.join(blogDir, 'maine-home-grow-cannabis-guide-2026.astro');
const medicalPath = path.join(blogDir, 'maine-medical-cannabis-patient-grow-guide.astro');

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

test('both pages cite current primary sources and avoid unsafe equivalence', () => {
  const combined = `${read(pillarPath)}\n${read(medicalPath)}`;
  assert.match(combined, /legislature\.maine\.gov\/statutes\/28-b\/title28-Bsec1502\.html/i);
  assert.match(combined, /legislature\.maine\.gov\/legis\/statutes\/22\/title22sec2423-A\.html/i);
  assert.doesNotMatch(combined, /medical (?:card|patient).{0,60}(?:allows?|may grow).{0,30}30 (?:mature )?plants/i);
  assert.doesNotMatch(combined, /adult-use and medical (?:plants|cultivation).{0,40}(?:same|identical) rules/i);
  assert.doesNotMatch(combined, /Last verified/i);
});
