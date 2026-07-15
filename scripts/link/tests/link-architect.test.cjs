const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { linkGlossaryTerms, run } = require('../link-architect.cjs');

test('linkGlossaryTerms skips files without a rendered </head> marker', () => {
  const source = '---\nconst title = "Metrc";\n---\n<Layout><p>Metrc appears here.</p></Layout>';
  const result = linkGlossaryTerms(source);

  assert.equal(result.modified, false);
  assert.equal(result.skipped, true);
  assert.equal(result.content, source);
  assert.match(result.reason, /missing <\/head>/);
});

test('run reports failure when every candidate is skipped for missing </head>', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-link-'));
  const previousExitCode = process.exitCode;
  process.exitCode = undefined;

  try {
    fs.writeFileSync(path.join(tmp, 'guide.astro'), '<p>Metrc body without head marker.</p>');
    const messages = [];
    const result = run({
      pagesDir: tmp,
      logger: {
        log: (message) => messages.push(String(message)),
        warn: (message) => messages.push(String(message)),
      },
    });

    assert.equal(result.modifiedCount, 0);
    assert.equal(result.skippedMissingHeadCount, 1);
    assert.equal(process.exitCode, 1);
    assert.match(messages.join('\n'), /Skipped: guide\.astro/);
  } finally {
    process.exitCode = previousExitCode;
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('linkGlossaryTerms modifies only body content after </head>', () => {
  const source = '<html><head><title>Metrc</title></head><body><p>Use Metrc compliance.</p></body></html>';
  const result = linkGlossaryTerms(source);

  assert.equal(result.modified, true);
  assert.equal(result.skipped, false);
  assert.match(result.content, /<title>Metrc<\/title>/);
  assert.match(result.content, /Use <a href="\/glossary\/#metrc">Metrc<\/a> compliance/);
});
