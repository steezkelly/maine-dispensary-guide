#!/usr/bin/env node
/**
 * seo/audit-fix.cjs
 *
 * Automated SEO audit and fix pipeline for Maine Dispensary Guide.
 *
 * Usage:
 *   node scripts/seo/audit-fix.cjs                          # Full audit, dry-run
 *   node scripts/seo/audit-fix.cjs --apply                  # Apply auto-fixes
 *   node scripts/seo/audit-fix.cjs --fix meta              # Only fix meta issues
 *   node scripts/seo/audit-fix.cjs --fix links             # Only fix broken links
 *   node scripts/seo/audit-fix.cjs --url https://...       # Custom URL for squirrelscan
 *   node scripts/seo/audit-fix.cjs --format json           # JSON output
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Derive project root from __dirname (scripts/seo -> scripts -> project root)
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const PAGES_DIR = path.join(PROJECT_ROOT, 'apps', 'maine-cannabis', 'src', 'pages');

// SEO thresholds
const TITLE_MIN = 30;
const TITLE_MAX = 60;
const TITLE_TRUNCATE = 57;
const DESC_MIN = 70;
const DESC_MAX = 160;
const DESC_TRUNCATE = 155;

// Known link fixes (path -> replacement or null for flag-only)
const LINK_FIXES = {
  '/guides/maine-cannabis-laws/': '/guides/maine-cannabis-regulations/',
};

// Known missing pages (flag only, don't auto-fix)
const MISSING_PAGES = [
  '/guides/bath-dispensary-guide/',
  '/guides/topsham-dispensary-guide/',
];

// Glob pattern for astro files
const GLOB_PATTERN = 'apps/maine-cannabis/src/pages/**/*.astro';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract title and description from an .astro file's Layout tag
 */
function extractMeta(content) {
  const layoutMatch = content.match(/<Layout\s+([^>]+)>/);
  if (!layoutMatch) return null;

  const attrs = layoutMatch[1];

  const titleMatch = attrs.match(/title=["']([^"']+)["']/);
  const descMatch = attrs.match(/description=["']([^"']+)["']/);

  return {
    title: titleMatch ? titleMatch[1] : null,
    description: descMatch ? descMatch[1] : null,
  };
}

/**
 * Update title or description in the Layout tag
 */
function updateMeta(content, field, newValue) {
  const escapedValue = newValue.replace(/"/g, '&quot;');
  const attrPattern = new RegExp(`(${field}=["'])([^"']*)(["'])`);
  return content.replace(attrPattern, `$1${escapedValue}$3`);
}

/**
 * Truncate text to maxLen, preserving word boundary, add ellipsis if truncated
 */
function truncateForSEO(text, maxLen) {
  if (text.length <= maxLen) return text;

  // Try to truncate at word boundary
  let truncated = text.slice(0, maxLen);

  // Find last space within the truncated portion
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxLen * 0.7) {
    truncated = truncated.slice(0, lastSpace);
  }

  // Remove trailing punctuation except ellipsis marker
  truncated = truncated.replace(/[,.\-:;]+$/, '');

  return truncated.trim() + '…';
}

/**
 * Collect all internal href links from content
 */
function collectLinks(content) {
  const links = [];
  // Match href="..." or href='...' patterns
  const hrefRegex = /href=["']([^"']+)["']/g;
  let match;
  while ((match = hrefRegex.exec(content)) !== null) {
    links.push(match[1]);
  }
  return links;
}

/**
 * Check if a guide path exists as a file
 * allFiles is a Set of full paths with forward slashes
 */
