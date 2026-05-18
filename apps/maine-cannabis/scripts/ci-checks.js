/**
 * CI Invariant Checks
 * Runs on every PR to enforce network quality standards
 */

import { readFileSync, readdirSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const srcDir = join(__dirname, '..', 'src');

// Patterns that indicate hardcoded values (not in data/config files)
const HARDCODED_COLOR_PATTERN = /(?<![&/\w])#[0-9A-Fa-f]{3,8}(?![/\w])/g;
const SITE_URL_PATTERN = /https?:\/\/(?:www\.)?mainedispensaryguide\.(?:com|co)\b/g;

// Files to skip
const SKIP_PATTERNS = /node_modules|\.git|dist|\.astro\/|packages\//;

let exitCode = 0;

function checkFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const relPath = filePath.replace(srcDir, '');

  // Skip non-checkable files
  if (SKIP_PATTERNS.test(relPath)) return;
  if (extname(filePath) === '.json') return; // JSON files have legitimate URLs

  const issues = [];

  // Check for hardcoded colors in .astro and .ts files (not CSS vars)
  if (/\.(astro|ts|tsx)$/.test(filePath)) {
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      // Skip lines that define CSS variables or are in style blocks
      if (line.includes('--color-') || line.includes(':root') || line.includes('[data-theme')) return;

      // Look for hardcoded hex colors that are not part of var() or comment
      const hexMatches = line.match(HARDCODED_COLOR_PATTERN);
      if (hexMatches) {
        hexMatches.forEach(match => {
          // Skip if it's part of a CSS variable or URL or comment
          if (line.includes(`var(--`) || line.includes('//') || line.includes('/*')) return;
          // Filter out common false positives like version numbers
          if (/^\d+\.\d+/.test(match)) return;
          issues.push(`L${i + 1}: Hardcoded color ${match}`);
        });
      }
    });
  }

  // Check for hardcoded absolute URLs for THIS site (not email addresses or external links).
  // The canonical site URL belongs in site-config.json and should be referenced via siteConfig/siteUrl.
  content.split('\n').forEach((line, i) => {
    // Skip config imports/comments and generated JSON-LD constants already using siteConfig/siteUrl.
    if (line.includes('site-config') || line.includes('//') || line.includes('/*')) return;
    const siteUrlMatches = line.match(SITE_URL_PATTERN);
    if (siteUrlMatches && !line.includes('siteConfig') && !line.includes('siteUrl')) {
      siteUrlMatches.forEach(match => {
        issues.push(`L${i + 1}: Hardcoded site URL ${match}`);
      });
    }
  });

  // Check for trailing slashes on internal route attributes (not regexes, external URLs, or pathname prefix checks).
  // Match markup such as href="/about/" or action='/contact/'.
  if (/\.(astro|ts)$/.test(filePath)) {
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (line.includes('regex') || line.includes('RegExp') || line.includes('pattern')) return;
      if (line.includes('//') || line.includes('/*')) return;

      const internalTrailingSlashMatches = line.match(/\b(?:href|action)=(["'`])\/[^"'`?#]*[A-Za-z0-9-]\/\1/g);
      if (internalTrailingSlashMatches) {
        internalTrailingSlashMatches.forEach(match => {
          issues.push(`L${i + 1}: Internal route has trailing slash ${match}`);
        });
      }
    });
  }

  if (issues.length > 0) {
    console.log(`\n❌ ${relPath}`);
    issues.forEach(issue => console.log(`   ${issue}`));
    exitCode = 1;
  }
}

function walkDir(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (/\.(astro|ts|tsx|js)$/.test(entry.name)) {
      checkFile(fullPath);
    }
  }
}

console.log('🔍 Running CI invariant checks...');
walkDir(srcDir);

if (exitCode === 0) {
  console.log('✅ All invariant checks passed');
} else {
  console.log('\n⚠️  Fix these issues before merging');
}

process.exit(exitCode);
