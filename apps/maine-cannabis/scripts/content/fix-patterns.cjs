#!/usr/bin/env node
/**
 * fix-patterns.cjs
 *
 * Batch AI pattern fixer for Maine Dispensary Guide content.
 * Applies content-humanizer regex patterns programmatically across .astro files.
 *
 * Usage:
 *   node scripts/content/fix-patterns.cjs glob-pattern --dry-run
 *   node scripts/content/fix-patterns.cjs glob-pattern --apply
 *   node scripts/content/fix-patterns.cjs --list-patterns
 *   node scripts/content/fix-patterns.cjs --verify file-path
 *
 * Examples:
 *   node scripts/content/fix-patterns.cjs "src/pages/guides/*.astro" --dry-run
 *   node scripts/content/fix-patterns.cjs "src/pages/guides/*.astro" --apply
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// PATTERN LIBRARY
// ============================================================

const PATTERNS = [
  // Category 1: Inflated Significance
  { pattern: /stands as a testament to/g, replacement: 'shows', category: 'Inflated Significance' },
  { pattern: /plays a pivotal role in/g, replacement: 'is important to', category: 'Inflated Significance' },
  { pattern: /plays a crucial role in/g, replacement: 'is important to', category: 'Inflated Significance' },
  { pattern: /serves as a crucial/g, replacement: 'is', category: 'Inflated Significance' },
  { pattern: /serves as a pivotal/g, replacement: 'is', category: 'Inflated Significance' },
  { pattern: /has shown remarkable/g, replacement: 'has grown', category: 'Inflated Significance' },
  { pattern: /has shown significant/g, replacement: 'has', category: 'Inflated Significance' },

  // Category 2: Promotional Language
  { pattern: /\bbreathtaking\b/gi, replacement: '', category: 'Promotional Language' },
  { pattern: /\bstunning\b/gi, replacement: '', category: 'Promotional Language' },
  { pattern: /\bvibrant\b/gi, replacement: '', category: 'Promotional Language' },
  { pattern: /\bnestled\b/gi, replacement: '', category: 'Promotional Language' },
  { pattern: /\bfantastic\b/gi, replacement: 'good', category: 'Promotional Language' },
  { pattern: /\boutstanding\b/gi, replacement: '', category: 'Promotional Language' },
  { pattern: /\bexceptional\b/gi, replacement: 'good', category: 'Promotional Language' },
  { pattern: /\btransformative\b/gi, replacement: '', category: 'Promotional Language' },
  { pattern: /\bgame-changer\b/gi, replacement: '', category: 'Promotional Language' },
  { pattern: /\bworld-class\b/gi, replacement: '', category: 'Promotional Language' },
  { pattern: /\bcutting-edge\b/gi, replacement: 'modern', category: 'Promotional Language' },

  // Category 3: AI Filler Phrases
  { pattern: /Furthermore,/g, replacement: '', category: 'AI Filler Phrases' },
  { pattern: /Moreover,/g, replacement: '', category: 'AI Filler Phrases' },
  { pattern: /It is important to note that/g, replacement: '', category: 'AI Filler Phrases' },
  { pattern: /It is worth noting that/g, replacement: '', category: 'AI Filler Phrases' },
  { pattern: /On the other hand,/g, replacement: '', category: 'AI Filler Phrases' },
  { pattern: /Taking this into consideration,/g, replacement: '', category: 'AI Filler Phrases' },
  { pattern: /In light of the fact that/g, replacement: 'because', category: 'AI Filler Phrases' },
  { pattern: /Due to the fact that/g, replacement: 'because', category: 'AI Filler Phrases' },
  { pattern: /In order to/g, replacement: 'to', category: 'AI Filler Phrases' },
  { pattern: /For the purpose of/g, replacement: 'for', category: 'AI Filler Phrases' },
  { pattern: /At this point in time/g, replacement: 'now', category: 'AI Filler Phrases' },
  { pattern: /In the event that/g, replacement: 'if', category: 'AI Filler Phrases' },
  { pattern: /This exciting market/g, replacement: 'This market', category: 'AI Filler Phrases' },
  { pattern: /This thriving market/g, replacement: 'This market', category: 'AI Filler Phrases' },

  // Category 4: Copula Avoidance
  { pattern: /serves as a testament/g, replacement: '', category: 'Copula Avoidance' },
  { pattern: /serves as a proof/g, replacement: '', category: 'Copula Avoidance' },
  { pattern: /\bboasts\b/gi, replacement: 'has', category: 'Copula Avoidance' },
  { pattern: /\bfeatures\b/gi, replacement: 'has', category: 'Copula Avoidance' },
  { pattern: /\boffers\b/gi, replacement: 'has', category: 'Copula Avoidance' },
  { pattern: /\bserves as\b/gi, replacement: 'is', category: 'Copula Avoidance' },

  // Category 5: Corporate Speak
  { pattern: /\bsynergy\b/gi, replacement: '', category: 'Corporate Speak' },
  { pattern: /\bparadigm\b/gi, replacement: 'model', category: 'Corporate Speak' },
  { pattern: /\bleverage\b/gi, replacement: 'use', category: 'Corporate Speak' },
  { pattern: /\boptimize\b/gi, replacement: 'improve', category: 'Corporate Speak' },
  { pattern: /\bstreamline\b/gi, replacement: 'simplify', category: 'Corporate Speak' },
  { pattern: /\bholistic\b/gi, replacement: 'complete', category: 'Corporate Speak' },
  { pattern: /\butilized\b/gi, replacement: 'used', category: 'Corporate Speak' },
  { pattern: /\bempower\b/gi, replacement: 'enable', category: 'Corporate Speak' },

  // Category 6: Collaborative Artifacts
  { pattern: /I hope this helps/g, replacement: '', category: 'Collaborative Artifacts' },
  { pattern: /Of course!/g, replacement: '', category: 'Collaborative Artifacts' },
  { pattern: /Let me know if you have any questions/g, replacement: '', category: 'Collaborative Artifacts' },
  { pattern: /Feel free to reach out/g, replacement: '', category: 'Collaborative Artifacts' },
  { pattern: /I'm happy to help/g, replacement: '', category: 'Collaborative Artifacts' },

  // Category 7: Vague Attributions
  { pattern: /experts believe/g, replacement: '', category: 'Vague Attributions' },
  { pattern: /industry reports suggest/g, replacement: '', category: 'Vague Attributions' },
  { pattern: /studies have shown/g, replacement: '', category: 'Vague Attributions' },
  { pattern: /research shows/g, replacement: '', category: 'Vague Attributions' },
];

// ============================================================
// POST-PROCESSING FUNCTIONS
// ============================================================

function postProcess(content) {
  let result = content;

  // Collapse multiple spaces to single space
  result = result.replace(/\s{2,}/g, ' ');

  // Fix double punctuation
  result = result.replace(/\.\./g, '.');
  result = result.replace(/, \./g, '.');

  // Clean up orphaned punctuation from removals
  result = result.replace(/,\s*,/g, ',');
  result = result.replace(/\s+\./g, '.');
  result = result.replace(/\s+,/g, ',');

  // Remove leading/trailing empty parentheses
  result = result.replace(/\(\s*\)/g, '');

  // Clean up orphaned quotes
  result = result.replace(/\s+"/g, '"');
  result = result.replace(/"\s+/g, '"');

  // Fix space before punctuation
  result = result.replace(/\s+\./g, '.');
  result = result.replace(/\s+,/g, ',');

  return result;
}

// ============================================================
// PATTERN APPLICATION
// ============================================================

function applyPatterns(content) {
  let totalChanges = 0;
  let changedContent = content;

  for (const { pattern, replacement } of PATTERNS) {
    const matches = changedContent.match(pattern);
    if (matches) {
      totalChanges += matches.length;
      changedContent = changedContent.replace(pattern, replacement);
    }
  }

  changedContent = postProcess(changedContent);

  return { content: changedContent, changes: totalChanges };
}

// ============================================================
// FILE FINDING
// ============================================================

function findAstroFiles(pattern, baseDir) {
  const { globSync } = require('glob');
  try {
    const files = globSync(pattern, {
      cwd: baseDir,
      absolute: true,
      ignore: ['**/node_modules/**']
    });
    return files.filter(f => f.endsWith('.astro'));
  } catch (err) {
    console.error(`Error finding files with pattern "${pattern}": ${err.message}`);
    return [];
  }
}

function verifySingleFile(filePath) {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    return { found: false };
  }

  const content = fs.readFileSync(absolutePath, 'utf8');
  const { changes } = applyPatterns(content);

  if (changes === 0) {
    console.log(`\n✅ No AI patterns found in: ${filePath}`);
  } else {
    console.log(`\n⚠️  Found ${changes} pattern(s) in: ${filePath}`);
  }

  return { found: true, changes };
}

// ============================================================
// CLI INTERFACE
// ============================================================

function listPatterns() {
  console.log('\n=== AI Pattern Library ===\n');

  const categories = [...new Set(PATTERNS.map(p => p.category))];

  for (const category of categories) {
    console.log(`\n## ${category}`);
    const categoryPatterns = PATTERNS.filter(p => p.category === category);
    for (const { pattern, replacement } of categoryPatterns) {
      const displayPattern = pattern.source.replace(/\\b/g, '').replace(/\//g, '');
      const displayReplacement = replacement === '' ? '(remove)' : replacement;
      console.log(`  "${displayPattern}" → "${displayReplacement}"`);
    }
  }

  console.log(`\nTotal: ${PATTERNS.length} patterns across ${categories.length} categories\n`);
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
fix-patterns.cjs — Batch AI Pattern Fixer for Maine Dispensary Guide

Usage:
  node scripts/content/fix-patterns.cjs "**/*.astro" --dry-run     # Preview changes
  node scripts/content/fix-patterns.cjs "**/*.astro" --apply        # Apply fixes
  node scripts/content/fix-patterns.cjs "./src/pages/guides/*.astro" --apply  # Specific files
  node scripts/content/fix-patterns.cjs --list-patterns             # Show all patterns
  node scripts/content/fix-patterns.cjs --verify "./src/pages/guides/faq.astro"  # Single file check
