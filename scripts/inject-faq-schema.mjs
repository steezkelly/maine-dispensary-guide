#!/usr/bin/env node
/**
 * inject-faq-schema.mjs v2
 * Walks apps/maine-cannabis/src/pages, extracts <details>/<summary>/<p> FAQ
 * pairs, injects FAQPage schema into Astro files.
 *
 * Correct frontmatter handling: inserts const line just BEFORE the closing ---.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const PAGES_DIR = join(process.cwd(), 'apps/maine-cannabis/src/pages');

const SKIP = new Set([
  'admin/link-dashboard.astro',
  'admin/seo-dashboard.astro',
  'site-health.astro',
  'newsletter.astro',
  'privacy.astro',
]);

function extractFaqs(html) {
  const faqs = [];
  const re = /<details[^>]*>\s*<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>\s*<\/details>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const name = m[1].replace(/<[^>]+>/g, '').trim();
    const text = m[2].replace(/<[^>]+>/g, '').trim();
    if (name && name.length > 3) faqs.push({ name, text });
  }
  return faqs;
}

async function processFile(filePath) {
  const relPath = relative(PAGES_DIR, filePath);
  const content = await readFile(filePath, 'utf-8');
  if (SKIP.has(relPath)) { console.log(`SKIP  ${relPath}`); return; }
  if (content.includes('FAQPage')) { console.log(`OK    ${relPath}`); return; }
  const faqs = extractFaqs(content);
  if (faqs.length === 0) { console.log(`NO FAQs  ${relPath}`); return; }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.name,
      acceptedAnswer: { '@type': 'Answer', text: f.text },
    })),
  };
  const jsonLd = JSON.stringify(faqSchema);
  const faqConst = `const faqPageJsonLd = JSON.stringify(${jsonLd});`;

  // Find the closing --- of the frontmatter block
  // Content always starts with ---\n or --- then content then \n---
  const firstDash = content.indexOf('---');
  if (firstDash === -1) { console.log(`NO FM ${relPath}`); return; }
  // Find closing --- after first 3 chars
  const closeDash = content.indexOf('---', firstDash + 3);
  if (closeDash === -1) { console.log(`NO CLOSE FM ${relPath}`); return; }

  // Insert the const line just before the closing ---
  let newContent = content.substring(0, closeDash) + faqConst + '\n' + content.substring(closeDash);

  // Add <script> after </Layout>
  const layoutClose = newContent.lastIndexOf('</Layout>');
  if (layoutClose === -1) { console.log(`NO </Layout> ${relPath}`); return; }
  const script = '<script type="application/ld+json" set:text={faqPageJsonLd} is:inline></script>';
  newContent = newContent.substring(0, layoutClose + 9) + ' ' + script + '\n' + newContent.substring(layoutClose + 9);

  await writeFile(filePath, newContent, 'utf-8');
  console.log(`INJ   ${relPath}  (${faqs.length} FAQs)`);
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) await walk(full);
    else if (e.name.endsWith('.astro')) await processFile(full);
  }
}

await walk(PAGES_DIR);