function guideExists(guidePath, allFiles) {
  // Remove trailing slash and leading slash
  const cleanPath = guidePath.replace(/^\//, '').replace(/\/$/, '');

  // Try matching with various extensions - check if any file ends with the path
  for (const file of allFiles) {
    // Normalize file path for comparison
    const normalizedFile = file.replace(/\\/g, '/');
    // Check if file ends with cleanPath.astro or cleanPath/index.astro
    if (normalizedFile.endsWith('/' + cleanPath + '.astro') ||
        normalizedFile.endsWith('/' + cleanPath + '/index.astro')) {
      return true;
    }
    // Also check basename match
    const basename = path.basename(file, '.astro');
    if (basename === cleanPath) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// Core Logic
// ============================================================================

function runSquirrelscan(url, format = 'json') {
  try {
    const output = execSync(`npx squirrelscan audit ${url} --format ${format}`, {
      encoding: 'utf8',
      timeout: 120000,
      stdio: 'pipe',
    });
    return { success: true, data: output };
  } catch (err) {
    return { success: false, error: err.stdout || err.message };
  }
}

function scanAstroFiles() {
  const { globSync } = require('glob');
  // Use forward slashes for glob on Windows
  const pattern = path.join(PROJECT_ROOT, GLOB_PATTERN).replace(/\\/g, '/');
  const files = globSync(pattern);
  const fileSet = new Set(files.map(f => f.replace(/\\/g, '/')));
  return { files, fileSet };
}

function auditMeta(content, filePath, result) {
  const meta = extractMeta(content);
  if (!meta) {
    result.errors.push({ file: filePath, reason: 'No Layout component found' });
    return;
  }

  const relPath = filePath.replace(PROJECT_ROOT, '').replace(/\\/g, '/');

  // Check title
  if (meta.title) {
    if (meta.title.length > TITLE_MAX) {
      result.flagged.push({
        file: relPath,
        type: 'meta',
        issue: `Meta title too long (${meta.title.length}/${TITLE_MAX} chars)`,
        current: meta.title,
        suggested: truncateForSEO(meta.title, TITLE_TRUNCATE),
      });
    } else if (meta.title.length < TITLE_MIN) {
      result.flagged.push({
        file: relPath,
        type: 'meta',
        issue: `Meta title too short (${meta.title.length}/${TITLE_MIN} min)`,
        current: meta.title,
        suggested: null,
      });
    }

    // Check description
    if (meta.description) {
      if (meta.description.length > DESC_MAX) {
        result.flagged.push({
          file: relPath,
          type: 'meta',
          issue: `Meta description too long (${meta.description.length}/${DESC_MAX} chars)`,
          current: meta.description,
          suggested: truncateForSEO(meta.description, DESC_TRUNCATE),
        });
      } else if (meta.description.length < DESC_MIN) {
        result.flagged.push({
          file: relPath,
          type: 'meta',
          issue: `Meta description too short (${meta.description.length}/${DESC_MIN} min)`,
          current: meta.description,
          suggested: null,
        });
      }
    } else {
      // Missing description
      result.flagged.push({
        file: relPath,
        type: 'meta',
        issue: 'Missing meta description',
        current: null,
        suggested: `${meta.title} — Maine Dispensary Guide`,
      });
    }
  } else {
    result.errors.push({ file: relPath, reason: 'No title found in Layout' });
  }
}

function auditLinks(content, filePath, fileSet, result) {
  const relPath = filePath.replace(PROJECT_ROOT, '').replace(/\\/g, '/');
  const links = collectLinks(content);

  for (const link of links) {
    // Skip external links
    if (link.startsWith('http') || link.startsWith('//')) continue;

    // Skip anchors and mailto
    if (link.startsWith('#') || link.startsWith('mailto:')) continue;

    // Normalize link path
    let normalizedLink = link;
    if (normalizedLink.endsWith('/')) {
      normalizedLink = normalizedLink.slice(0, -1);
    }
    if (!normalizedLink.startsWith('/')) {
      normalizedLink = '/' + normalizedLink;
    }

    // Check for known auto-fix links
    if (LINK_FIXES[normalizedLink]) {
      result.flagged.push({
        file: relPath,
        type: 'link',
        issue: `Link should be updated`,
        current: normalizedLink,
        suggested: LINK_FIXES[normalizedLink],
        autoFixable: true,
      });
      continue;
    }

    // Check for trailing slash blog links
    if (normalizedLink === '/blog') {
      result.flagged.push({
        file: relPath,
        type: 'link',
        issue: 'Blog index link has trailing slash issue',
        current: link,
        suggested: null,
      });
      continue;
    }

    // Check for known missing pages (normalize by removing trailing slashes for comparison)
    const normalizedLinkNoSlash = normalizedLink.replace(/\/$/, '');
    const missingPageFound = MISSING_PAGES.some(missing =>
      missing.replace(/\/$/, '') === normalizedLinkNoSlash
    );
    if (missingPageFound) {
      result.flagged.push({
        file: relPath,
        type: 'link',
        issue: `Link to non-existent page (flagged: ${normalizedLink})`,
        current: normalizedLink,
        suggested: null,
      });
      continue;
    }

    // Check if guide link target exists
    if (normalizedLink.startsWith('/guides/') || normalizedLink.startsWith('/blog/') ||
        normalizedLink.startsWith('/founders/') || normalizedLink.startsWith('/about/') ||
        normalizedLink.startsWith('/resources/')) {

      // Skip self-referential links (same page links)
      const currentPage = relPath.replace(/^\//, '').replace(/\.astro$/, '');
      const linkTarget = normalizedLink.replace(/^\//, '');
      if (currentPage === linkTarget) {
        continue; // Self-reference is valid (e.g., navigation highlighting)
      }

      const exists = guideExists(normalizedLink, fileSet);
      if (!exists) {
        result.flagged.push({
          file: relPath,
          type: 'link',
          issue: `Broken internal link`,
          current: normalizedLink,
          suggested: null,
        });
      }
    }
  }
}

function applyMetaFix(filePath, issue, newValue) {
  const content = fs.readFileSync(filePath, 'utf8');
  const updated = updateMeta(content, issue.type === 'meta' && issue.issue.includes('title') ? 'title' : 'description', newValue);
  fs.writeFileSync(filePath, updated);
}

function applyLinkFix(filePath, oldLink, newLink) {
  const content = fs.readFileSync(filePath, 'utf8');
  const updated = content.replace(
    new RegExp(`href=["']${oldLink.replace(/\//g, '\\/')}["']`, 'g'),
    `href="${newLink}"`
  );
  fs.writeFileSync(filePath, updated);
}

function log(msg) {
  console.log(msg);
}

function logJSON(data) {
  console.log(JSON.stringify(data, null, 2));
}

// ============================================================================
// Main
// ============================================================================

function main() {
  const args = process.argv.slice(2);

  // Parse CLI args
  let mode = 'full'; // 'full', 'meta', 'links'
  let shouldApply = false;
  let customUrl = null;
  let outputFormat = 'text'; // 'text' or 'json'

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--apply') {
      shouldApply = true;
    } else if (args[i] === '--fix' && args[i + 1]) {
      mode = args[i + 1];
      i++;
    } else if (args[i] === '--url' && args[i + 1]) {
      customUrl = args[i + 1];
      i++;
    } else if (args[i] === '--format' && args[i + 1]) {
      outputFormat = args[i + 1];
      i++;
    } else if (args[i] === '--help') {
      log(`Usage: node scripts/seo/audit-fix.cjs [options]
Options:
  --apply           Apply auto-fixes (default is dry-run)
  --fix meta        Only fix meta issues
  --fix links       Only fix broken links
  --url https://... Custom URL for squirrelscan audit
  --format json     JSON output format
  --help            Show this help message`);
      process.exit(0);
    }
  }

  // Result tracking
  const result = {
    fixed: [],
    flagged: [],
    errors: [],
    timestamp: new Date().toISOString(),
  };

  log(`=== SEO Audit-Fix Pipeline ===`);
  log(`Mode: ${shouldApply ? 'APPLY' : 'DRY-RUN'}`);
  log(`Scope: ${mode}`);

  if (customUrl) {
    log(`URL: ${customUrl}`);
  }
  log('');

  try {
    // Scan files
    log('Scanning .astro files...');
    const { files, fileSet } = scanAstroFiles();
    log(`Found ${files.length} .astro files\n`);

    // Run squirrelscan if full mode
    if (mode === 'full' && customUrl) {
      log('Running squirrelscan audit...');
      const scanResult = runSquirrelscan(customUrl);
      if (scanResult.success) {
        log('Squirrelscan completed\n');
        // Try to parse JSON if available
        try {
          const parsed = JSON.parse(scanResult.data);
          result.squirrelscan = parsed;
        } catch {
          // Store raw output
          result.squirrelscanRaw = scanResult.data;
        }
      } else {
        log(`Squirrelscan warning: ${scanResult.error}\n`);
        result.errors.push({ source: 'squirrelscan', error: scanResult.error });
      }
    }

    // Audit each file
    log('Auditing meta tags and links...\n');

    for (const filePath of files) {
      const relPath = filePath.replace(PROJECT_ROOT, '').replace(/\\/g, '/');

      try {
        const content = fs.readFileSync(filePath, 'utf8');

        if (mode === 'full' || mode === 'meta') {
          auditMeta(content, filePath, result);
        }

        if (mode === 'full' || mode === 'links') {
          auditLinks(content, filePath, fileSet, result);
        }
      } catch (err) {
        result.errors.push({ file: relPath, reason: err.message });
      }
    }

    // Apply fixes if requested
    if (shouldApply) {
      log('Applying fixes...\n');

      for (const item of result.flagged) {
        if (item.type === 'meta' && item.suggested && item.suggested !== item.current) {
          const filePath = path.join(PROJECT_ROOT, item.file.replace(/^\//, ''));
          try {
            // Determine which field to update
            const field = item.issue.includes('title') ? 'title' : 'description';
            applyMetaFix(filePath, { ...item, type: 'meta' }, item.suggested);
            result.fixed.push({
              file: item.file,
              type: 'meta',
              action: `Updated ${field}`,
              from: item.current ? item.current.slice(0, 50) + (item.current.length > 50 ? '...' : '') : '(missing)',
              to: item.suggested.slice(0, 50) + (item.suggested.length > 50 ? '...' : ''),
            });
          } catch (err) {
            result.errors.push({ file: item.file, reason: `Failed to apply fix: ${err.message}` });
          }
        } else if (item.type === 'link' && item.suggested && item.autoFixable) {
          const filePath = path.join(PROJECT_ROOT, item.file.replace(/^\//, ''));
          try {
            applyLinkFix(filePath, item.current, item.suggested);
            result.fixed.push({
              file: item.file,
              type: 'link',
              action: 'Updated link',
              from: item.current,
              to: item.suggested,
            });
          } catch (err) {
            result.errors.push({ file: item.file, reason: `Failed to apply link fix: ${err.message}` });
          }
        }
      }
    }

    // Output results
    if (outputFormat === 'json') {
      logJSON(result);
    } else {
      // Human-readable output
      log('=== RESULTS ===\n');

      if (shouldApply && result.fixed.length > 0) {
        log(`✅ Fixed ${result.fixed.length} issue(s):`);
        for (const item of result.fixed) {
          log(`   ${item.file}: ${item.action} (${item.type})`);
        }
        log('');
      }

      if (result.flagged.length > 0) {
        log(`⚠️  Flagged ${result.flagged.length} issue(s) for review:`);
        for (const item of result.flagged) {
          const suggested = item.suggested ? ` → "${item.suggested.slice(0, 40)}${item.suggested.length > 40 ? '...' : ''}"` : '';
          const autoFix = item.autoFixable ? ' [AUTO-FIXABLE]' : '';
          log(`   ${item.file}: ${item.issue}${suggested}${autoFix}`);
        }
        log('');
      }

      if (result.errors.length > 0) {
        log(`❌ ${result.errors.length} error(s):`);
        for (const item of result.errors) {
          log(`   ${item.file || item.source}: ${item.reason || item.error}`);
        }
        log('');
      }

      log('=== SUMMARY ===');
      log(`Total files scanned: ${files.length}`);
      log(`Total fixed: ${result.fixed.length}`);
      log(`Total flagged: ${result.flagged.length}`);
      log(`Total errors: ${result.errors.length}`);
      log(`Timestamp: ${result.timestamp}`);

      if (!shouldApply) {
        log('\n[DRY-RUN] No changes were applied. Run with --apply to apply fixes.');
      }
    }

    // Exit code: 1 if fixes were applied, 0 otherwise
    if (shouldApply && result.fixed.length > 0) {
      process.exit(1);
    }

  } catch (err) {
    log(`Fatal error: ${err.message}`);
    if (outputFormat === 'json') {
      logJSON({ error: err.message, timestamp: result.timestamp });
    }
    process.exit(1);
  }
}

main();