`);
    process.exit(0);
  }

  // Handle --list-patterns
  if (args.includes('--list-patterns')) {
    listPatterns();
    process.exit(0);
  }

  // Handle --verify (single file check)
  const verifyIndex = args.indexOf('--verify');
  if (verifyIndex !== -1 && args[verifyIndex + 1]) {
    const filePath = args[verifyIndex + 1];
    const result = verifySingleFile(filePath);
    process.exit(result.found ? 0 : 1);
  }

  // Determine mode
  const isDryRun = !args.includes('--apply');

  // Find the glob pattern (first non-flag argument)
  let globPattern = null;
  for (const arg of args) {
    if (!arg.startsWith('--') && arg.includes('*')) {
      globPattern = arg;
      break;
    }
  }

  if (!globPattern) {
    console.error('Error: No glob pattern provided. Example: "**/*.astro"');
    process.exit(1);
  }

  // Determine base directory
  const scriptDir = __dirname;
  const projectRoot = path.resolve(scriptDir, '..', '..');

  // Find files
  const files = findAstroFiles(globPattern, projectRoot);

  if (files.length === 0) {
    console.error(`No .astro files found matching: ${globPattern}`);
    process.exit(1);
  }

  console.log(`\nProcessing: ${files.length} file(s)`);
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (no files will be modified)' : 'APPLY (will modify files)'}\n`);

  let totalChanges = 0;
  const fileResults = [];

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const { content: newContent, changes } = applyPatterns(content);

    const relativePath = path.relative(projectRoot, filePath).replace(/\\/g, '/');

    if (changes > 0) {
      fileResults.push({ path: relativePath, changes });
      totalChanges += changes;

      if (isDryRun) {
        console.log(`  📄 ${relativePath} — ${changes} change(s)`);
      } else {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`  📄 ${relativePath} — ${changes} change(s) [APPLIED]`);
      }
    }
  }

  // Summary
  console.log('');
  if (isDryRun) {
    if (totalChanges === 0) {
      console.log('✅ No AI patterns found across any files.');
    } else {
      console.log(`✅ Humanized: ${totalChanges} change(s) across ${fileResults.length} file(s) (dry-run mode)`);
      console.log('   Run with --apply to apply fixes');
    }
  } else {
    if (totalChanges === 0) {
      console.log('✅ No changes needed across any files.');
    } else {
      console.log(`✅ Applied: ${totalChanges} change(s) across ${fileResults.length} file(s)`);
    }
  }
  console.log('');

  process.exit(0);
}

main();
