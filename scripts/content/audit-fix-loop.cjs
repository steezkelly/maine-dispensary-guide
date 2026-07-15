/**
 * audit-fix-loop.cjs
 *
 * Audits content quality and optionally auto-fixes mechanical metadata issues.
 *
 * WARNING: Body-content expansion, boilerplate paragraphs, and FAQ copy must be
 * drafted from source material and editorially reviewed before publication. This
 * script intentionally keeps thin-content audits diagnostic unless a human has
 * supplied and reviewed a content patch outside this automation.
 *
 * Usage:
 *   node scripts/content/audit-fix-loop.cjs                    # Dry-run: report only
 *   node scripts/content/audit-fix-loop.cjs --apply           # Apply metadata-only fixes
 *   node scripts/content/audit-fix-loop.cjs --url https://...  # Custom URL
 *
 * What it does:
 * 1. Scans local .astro files for content issues
 * 2. Reports thin-content diagnostics with page type, owner, and missing elements
 * 3. With --apply: adds missing meta descriptions only; never body copy or FAQs
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const DEFAULT_URL = 'https://mainedispensaryguide.com';
const WORD_COUNT_THRESHOLD = 800;

function log(msg) {
  console.log(msg);
}

function runCommand(cmd, timeout = 120000) {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout, stdio: 'pipe' });
  } catch (err) {
    return err.stdout || err.message;
  }
}

function countWords(content) {
  const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.split(' ').filter(w => w.length > 0).length;
}

function getWordCount(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return countWords(content);
  } catch {
    return 0;
  }
}

function hasFrontmatter(content) {
  return content.startsWith('---');
}

function addMetaDescription(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  // Get title from frontmatter (look for title: in first 500 chars of frontmatter)
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return { success: false, reason: 'No frontmatter found' };

  const frontmatter = frontmatterMatch[1];
  const titleMatch = frontmatter.match(/^\s*title:\s*["']([^"']+)["']/m);
  if (!titleMatch) return { success: false, reason: 'No title in frontmatter' };

  const title = titleMatch[1];

  // Check if description already exists
  if (frontmatter.includes('description:')) {
    return { success: false, reason: 'Description already exists' };
  }

  // Add description after title in frontmatter
  const updated = content.replace(
    /(title:\s*["'][^"']+["'])/,
    "$1\ndescription: \"" + title.replace(/"/g, '') + " — Maine Dispensary Guide\""
  );

  fs.writeFileSync(filePath, updated);
  return { success: true, description: title };
}

function getPageType(relativePath) {
  if (relativePath.includes('/blog/')) return 'blog post';
  if (relativePath.includes('/founders/')) return 'founder story';
  if (relativePath.includes('/resources/')) return 'resource page';
  if (relativePath.includes('/guides/')) {
    if (relativePath.includes('-dispensary-guide.astro')) return 'city guide';
    if (relativePath.includes('-cannabis-guide.astro')) return 'regional guide';
    return 'technical/operator guide';
  }
  if (relativePath.includes('/download/')) return 'lead magnet landing page';
  return 'site page';
}

function getEditorialOwner(pageType) {
  switch (pageType) {
    case 'city guide':
    case 'regional guide':
      return 'regional editorial lead';
    case 'technical/operator guide':
      return 'compliance/business editor';
    case 'blog post':
      return 'blog editor';
    case 'founder story':
      return 'founder-story editor';
    case 'resource page':
      return 'resources editor';
    case 'lead magnet landing page':
      return 'conversion/editorial owner';
    default:
      return 'site editor';
  }
}

function getMissingEditorialElements(content) {
  const missing = [];
  if (!/<h1[\s>]/i.test(content)) missing.push('visible H1');
  if (!/<h2[\s>]/i.test(content)) missing.push('section H2s');
  if (!/(faq-section|<Faq|FAQPage)/i.test(content)) missing.push('reviewed FAQ section');
  if (!/(<Callout|class=["'][^"']*callout|content-verification)/i.test(content)) missing.push('editorial/source callout');
  if (!/(https?:\/\/|<a\s+[^>]*href=)/i.test(content)) missing.push('supporting citations or outbound references');
  return missing.length > 0 ? missing : ['source-backed expansion plan'];
}

function buildThinContentDiagnostic(filePath, relativePath, currentWordCount) {
  const content = fs.readFileSync(filePath, 'utf8');
  const pageType = getPageType(relativePath);
  return {
    file: relativePath,
    reason: [
      `Thin content diagnostic: ${currentWordCount} words`,
      `page type: ${pageType}`,
      `suggested editorial owner: ${getEditorialOwner(pageType)}`,
      `missing: ${getMissingEditorialElements(content).join(', ')}`
    ].join(' | ')
  };
}

function findAstroFile(relativePath, projectRoot) {
  // relativePath might be:
  // - "src/pages/guides/bangor-dispensary-guide.astro"
  // - "/guides/bangor-dispensary-guide.astro"
  // - "bangor-dispensary-guide.astro"

  // Clean the path
  let cleanPath = relativePath.replace(/^\//, '');

  // Try direct path from project root
  const directPath = path.join(projectRoot, cleanPath);
  if (fs.existsSync(directPath)) return directPath;

  // Try just the filename
  const basename = path.basename(cleanPath);
  const candidatePageDirs = [
    path.join(projectRoot, 'src', 'pages'),
    path.join(projectRoot, 'apps', 'maine-cannabis', 'src', 'pages')
  ];
  for (const pagesDir of candidatePageDirs) {
    if (fs.existsSync(path.join(pagesDir, basename))) {
      return path.join(pagesDir, basename);
    }
  }

  // Search recursively for the file
  try {
    const { globSync } = require('glob');
    const matches = globSync(`**/${basename}`, { cwd: projectRoot, absolute: true });
    return matches.length > 0 ? matches[0] : null;
  } catch {
    return null;
  }
}

function fixThinContent(filePath, relativePath, manualReview) {
  const currentWordCount = getWordCount(filePath);

  if (currentWordCount >= WORD_COUNT_THRESHOLD) {
    manualReview.push({ file: relativePath, reason: 'Word count already sufficient' });
    return;
  }

  manualReview.push(buildThinContentDiagnostic(filePath, relativePath, currentWordCount));
}

function applyAutoFixes(issues, projectRoot, shouldApply) {
  const fixes = [];
  const manualReview = [];

  // Fix thin content
  for (const item of issues.thinContent) {
    const filePath = findAstroFile(item.file, projectRoot);
    if (filePath) {
      fixThinContent(filePath, item.file, manualReview);
    } else {
      manualReview.push({ file: item.file, reason: 'File not found in project' });
    }
  }

  // Fix missing descriptions
  for (const file of issues.missingDescriptions) {
    const filePath = findAstroFile(file, projectRoot);
    if (filePath) {
      if (shouldApply) {
        const result = addMetaDescription(filePath);
        if (result.success) {
          fixes.push({ file, action: `[APPLIED] Added description: "${result.description}"` });
        } else {
          manualReview.push({ file, reason: result.reason });
        }
      } else {
        // Dry-run: extract title for report
        const content = fs.readFileSync(filePath, 'utf8');
        const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (fmMatch) {
          const titleMatch = fmMatch[1].match(/^\s*title:\s*["']([^"']+)["']/m);
          const suggestedTitle = titleMatch ? titleMatch[1] : 'unknown';
          manualReview.push({ file, reason: `[DRY-RUN] Would add description from title: "${suggestedTitle}"` });
        } else {
          manualReview.push({ file, reason: '[DRY-RUN] Would add meta description (title not found)' });
        }
      }
    }
  }

  // Fix broken links (manual only)
  for (const file of issues.brokenLinks) {
    manualReview.push({ file, reason: 'Broken internal link — requires manual path verification' });
  }

  return { fixes, manualReview };
}

function main() {
  const args = process.argv.slice(2);
  let url = DEFAULT_URL;
  let shouldApply = false;
  let allowBoilerplateRisk = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) {
      url = args[i + 1];
    }
    if (args[i] === '--apply') {
      shouldApply = true;
    }
    if (args[i] === '--allow-boilerplate-risk') {
      allowBoilerplateRisk = true;
    }
  }

  const projectRoot = path.resolve(__dirname, '..', '..');
  const pagesDir = fs.existsSync(path.join(projectRoot, 'apps', 'maine-cannabis', 'src', 'pages'))
    ? path.join(projectRoot, 'apps', 'maine-cannabis', 'src', 'pages')
    : path.join(projectRoot, 'src', 'pages');

  log('=== Audit-Fix Loop ===');
  log(`Target: ${url}`);
  if (allowBoilerplateRisk) {
    log('Warning: --allow-boilerplate-risk is deprecated/no-op; body copy and FAQs are never generated by this script.');
  }
  if (shouldApply) {
    log('Mode: APPLY (will modify files)\n');
  } else {
    log('Mode: DRY-RUN (no files will be modified)\n');
  }

  try {
    // Phase 1: Scan local files
    log('Scanning local .astro files for content issues...\n');
    const allFiles = [];

    function scanDir(dir) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.name.endsWith('.astro')) {
          allFiles.push(fullPath);
        }
      }
    }
    scanDir(pagesDir);

    const issues = { thinContent: [], missingDescriptions: [], brokenLinks: [] };

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      const relPath = path.relative(projectRoot, filePath).replace(/\\/g, '/');
      const wordCount = countWords(content);

      if (wordCount < WORD_COUNT_THRESHOLD) {
        issues.thinContent.push({ file: relPath, count: wordCount });
      }

      if (!content.includes('description:') && hasFrontmatter(content)) {
        issues.missingDescriptions.push(relPath);
      }
    }

    // Phase 2: Apply fixes (or dry-run report)
    log('AUDIT RESULTS:');
    log(`- Thin content (<${WORD_COUNT_THRESHOLD} words): ${issues.thinContent.length} page(s)`);
    log(`- Missing descriptions: ${issues.missingDescriptions.length} page(s)`);
    log(`- Broken internal links: ${issues.brokenLinks.length} (manual check needed)\n`);

    const { fixes, manualReview } = applyAutoFixes(issues, projectRoot, shouldApply);

    // Phase 3: Report
    if (shouldApply) {
      log('FIXES APPLIED:');
      const appliedFixes = [...fixes, ...manualReview.filter(m => m.reason.startsWith('[APPLIED]'))];
      if (appliedFixes.length === 0) {
        log('  (none applied)');
      } else {
        for (const item of appliedFixes) {
          log(`  ✓ ${item.file}: ${item.reason || item.action}`);
        }
      }
    } else {
      log('DRY-RUN — No files modified. To apply fixes, run with --apply\n');
    }

    log('\nITEMS REQUIRING REVIEW:');
    const reviewItems = shouldApply
      ? manualReview.filter(m => !m.reason.startsWith('[APPLIED]'))
      : manualReview;
    if (reviewItems.length === 0) {
      log('  (none)');
    } else {
      for (const item of reviewItems) {
        log(`  • ${item.file}: ${item.reason}`);
      }
    }

    log(`\nRun \`npx squirrelscan audit ${url} --format llm\` to verify.`);
    log('Run with --apply to apply metadata-only fixes. Thin-content findings require editorial review.\n');

  } catch (err) {
    log('Error during audit-fix loop:');
    log(err.message);
    process.exit(1);
  }
}

main();
