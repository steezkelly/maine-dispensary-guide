const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..', '..');
const dashboardPage = path.join(ROOT, 'apps', 'maine-cannabis', 'src', 'pages', 'admin', 'email-dashboard.astro');
const autoRelatedData = path.join(ROOT, 'apps', 'maine-cannabis', 'src', 'data', 'autoRelatedData.json');

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
