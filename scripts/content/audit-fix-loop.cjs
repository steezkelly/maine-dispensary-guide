/**
 * audit-fix-loop.cjs
 *
 * Audits content quality and optionally auto-fixes common issues.
 *
 * Usage:
 *   node scripts/audit-fix-loop.cjs                    # Dry-run: report only
 *   node scripts/audit-fix-loop.cjs --apply           # Apply fixes
 *   node scripts/audit-fix-loop.cjs --url https://...  # Custom URL
 *
 * What it does:
 * 1. Scans local .astro files for content issues
 * 2. Reports fixable issues (thin content, missing meta descriptions)
 * 3. With --apply: adds template content and meta descriptions
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const DEFAULT_URL = 'https://mainedispensaryguide.com';
const WORD_COUNT_THRESHOLD = 800;
const TEMPLATE_PARAGRAPHS = [
  '<p>This guide provides essential information for cannabis businesses operating in Maine. Understanding the regulatory landscape is critical for maintaining compliance and avoiding costly violations.</p>',
  '<p>License holders must maintain accurate records and adhere to all state and local requirements. Failure to comply can result in penalties, license suspension, or revocation.</p>',
  '<p>For the most current regulatory information, consult the Maine Office of Cannabis Policy (OCP) official resources and maintain regular communication with your compliance team.</p>'
];
const FAQ_SKELETON = `
<section class="faq-section">
  <h2>Frequently Asked Questions</h2>
  <div class="faq-item">
    <h3>What are the key compliance requirements?</h3>
    <p>Consult the Maine OCP for current requirements. Key areas include licensing, inventory tracking via METRC, advertising restrictions, and product testing requirements.</p>
  </div>
  <div class="faq-item">
    <h3>How do I renew my license?</h3>
    <p>License renewal requirements are established by the Maine Office of Cannabis Policy. Submit renewal applications before expiration and ensure all documentation is current.</p>
  </div>
  <div class="faq-item">
    <h3>What penalties apply for violations?</h3>
    <p>Penalties vary by violation type and severity. The OCP maintains a penalty schedule that includes fines, license suspension, and revocation for serious or repeated violations.</p>
  </div>
</section>
`;

function log(msg) {
  console.log(msg);
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

function addTemplateContent(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  // Find insertion point: before closing </Layout> or at end of body
  let insertPoint = content.lastIndexOf('</Layout>');
  if (insertPoint === -1) insertPoint = content.lastIndexOf('</main>');
  if (insertPoint === -1) insertPoint = content.lastIndexOf('</article>');
  if (insertPoint === -1) insertPoint = content.length - 1;

  const newContent = content.slice(0, insertPoint) + TEMPLATE_PARAGRAPHS.join('\n') + content.slice(insertPoint);
  fs.writeFileSync(filePath, newContent);

  return TEMPLATE_PARAGRAPHS.length * 50; // rough estimate
}

function addFaqSkeleton(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('faq-section') || content.includes('<Faq')) {
    return { success: false, reason: 'FAQ already present' };
  }

  // Insert before </Layout> or at end
  let insertPoint = content.lastIndexOf('</Layout>');
  if (insertPoint === -1) insertPoint = content.lastIndexOf('</main>');
  if (insertPoint === -1) insertPoint = content.lastIndexOf('</article>');
  if (insertPoint === -1) insertPoint = content.length - 1;

  const newContent = content.slice(0, insertPoint) + FAQ_SKELETON + content.slice(insertPoint);
  fs.writeFileSync(filePath, newContent);

  return { success: true, words: 180 };
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
  const basename = cleanPath.split('/').pop();
  const pagesDir = path.join(projectRoot, 'src', 'pages');
  if (fs.existsSync(path.join(pagesDir, basename))) {
    return path.join(pagesDir, basename);
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

function fixThinContent(filePath, manualReview, shouldApply) {
  const currentWordCount = getWordCount(filePath);

  if (currentWordCount >= WORD_COUNT_THRESHOLD) {
    manualReview.push({ file: path.basename(filePath), reason: 'Word count already sufficient' });
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  // Check if FAQ skeleton is better option
  if (!content.includes('faq-section') && !content.includes('<Faq')) {
    if (shouldApply) {
      const result = addFaqSkeleton(filePath);
      if (result.success) {
        manualReview.push({
          file: path.basename(filePath),
          reason: `[APPLIED] Added FAQ skeleton (${result.words} words)`
        });
        return;
      }
    } else {
      manualReview.push({
        file: path.basename(filePath),
        reason: `[DRY-RUN] Would add FAQ skeleton (~${180} words)`
      });
      return;
    }
  }

  if (shouldApply) {
    addTemplateContent(filePath);
    const newCount = getWordCount(filePath);
    const added = newCount - currentWordCount;
    manualReview.push({
      file: path.basename(filePath),
      reason: `[APPLIED] Added ${TEMPLATE_PARAGRAPHS.length} template paragraphs (${added} words)`
    });
  } else {
    manualReview.push({
      file: path.basename(filePath),
      reason: `[DRY-RUN] Would add ${TEMPLATE_PARAGRAPHS.length} template paragraphs (~${TEMPLATE_PARAGRAPHS.length * 50} words)`
    });
  }
}

function applyAutoFixes(issues, projectRoot, shouldApply) {
  const fixes = [];
  const manualReview = [];

  // Fix thin content
  for (const item of issues.thinContent) {
    const filePath = findAstroFile(item.file, projectRoot);
    if (filePath) {
      fixThinContent(filePath, manualReview, shouldApply);
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

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) {
      url = args[i + 1];
    }
    if (args[i] === '--apply') {
      shouldApply = true;
    }
  }

  const projectRoot = path.resolve(__dirname, '..');
  const pagesDir = path.join(projectRoot, 'src', 'pages');

  log('=== Audit-Fix Loop ===');
  log(`Target: ${url}`);
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
      const wordCount = getWordCount(content);

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
          log(`  ✓ ${item.file}: ${item.reason}`);
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
    log('Run with --apply to apply the suggested fixes.\n');

  } catch (err) {
    log('Error during audit-fix loop:');
    log(err.message);
    process.exit(1);
  }
}

main();
