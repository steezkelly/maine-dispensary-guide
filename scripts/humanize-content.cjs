#!/usr/bin/env node
/**
 * Content Humanizer - Batch Processor
 * Humanizes AI-generated content in Astro/HTML files
 * Removes promotional language, corporate speak, and AI patterns
 * 
 * Usage:
 *   node humanize-content.cjs <file1> <file2> ...
 *   node humanize-content.cjs "**/*.astro" --dry-run
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// AI/Promotional patterns and their human replacements
const REPLACEMENTS = [
  // Inflated significance
  { pattern: /stands as a testament to/gi, replacement: 'shows' },
  { pattern: /plays a pivotal role in/gi, replacement: 'is important to' },
  { pattern: /plays a crucial role in/gi, replacement: 'is important to' },
  { pattern: /serves as a (?:crucial|pivotal|important)/gi, replacement: 'is' },
  { pattern: /has shown (?:remarkable|significant|impressive) (?:growth|progress)/gi, replacement: 'has grown' },
  
  // Promotional adjectives
  { pattern: /\bbreathtaking\b/gi, replacement: '' },
  { pattern: /\bstunning\b/gi, replacement: '' },
  { pattern: /\bvibrant\b/gi, replacement: '' },
  { pattern: /\bnestled\b/gi, replacement: '' },
  { pattern: /\bfantastic\b/gi, replacement: 'good' },
  { pattern: /\boutstanding\b/gi, replacement: '' },
  { pattern: /\bexceptional\b/gi, replacement: 'good' },
  { pattern: /\btransformative\b/gi, replacement: '' },
  { pattern: /\bgame-changer\b/gi, replacement: '' },
  { pattern: /\bunparalleled\b/gi, replacement: '' },
  { pattern: /\bunmatched\b/gi, replacement: '' },
  { pattern: /\bworld-class\b/gi, replacement: '' },
  { pattern: /\bcutting-edge\b/gi, replacement: 'modern' },
  { pattern: /\bfirst-mover\b/gi, replacement: 'early entrant' },
  { pattern: /\bleverage\b/gi, replacement: 'use' },
  
  // Corporate speak
  { pattern: /\bsynergy\b/gi, replacement: '' },
  { pattern: /\bparadigm\b/gi, replacement: 'model' },
  { pattern: /\boptimize\b/gi, replacement: 'improve' },
  { pattern: /\bstreamline\b/gi, replacement: 'simplify' },
  { pattern: /\bholistic\b/gi, replacement: 'complete' },
  { pattern: /\butilized\b/gi, replacement: 'used' },
  { pattern: /\bempower\b/gi, replacement: 'enable' },
  { pattern: /\benhance\b/gi, replacement: 'improve' },
  { pattern: /\brevolutionize\b/gi, replacement: 'change significantly' },
  
  // AI filler phrases
  { pattern: /Additionally,/gi, replacement: '' },
  { pattern: /Furthermore,/gi, replacement: '' },
  { pattern: /Moreover,/gi, replacement: '' },
  { pattern: /It is important to note that/gi, replacement: '' },
  { pattern: /It is worth noting that/gi, replacement: '' },
  { pattern: /As previously mentioned,/gi, replacement: '' },
  { pattern: /On the other hand,/gi, replacement: '' },
  { pattern: /Taking this into consideration,/gi, replacement: '' },
  { pattern: /In light of the fact that/gi, replacement: 'because' },
  { pattern: /Due to the fact that/gi, replacement: 'because' },
  { pattern: /In order to/gi, replacement: 'to' },
  { pattern: /For the purpose of/gi, replacement: 'to' },
  { pattern: /At this point in time/gi, replacement: 'now' },
  { pattern: /In the event that/gi, replacement: 'if' },
  { pattern: /With this in mind,/gi, replacement: '' },
  { pattern: /This (?:exciting|thriving|growing) market/gi, replacement: 'This market' },
  
  // Em dash chains (multiple em dashes in sequence)
  { pattern: /—+(?:\s*—+)+/g, replacement: '—' },
  
  // Copula avoidance (serves as, boasts, features)
  { pattern: /serves as a (?:testament|proof|example)/gi, replacement: '' },
  { pattern: /\bboasts\b/gi, replacement: 'has' },
  { pattern: /\bfeatures\b/gi, replacement: 'has' },
  { pattern: /\boffers\b/gi, replacement: 'has' },
  
  // Generic positive conclusions
  { pattern: /This (?:exciting|thriving|growing) (?:market|industry|sector)/gi, replacement: 'This market' },
  { pattern: /(?:tremendous|significant|immense) potential/gi, replacement: 'potential' },
  { pattern: /(?:unprecedented|remarkable) opportunity/gi, replacement: 'opportunity' },
  
  // Collaborative artifacts (chatty AI)
  { pattern: /I hope this (?:helps|information|guide)/gi, replacement: 'This' },
  { pattern: /Of course[!,]/gi, replacement: '' },
  { pattern: /Let me know if you have any questions\./gi, replacement: '' },
  { pattern: /Feel free to (?:reach out|contact)/gi, replacement: '' },
  { pattern: /I('m| am) happy to (?:help|assist)/gi, replacement: '' },
  
  // Vague attributions
  { pattern: /experts believe/gi, replacement: '' },
  { pattern: /industry reports (?:suggest|show|indicate)/gi, replacement: '' },
  { pattern: /studies (?:have shown|suggest|indicate)/gi, replacement: '' },
  { pattern: /research (?:shows|suggests|indicates)/gi, replacement: '' },
  
  // -ing superficial analyses
  { pattern: /highlighting the importance of/gi, replacement: '' },
  { pattern: /underscoring the importance of/gi, replacement: '' },
  { pattern: /reflecting (?:the|our)/gi, replacement: '' },
  { pattern: /showcasing (?:the|our)/gi, replacement: '' },
  { pattern: /demonstrating (?:the|our)/gi, replacement: '' },
];

function humanizeText(text) {
  let result = text;
  let changes = [];
  
  for (const { pattern, replacement } of REPLACEMENTS) {
    const matches = result.match(pattern);
    if (matches) {
      const newResult = result.replace(pattern, replacement);
      if (newResult !== result) {
        changes.push({
          pattern: pattern.toString(),
          match: matches[0],
          replacement: replacement
        });
        result = newResult;
      }
    }
  }
  
  // Clean up multiple spaces
  result = result.replace(/\s{2,}/g, ' ');
  
  // Clean up leading/trailing punctuation from removed phrases
  result = result.replace(/^\s*[,;:]+\s*/g, '');
  result = result.replace(/\s*[,;:]+\s*$/g, '');
  
  // Fix "the the" issues from removals
  result = result.replace(/\bthe the\b/gi, 'the');
  
  return { text: result, changes };
}

function processFile(filePath, dryRun = false) {
  console.log(`\n📄 ${dryRun ? '[DRY RUN] ' : ''}Processing: ${path.basename(filePath)}`);
  
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error(`❌ Error reading file: ${err.message}`);
    return { success: false, file: filePath, changes: 0 };
  }
  
  const originalContent = content;
  const { text: humanizedContent, changes } = humanizeText(content);
  
  if (changes.length === 0) {
    console.log(`  ✅ No AI patterns detected`);
    return { success: true, file: filePath, changes: 0 };
  }
  
  console.log(`  🔧 Found ${changes.length} AI patterns:\n`);
  changes.forEach(({ match, replacement }, i) => {
    const displayMatch = match.length > 40 ? match.substring(0, 40) + '...' : match;
    const displayReplace = replacement.length > 30 ? replacement.substring(0, 30) + '...' : replacement;
    console.log(`    ${i + 1}. "${displayMatch}" → "${displayReplace}"`);
  });
  
  if (!dryRun) {
    fs.writeFileSync(filePath, humanizedContent);
    console.log(`\n  ✅ Humanized (${changes.length} changes made)`);
  } else {
    console.log(`\n  🔍 Dry run - no changes written`);
  }
  
  return { success: true, file: filePath, changes: changes.length };
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🤖 Content Humanizer

Humanizes AI-generated content by removing promotional language,
corporate speak, and common AI patterns.

Usage:
  node humanize-content.cjs <file1> [file2] ...   Humanize files
  node humanize-content.cjs "**/*.astro" --dry-run Dry run without changes

Examples:
  node humanize-content.cjs ./src/pages/guides/bangor-dispensary-guide.astro
  node humanize-content.cjs "./src/pages/guides/*.astro" --dry-run
  node humanize-content.cjs ./src/pages/index.astro
`);
    process.exit(0);
  }
  
  const dryRun = args.includes('--dry-run');
  const filePatterns = args.filter(arg => !arg.startsWith('--'));
  
  let files = [];
  for (const pattern of filePatterns) {
    if (pattern.includes('*')) {
      files = files.concat(glob.sync(pattern));
    } else {
      files.push(pattern);
    }
  }
  
  if (files.length === 0) {
    console.log('❌ No files found');
    process.exit(1);
  }
  
  console.log(`\n🤖 Content Humanizer`);
  console.log(`═`.repeat(50));
  console.log(`📁 Files to process: ${files.length}`);
  console.log(`🔍 Mode: ${dryRun ? 'DRY RUN (no changes written)' : 'LIVE (changes will be written)'}`);
  console.log('═'.repeat(50));
  
  const results = files.map(f => processFile(f, dryRun));
  
  // Summary
  const totalChanges = results.reduce((sum, r) => sum + r.changes, 0);
  const filesWithChanges = results.filter(r => r.changes > 0).length;
  
  console.log('\n' + '═'.repeat(50));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(50));
  console.log(`  Files processed:  ${results.length}`);
  console.log(`  Files modified:   ${filesWithChanges}`);
  console.log(`  Total changes:   ${totalChanges}`);
  
  if (dryRun && totalChanges > 0) {
    console.log('\n💡 Run without --dry-run to apply changes');
  }
}

main();
