const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..', '..');
const dashboardPage = path.join(ROOT, 'apps', 'maine-cannabis', 'src', 'pages', 'admin', 'email-dashboard.astro');
const autoRelatedData = path.join(ROOT, 'apps', 'maine-cannabis', 'src', 'data', 'autoRelatedData.json');
const ciWorkflow = path.join(ROOT, '.github', 'workflows', 'ci.yml');

function withoutYamlComments(source) {
  return source
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith('#'))
    .join('\n');
}

test('public email dashboard is retired and absent from related data', () => {
  assert.equal(
    fs.existsSync(dashboardPage),
    false,
    'the unauthenticated /admin/email-dashboard static route must not have a page source',
  );

  const related = fs.readFileSync(autoRelatedData, 'utf8');
  assert.doesNotMatch(
    related,
    /"url"\s*:\s*"\/admin\/email-dashboard"/,
    'generated related data must not link to the retired public dashboard',
  );
});

test('dashboard-retirement regression is required by CI', () => {
  const ci = withoutYamlComments(fs.readFileSync(ciWorkflow, 'utf8'));
  assert.match(
    ci,
    /- name: Test public dashboard retirement regression[\s\S]*?^\s+run: node --test scripts\/check\/admin-dashboard-retirement\.test\.cjs\s*$/m,
    'the required Build job must execute the dashboard-retirement regression',
  );
});
