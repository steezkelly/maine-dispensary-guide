const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '../../apps/maine-cannabis/src');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const resolved = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(resolved) : [resolved];
  });
}

function stripFrontmatter(source) {
  if (!source.startsWith('---')) return source;
  const match = /\n---[ \t]*(?:\r?\n|$)/.exec(source);
  return match ? source.slice(match.index + match[0].length) : source;
}

function stripInert(source) {
  return source.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, (block) => ' '.repeat(block.length));
}

function stripExpressions(source) {
  // Mask single-line JSX expressions so JS string/regex content cannot fake tags.
  return source.replace(/\{[^\n{}]*\}/g, (block) => ' '.repeat(block.length));
}

test('every Layout opening tag is closed in the same template', () => {
  const offenders = walk(path.join(appRoot, 'pages'))
    .filter((file) => file.endsWith('.astro'))
    .filter((file) => {
      const body = stripExpressions(stripInert(stripFrontmatter(fs.readFileSync(file, 'utf8'))));
      const opens = (body.match(/<Layout\b/g) || []).length;
      const closes = (body.match(/<\/Layout\s*>/g) || []).length;
      return opens !== closes;
    });
  assert.deepEqual(offenders, []);
});

test('no root-position HTML comment sits directly inside a map() arrow body', () => {
  const offenders = [];
  for (const file of walk(appRoot).filter((f) => f.endsWith('.astro'))) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/\{[A-Za-z_$][\w$.]*\.map\([^;]*?=>\s*\(/g)) {
      const after = source.slice(match.index + match[0].length, match.index + match[0].length + 120).trimStart();
      if (after.startsWith('<!--')) offenders.push(file);
    }
  }
  assert.deepEqual(offenders, []);
});
