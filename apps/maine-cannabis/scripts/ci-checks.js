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
const HARDCODED_COLOR_PATTERN = /(?<![/\w])#[0-9A-Fa-f]{3,6}(?![/\w])/g;
const HARDCODED_URL_PATTERN = /https?:\/\/[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?!\/)/g;
const TRAILING_SLASH_PATTERN = /(?<![*?])\/$/gm;

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

  // Check for hardcoded site URLs for THIS site (not external links)
  // Only flag the site's own domain being hardcoded in non-config contexts
  const siteUrlPatterns = [
    'mainedispensaryguide.com',
    'mainedispensaryguide.co'  // common typo/variant
  ];
  content.split('\n').forEach((line, i) => {
    // Skip config files, JSON, and comments
    if (line.includes('site-config') || line.includes('//') || line.includes('/*')) return;
    siteUrlPatterns.forEach(domain => {
      if (line.includes(domain) && !line.includes('import ') && !line.includes('from ')) {
        // Check if it's not already using siteConfig
        if (!line.includes('siteConfig')) {
          issues.push(`L${i + 1}: Hardcoded site URL ${domain}`);
        }
      }
    });
  });

  // Check for trailing slashes in string literals (not regex)
  if (/\.(astro|ts)$/.test(filePath)) {
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (line.includes('regex') || line.includes('RegExp') || line.includes('pattern')) return;
      // Check for trailing slash in href or path contexts
      const trailingSlash = line.match(/\/[a-zA-Z0-9-]+\/"/);
      if (trailingSlash && !line.includes("'/") && !line.includes('"/')) {
        issues.push(`L${i + 1}: Possible trailing slash`);
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
