#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(process.env.HREF_CHECK_ROOT || path.resolve(__dirname, '../../src/pages'));
const badHrefPattern = /href=["']\\1["']?\)?/g;
const placeholderHrefPattern = /href\s*=\s*(['"])#\1/g;
const nonProductionPageDirs = new Set(['admin', 'experiments']);

function isProductionPage(file) {
  const relative = path.relative(root, file);
  const parts = relative.split(path.sep);
  return !parts.some((part) => nonProductionPageDirs.has(part));
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && full.endsWith('.astro')) out.push(full);
  }
  return out;
}

let failures = 0;
for (const file of walk(root)) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (badHrefPattern.test(line)) {
      failures += 1;
      console.error(`${path.relative(process.cwd(), file)}:${idx + 1}: malformed href left by regex replacement: ${line.trim()}`);
    }
    badHrefPattern.lastIndex = 0;

    if (isProductionPage(file) && placeholderHrefPattern.test(line)) {
      failures += 1;
      console.error(`${path.relative(process.cwd(), file)}:${idx + 1}: placeholder href="#" on production page: ${line.trim()}`);
    }
    placeholderHrefPattern.lastIndex = 0;
  });
}

if (failures) {
  console.error(`\nFound ${failures} blocked href(s). Replace each with a real route before shipping.`);
  process.exit(1);
}

console.log('No malformed \\1 hrefs or production href="#" placeholders found in Astro pages.');
