#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

function maskNonMarkup(source) {
  return source.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, (block) => ' '.repeat(block.length));
}

function findStrayAutoRelatedDivs(source) {
  const markup = maskNonMarkup(source);
  const tagPattern = /<\/?([A-Za-z][\w:-]*)\b[^>]*>/g;
  const stack = [];
  const removals = [];
  let match;

  while ((match = tagPattern.exec(markup))) {
    const raw = match[0];
    const tag = match[1].toLowerCase();
    const closing = raw.startsWith('</');
    const selfClosing = /\/\s*>$/.test(raw);

    if (closing) {
      if (stack.at(-1) === tag) stack.pop();
      continue;
    }

    if (tag === 'autorelated' && selfClosing) {
      const following = markup.slice(tagPattern.lastIndex);
      const next = /^\s*(<\/div\s*>)(\s*<\/section\s*>)/i.exec(following);
      if (next && stack.at(-1) === 'section') {
        removals.push(tagPattern.lastIndex + next[0].indexOf(next[1]));
      }
      continue;
    }

    if (!selfClosing) stack.push(tag);
  }

  return removals;
}

function repairSource(source) {
  const offsets = findStrayAutoRelatedDivs(source).sort((a, b) => b - a);
  let repaired = source;
  for (const offset of offsets) {
    const closing = /^<\/div\s*>/i.exec(repaired.slice(offset));
    if (!closing) throw new Error(`Expected closing div at offset ${offset}`);
    repaired = repaired.slice(0, offset) + repaired.slice(offset + closing[0].length);
  }
  return { repaired, count: offsets.length };
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const resolved = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(resolved) : [resolved];
  });
}

function main() {
  const apply = process.argv.includes('--apply');
  const pages = path.resolve(process.cwd(), 'apps/maine-cannabis/src/pages');
  const changed = [];
  for (const file of walk(pages).filter((file) => file.endsWith('.astro'))) {
    const source = fs.readFileSync(file, 'utf8');
    const { repaired, count } = repairSource(source);
    if (!count) continue;
    changed.push({ file: path.relative(process.cwd(), file), count });
    if (apply) fs.writeFileSync(file, repaired);
  }
  for (const item of changed) console.log(`${apply ? 'fixed' : 'would fix'} ${item.file}: ${item.count}`);
  console.log(`${apply ? 'fixed' : 'would fix'} ${changed.length} file(s)`);
}

module.exports = { findStrayAutoRelatedDivs, repairSource };
if (require.main === module) main();
